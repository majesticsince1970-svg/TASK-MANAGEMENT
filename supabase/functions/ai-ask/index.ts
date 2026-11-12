// Edge Function: ai-ask
// Ask AI endpoint — receives a question and user context,
// calls Gemini with function-calling tools, returns { answer, sources }.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { logAIUsage } from '../_shared/ai/provider.ts';
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are Majestic AI, an intelligent assistant for Majestic Jewellers' operations management system.
You help managers and staff answer questions about tasks, workload, deadlines, and team performance.
Be concise, professional, and action-oriented. Answer in the same language the user asks in (English or Malayalam).
When you use a tool, cite which data source you used in your response.`;

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'get_tasks',
        description: 'Get tasks filtered by status, owner, department, or date range',
        parameters: {
          type: 'OBJECT',
          properties: {
            status: { type: 'STRING', description: 'Task status filter (new, in_progress, done, etc.)' },
            owner_id: { type: 'STRING', description: 'UUID of the task owner' },
            department_id: { type: 'STRING', description: 'UUID of the department' },
            due_before: { type: 'STRING', description: 'ISO date — tasks due before this date' },
            due_after: { type: 'STRING', description: 'ISO date — tasks due after this date' },
            limit: { type: 'INTEGER', description: 'Max results (default 20)' },
          },
        },
      },
      {
        name: 'get_stats',
        description: 'Get dashboard statistics: task counts by status, overdue count, completion rate',
        parameters: {
          type: 'OBJECT',
          properties: {
            department_id: { type: 'STRING', description: 'Optional department UUID to scope stats' },
            period_days: { type: 'INTEGER', description: 'Look-back period in days (default 7)' },
          },
        },
      },
      {
        name: 'get_person',
        description: 'Get profile and workload info for a person by name or ID',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Person name to search' },
            user_id: { type: 'STRING', description: 'UUID of the person' },
          },
        },
      },
      {
        name: 'get_overdue_tasks',
        description: 'Get all tasks that are overdue — not done/cancelled and past their due date',
        parameters: {
          type: 'OBJECT',
          properties: {
            department_id: { type: 'STRING', description: 'Optional department UUID to filter' },
            owner_id: { type: 'STRING', description: 'Optional owner UUID to filter' },
            limit: { type: 'INTEGER', description: 'Max results (default 20)' },
          },
        },
      },
      {
        name: 'get_department_summary',
        description: 'Get a summary of task counts by status for a specific department',
        parameters: {
          type: 'OBJECT',
          properties: {
            department_id: { type: 'STRING', description: 'UUID of the department (required)' },
          },
          required: ['department_id'],
        },
      },
      {
        name: 'get_workload',
        description: 'Get active task counts and overdue counts per user. If user_id is provided, returns only that user; otherwise returns all users.',
        parameters: {
          type: 'OBJECT',
          properties: {
            user_id: { type: 'STRING', description: 'Optional UUID of a specific user' },
          },
        },
      },
      {
        name: 'get_eod_status',
        description: 'Get end-of-day status for today (IST): tasks completed today, still pending, and overdue',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'get_pending_approvals',
        description: 'Get tasks in submitted status that are waiting for approval',
        parameters: {
          type: 'OBJECT',
          properties: {
            approver_id: { type: 'STRING', description: 'Optional UUID of the approver to filter by' },
          },
        },
      },
      {
        name: 'search_tasks',
        description: 'Search tasks by keyword in title or description. Optionally filter by status and/or department.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Search keyword (matched against title and description)' },
            status: { type: 'STRING', description: 'Optional status filter' },
            department_id: { type: 'STRING', description: 'Optional department UUID filter' },
          },
          required: ['query'],
        },
      },
      {
        name: 'draft_task',
        description: 'Create a draft task that the owner can review before activation. Use this when the user asks to create or add a task.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Task title' },
            description: { type: 'STRING', description: 'Task description' },
            timing_type: { type: 'STRING', description: 'Timing type: daily, weekly, monthly, or one_time' },
            department_id: { type: 'STRING', description: 'Optional department UUID' },
            owner_id: { type: 'STRING', description: 'Optional owner UUID' },
          },
          required: ['title', 'description', 'timing_type'],
        },
      },
    ],
  },
];

/** Execute a tool call against the database */
async function executeTool(
  supabase: any,
  name: string,
  args: Record<string, any>,
): Promise<{ result: any; source: string }> {
  switch (name) {
    case 'get_tasks': {
      let query = supabase
        .from('tasks')
        .select('id, title, status, owner_id, department_id, due_at, timing_type, importance, created_at')
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(args.limit || 20);

      if (args.status) query = query.eq('status', args.status);
      if (args.owner_id) query = query.eq('owner_id', args.owner_id);
      if (args.department_id) query = query.eq('department_id', args.department_id);
      if (args.due_before) query = query.lte('due_at', args.due_before);
      if (args.due_after) query = query.gte('due_at', args.due_after);

      const { data, error } = await query;
      if (error) throw error;
      return { result: data, source: 'tasks table' };
    }

    case 'get_stats': {
      const periodDays = args.period_days || 7;
      const since = new Date(Date.now() - periodDays * 86400000).toISOString();

      let baseQuery = supabase.from('tasks').select('status', { count: 'exact' });
      if (args.department_id) baseQuery = baseQuery.eq('department_id', args.department_id);

      // Active tasks by status
      const statuses = ['new', 'seen', 'in_progress', 'blocked', 'submitted', 'done'];
      const counts: Record<string, number> = {};
      for (const s of statuses) {
        let q = supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', s);
        if (args.department_id) q = q.eq('department_id', args.department_id);
        const { count } = await q;
        counts[s] = count || 0;
      }

      // Overdue
      let overdueQ = supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', ['new', 'seen', 'in_progress'])
        .lt('due_at', new Date().toISOString());
      if (args.department_id) overdueQ = overdueQ.eq('department_id', args.department_id);
      const { count: overdue } = await overdueQ;

      // Completed in period
      let doneQ = supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'done')
        .gte('completed_at', since);
      if (args.department_id) doneQ = doneQ.eq('department_id', args.department_id);
      const { count: completed } = await doneQ;

      return {
        result: { counts, overdue: overdue || 0, completed_in_period: completed || 0, period_days: periodDays },
        source: 'dashboard stats',
      };
    }

    case 'get_person': {
      let query = supabase
        .from('profiles')
        .select('id, full_name, role, department_id, phone, points, is_active, availability');

      if (args.user_id) {
        query = query.eq('id', args.user_id);
      } else if (args.name) {
        query = query.ilike('full_name', `%${args.name}%`);
      }

      const { data: profiles, error } = await query.limit(5);
      if (error) throw error;

      // Get workload for matched profiles
      const result = [];
      for (const p of profiles || []) {
        const { count } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', p.id)
          .in('status', ['new', 'seen', 'in_progress', 'blocked']);
        result.push({ ...p, active_tasks: count || 0 });
      }

      return { result, source: 'profiles table' };
    }

    case 'get_overdue_tasks': {
      let query = supabase
        .from('tasks')
        .select('id, title, status, owner_id, department_id, due_at, timing_type, importance')
        .not('status', 'in', '("done","cancelled")')
        .lt('due_at', new Date().toISOString())
        .order('due_at', { ascending: true })
        .limit(args.limit || 20);

      if (args.department_id) query = query.eq('department_id', args.department_id);
      if (args.owner_id) query = query.eq('owner_id', args.owner_id);

      const { data, error } = await query;
      if (error) throw error;
      return { result: data || [], source: 'tasks (overdue)' };
    }

    case 'get_department_summary': {
      const statuses = ['new', 'seen', 'in_progress', 'blocked', 'submitted', 'done'];
      const by_status: Record<string, number> = {};
      let total = 0;

      for (const s of statuses) {
        const { count } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('department_id', args.department_id)
          .eq('status', s);
        by_status[s] = count || 0;
        total += count || 0;
      }

      const { data: dept } = await supabase
        .from('departments')
        .select('name, name_ml')
        .eq('id', args.department_id)
        .single();

      return {
        result: { department_name: dept?.name || args.department_id, total, by_status },
        source: 'department summary',
      };
    }

    case 'get_workload': {
      let profilesQuery = supabase.from('profiles').select('id, full_name, role');
      if (args.user_id) profilesQuery = profilesQuery.eq('id', args.user_id);
      const { data: profiles, error } = await profilesQuery;
      if (error) throw error;

      const results = [];
      const now = new Date().toISOString();
      for (const p of profiles || []) {
        const { count: active } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', p.id)
          .in('status', ['new', 'seen', 'in_progress', 'blocked', 'submitted']);

        const { count: overdue } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', p.id)
          .in('status', ['new', 'seen', 'in_progress', 'blocked'])
          .lt('due_at', now);

        results.push({
          user_id: p.id,
          full_name: p.full_name,
          active_task_count: active || 0,
          overdue_count: overdue || 0,
        });
      }

      return { result: results, source: 'workload query' };
    }

    case 'get_eod_status': {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: completedToday } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'done')
        .gte('completed_at', todayStart.toISOString());

      const { count: pending } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', ['new', 'seen', 'in_progress', 'submitted', 'blocked']);

      const { count: overdue } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', ['new', 'seen', 'in_progress', 'blocked'])
        .lt('due_at', new Date().toISOString());

      return {
        result: {
          date: new Date().toISOString().split('T')[0],
          completed_today: completedToday || 0,
          pending: pending || 0,
          overdue: overdue || 0,
        },
        source: 'eod status',
      };
    }

    case 'get_pending_approvals': {
      let query = supabase
        .from('tasks')
        .select('id, title, owner_id, submitted_at, department_id, timing_type')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true });

      if (args.approver_id) query = query.eq('approver_id', args.approver_id);

      const { data, error } = await query;
      if (error) throw error;
      return { result: data || [], source: 'pending approvals' };
    }

    case 'search_tasks': {
      let query = supabase
        .from('tasks')
        .select('id, title, status, owner_id, department_id, timing_type, due_at')
        .or(`title.ilike.%${args.query}%,description.ilike.%${args.query}%`)
        .limit(10);

      if (args.status) query = query.eq('status', args.status);
      if (args.department_id) query = query.eq('department_id', args.department_id);

      const { data, error } = await query;
      if (error) throw error;
      return { result: data || [], source: 'task search' };
    }

    case 'draft_task': {
      const { data, error } = await supabase.rpc('create_task', {
        payload: {
          title: args.title,
          description: args.description,
          timing_type: args.timing_type,
          department_id: args.department_id || null,
          owner_id: args.owner_id || null,
          is_draft: true,
          source: 'ai',
        },
      });

      if (error) throw error;
      return { result: data, source: 'create_task RPC (draft)' };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` }, source: 'error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { question, user_id } = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = getServiceClient();

    // Fetch user context
    const { data: user } = await supabase
      .from('profiles')
      .select('full_name, role, department_id, language')
      .eq('id', user_id)
      .single();

    const userContext = user
      ? `User: ${user.full_name} (${user.role}, dept: ${user.department_id}, lang: ${user.language})`
      : '';

    // Initial Gemini call with tools
    const contents = [
      {
        role: 'user',
        parts: [{ text: `${userContext}\n\nQuestion: ${question}` }],
      },
    ];

    let body: Record<string, any> = {
      contents,
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      tools: TOOLS,
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    };

    const sources: string[] = [];
    let finalText = '';
    let totalUsage = { inputTokens: 0, outputTokens: 0 };

    // Function-calling loop (max 5 iterations)
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini error: ${res.status} ${err}`);
      }

      const data = await res.json();
      const usage = data.usageMetadata || {};
      totalUsage.inputTokens += usage.promptTokenCount || 0;
      totalUsage.outputTokens += usage.candidatesTokenCount || 0;

      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Check for function calls
      const fnCalls = parts.filter((p: any) => p.functionCall);
      if (fnCalls.length === 0) {
        // Final text response
        finalText = parts.map((p: any) => p.text).filter(Boolean).join('\n');
        break;
      }

      // Execute tool calls
      contents.push({ role: 'model', parts });

      const fnResponses: any[] = [];
      for (const part of fnCalls) {
        const { name, args } = part.functionCall;
        const { result, source } = await executeTool(supabase, name, args || {});
        sources.push(source);
        fnResponses.push({
          functionResponse: { name, response: { result } },
        });
      }

      contents.push({ role: 'user', parts: fnResponses });
      body = { ...body, contents };
    }

    const latencyMs = Date.now() - startTime;

    // Log usage
    await logAIUsage(supabase, 'ai-ask', totalUsage, latencyMs, user_id);

    return new Response(
      JSON.stringify({ answer: finalText, sources: [...new Set(sources)] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('ai-ask error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
