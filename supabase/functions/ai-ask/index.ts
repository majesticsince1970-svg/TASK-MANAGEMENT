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

const SYSTEM_PROMPT = `You are the executive AI Operations Manager for Majestic Jewellers, a luxury jewellery brand in Kerala, India.
You take full ownership and responsibility for shop operations, task assignment, employee tracking, and reporting.

YOUR RESPONSIBILITIES:
1. TASK SCHEDULING & ASSIGNMENT:
   - When the user asks to schedule, create, or assign a task to someone (e.g. "Assign the gold verification task to Rashid for 4 PM today" or in Malayalam "ഇന്നത്തെ പെയ്മെന്റ് ലിസ്റ്റ് അക്കൗണ്ടന്റിന് അപ്ഡേറ്റ് ചെയ്യാൻ പറയൂ"), you MUST execute it using the appropriate tool.
   - Look up the person using 'get_person' or 'get_team' if needed to find their UUID and department.
   - Use 'schedule_task' to immediately assign it directly, or 'draft_task' if requested as draft.
   - Calculate due dates correctly in IST (Asia/Kolkata).

2. GENERATING COMPREHENSIVE REPORTS:
   - When asked for ANY report (e.g. daily operations, employee performance, sales/stock audits, department summaries, EOD reports, leaderboard), generate a thorough, executive-level report.
   - Use 'generate_report', 'get_stats', 'get_department_summary', 'get_workload', and 'get_overdue_tasks' to pull real facts.
   - Format reports with clear sections: Executive Summary, Key Metrics, Department Breakdown, Risks/Overdue Items, and Action Items.

3. PROACTIVE MANAGEMENT & PROBLEM SOLVING:
   - If something is overdue or someone is overloaded, proactively warn the owner and propose specific solutions.
   - Always confirm exactly what action was taken (task title, assignee name, due date, department).

LANGUAGE & TONE:
- Fluent in both Malayalam (മലയാളം) and English.
- Always respond in the EXACT language used by the user. If they speak or write in Malayalam, respond in natural, professional Malayalam. If English, respond in professional English.
- Professional, confident, authoritative yet respectful tone of a trusted executive general manager.`;

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
        description: 'Create a draft task that the owner can review before activation. Use this when the user asks to draft a task.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Task title' },
            description: { type: 'STRING', description: 'Task description' },
            timing_type: { type: 'STRING', description: 'Timing type: urgent, dated, long, flexible, repeating' },
            department_id: { type: 'STRING', description: 'Optional department UUID' },
            owner_id: { type: 'STRING', description: 'Optional owner UUID' },
          },
          required: ['title'],
        },
      },
      {
        name: 'schedule_task',
        description: 'Directly schedule and assign a live, active task to a specific person or department. Use this whenever the user asks to schedule, assign, give, or create an immediate task for someone.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Task title' },
            description: { type: 'STRING', description: 'Task description or instructions' },
            assignee_name_or_id: { type: 'STRING', description: 'Name, job role, or UUID of person to assign (e.g. Rashid, James, Accountant, Creative)' },
            timing_type: { type: 'STRING', description: 'Timing type: urgent, dated, long, or flexible (default: dated)' },
            due_at: { type: 'STRING', description: 'ISO timestamptz when due (defaults to end of business day or 2h from now if urgent)' },
            importance: { type: 'STRING', description: 'Importance: normal or important' },
            department_name_or_id: { type: 'STRING', description: 'Optional department name or UUID' },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_team',
        description: 'Get the full list of staff, roles, departments, points, and contact info to identify whom to assign tasks to.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'generate_report',
        description: 'Generate real-time executive report data on team performance, task completion rates, departmental efficiency, or leaderboard.',
        parameters: {
          type: 'OBJECT',
          properties: {
            report_type: { type: 'STRING', description: 'Type: overview, department, employee_performance, eod, overdue_audit, or leaderboard' },
            department_id: { type: 'STRING', description: 'Optional department UUID' },
            period_days: { type: 'INTEGER', description: 'Lookback days (default 7)' },
          },
          required: ['report_type'],
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
          description: args.description || '',
          timing_type: args.timing_type || 'dated',
          department_id: args.department_id || null,
          owner_id: args.owner_id || null,
          is_draft: true,
          source: 'ai',
        },
      });

      if (error) throw error;
      return { result: data, source: 'create_task RPC (draft)' };
    }

    case 'schedule_task': {
      let resolvedOwnerId = null;
      let resolvedDeptId = null;

      // Find person if specified
      if (args.assignee_name_or_id) {
        const val = String(args.assignee_name_or_id).toLowerCase().trim();
        const { data: people } = await supabase.from('profiles').select('id, full_name, role, job_title, department_id');
        const matched = people?.find((p: any) =>
          p.id === args.assignee_name_or_id ||
          p.full_name.toLowerCase().includes(val) ||
          (p.job_title && p.job_title.toLowerCase().includes(val)) ||
          (p.role && p.role.toLowerCase().includes(val))
        );
        if (matched) {
          resolvedOwnerId = matched.id;
          resolvedDeptId = matched.department_id;
        }
      }

      // Find department if specified
      if (args.department_name_or_id && !resolvedDeptId) {
        const val = String(args.department_name_or_id).toLowerCase().trim();
        const { data: depts } = await supabase.from('departments').select('id, name');
        const matchDept = depts?.find((d: any) =>
          d.id === args.department_name_or_id ||
          d.name.toLowerCase().includes(val)
        );
        if (matchDept) resolvedDeptId = matchDept.id;
      }

      const timing = args.timing_type || 'dated';
      let dueAt = args.due_at;
      if (!dueAt && timing !== 'flexible') {
        const d = new Date();
        if (timing === 'urgent') {
          d.setHours(d.getHours() + 2);
        } else {
          d.setDate(d.getDate() + 1);
          d.setHours(18, 0, 0, 0);
        }
        dueAt = d.toISOString();
      }

      const { data, error } = await supabase.rpc('create_task', {
        payload: {
          title: args.title,
          description: args.description || '',
          timing_type: timing,
          importance: args.importance || 'normal',
          department_id: resolvedDeptId,
          owner_id: resolvedOwnerId,
          due_at: dueAt,
          is_draft: false,
          source: 'ai_manager',
        },
      });

      if (error) throw error;
      return {
        result: {
          success: true,
          task_id: data?.task_id || data?.id,
          assigned_to: resolvedOwnerId,
          due_at: dueAt,
          status: 'new',
        },
        source: 'schedule_task RPC',
      };
    }

    case 'get_team': {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, job_title, department_id, points, availability, phone')
        .order('full_name');
      if (error) throw error;

      const { data: depts } = await supabase.from('departments').select('id, name');
      const deptMap = Object.fromEntries((depts || []).map((d: any) => [d.id, d.name]));

      const team = (profiles || []).map((p: any) => ({
        ...p,
        department_name: deptMap[p.department_id] || 'Unassigned',
      }));

      return { result: team, source: 'profiles & departments' };
    }

    case 'generate_report': {
      const now = new Date();
      const periodDays = args.period_days || 7;
      const sinceDate = new Date(now.getTime() - periodDays * 86400000).toISOString();

      let taskQuery = supabase.from('tasks').select('*');
      if (args.department_id) taskQuery = taskQuery.eq('department_id', args.department_id);
      const { data: tasks, error: tErr } = await taskQuery;
      if (tErr) throw tErr;

      const { data: profiles } = await supabase.from('profiles').select('id, full_name, role, points, availability');
      const { data: depts } = await supabase.from('departments').select('id, name');

      const all = tasks || [];
      const total = all.length;
      const completed = all.filter((t: any) => t.status === 'done').length;
      const inProgress = all.filter((t: any) => t.status === 'in_progress').length;
      const submitted = all.filter((t: any) => t.status === 'submitted').length;
      const overdue = all.filter((t: any) => t.due_at && new Date(t.due_at) < now && !['done', 'cancelled'].includes(t.status)).length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Department breakdown
      const deptBreakdown: Record<string, any> = {};
      for (const d of depts || []) {
        const dTasks = all.filter((t: any) => t.department_id === d.id);
        const dDone = dTasks.filter((t: any) => t.status === 'done').length;
        deptBreakdown[d.name] = {
          total: dTasks.length,
          completed: dDone,
          rate: dTasks.length > 0 ? Math.round((dDone / dTasks.length) * 100) : 0,
        };
      }

      // Leaderboard
      const leaderboard = (profiles || [])
        .sort((a: any, b: any) => (b.points || 0) - (a.points || 0))
        .slice(0, 5)
        .map((p: any) => ({ name: p.full_name, role: p.role, points: p.points }));

      return {
        result: {
          report_type: args.report_type,
          generated_at: now.toISOString(),
          period_days: periodDays,
          metrics: {
            total_tasks: total,
            completed_tasks: completed,
            in_progress: inProgress,
            awaiting_review: submitted,
            overdue_tasks: overdue,
            completion_rate_percent: completionRate,
          },
          department_breakdown: deptBreakdown,
          leaderboard_top_5: leaderboard,
        },
        source: 'executive analytics engine',
      };
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
