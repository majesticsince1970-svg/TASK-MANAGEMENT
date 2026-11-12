// Edge Function: ai-suggest-date
// Deadline intelligence — suggests a due date based on historical data.
// POST { task_title, timing_type, department_id }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { generateContent, logAIUsage } from '../_shared/ai/provider.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `You are a deadline estimation assistant for Majestic Jewellers.
Given a task title, timing type, department, and historical completion data,
suggest a realistic due date and provide brief reasoning.

Respond ONLY with JSON:
{
  "suggested_date": "YYYY-MM-DDTHH:mm:ss",
  "reasoning": "Brief explanation of why this date was chosen"
}

Consider:
- Average completion time for similar tasks in the department
- Current workload (number of active tasks)
- Business hours (9 AM - 9 PM IST, Mon-Sat)
- Buffer time for important tasks
- Urgent tasks should be within hours, dated tasks within days`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { task_title, timing_type, department_id } = await req.json();

    if (!task_title || !timing_type) {
      return new Response(
        JSON.stringify({ error: 'task_title and timing_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = getServiceClient();

    // Fetch historical completion times for similar tasks in department
    let historicalQuery = supabase
      .from('tasks')
      .select('title, timing_type, actual_minutes, started_at, completed_at, importance')
      .eq('status', 'done')
      .not('completed_at', 'is', null)
      .not('started_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50);

    if (department_id) {
      historicalQuery = historicalQuery.eq('department_id', department_id);
    }
    if (timing_type) {
      historicalQuery = historicalQuery.eq('timing_type', timing_type);
    }

    const { data: historicalTasks } = await historicalQuery;

    // Calculate average completion time
    const completionTimes = (historicalTasks || [])
      .map((t: any) => {
        if (t.actual_minutes > 0) return t.actual_minutes;
        if (t.started_at && t.completed_at) {
          return (new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 60000;
        }
        return null;
      })
      .filter((m: number | null): m is number => m !== null && m > 0);

    const avgMinutes = completionTimes.length > 0
      ? completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length
      : null;

    // Current department workload
    let workloadQuery = supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .in('status', ['new', 'seen', 'in_progress']);
    if (department_id) workloadQuery = workloadQuery.eq('department_id', department_id);
    const { count: activeTaskCount } = await workloadQuery;

    // Department name
    let deptName = 'Unknown';
    if (department_id) {
      const { data: dept } = await supabase
        .from('departments')
        .select('name')
        .eq('id', department_id)
        .single();
      if (dept) deptName = dept.name;
    }

    const context = JSON.stringify({
      task_title,
      timing_type,
      department: deptName,
      department_id,
      current_time: new Date().toISOString(),
      historical_avg_minutes: avgMinutes ? Math.round(avgMinutes) : null,
      historical_sample_size: completionTimes.length,
      active_tasks_in_dept: activeTaskCount || 0,
      similar_task_titles: (historicalTasks || []).slice(0, 10).map((t: any) => t.title),
    });

    const aiResult = await generateContent(
      [{ role: 'user', parts: [{ text: `Suggest a deadline for this task:\n\n${context}` }] }],
      SYSTEM_PROMPT,
    );

    const latencyMs = Date.now() - startTime;

    // Parse response
    let suggestion;
    try {
      const cleaned = aiResult.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      suggestion = JSON.parse(cleaned);
    } catch {
      suggestion = {
        suggested_date: null,
        reasoning: aiResult.text,
      };
    }

    // Log usage
    await logAIUsage(supabase, 'ai-suggest-date', aiResult.usage, latencyMs);

    return new Response(
      JSON.stringify({
        suggested_date: suggestion.suggested_date,
        reasoning: suggestion.reasoning,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('ai-suggest-date error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
