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
