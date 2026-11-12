// Edge Function: ai-analyze
// Layer 2 AI analysis — runs every 45 min via pg_cron.
// Fetches recent task events, calls Gemini to detect patterns,
// and inserts ai_alerts for: overdue, workload imbalance, blocked, missed routines.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { generateContent, logAIUsage } from '../_shared/ai/provider.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `You are an AI operations analyst for Majestic Jewellers task management system.
Analyze the provided task events and current state data. Identify actionable alerts in these categories:
1. OVERDUE — tasks past their due date
2. WORKLOAD_IMBALANCE — team members with significantly more active tasks than others
3. BLOCKED — tasks stuck in blocked status without resolution
4. MISSED_ROUTINE — routine tasks that were not generated or completed today

For each alert, respond with a JSON array of objects:
{
  "level": "critical" | "important" | "insight",
  "title": "short summary",
  "explanation": "detailed explanation",
  "suggested_action": "what should be done",
  "department_id": "uuid or null",
  "suggested_assignee_id": "uuid or null",
  "rule_key": "category_identifier"
}

Respond ONLY with the JSON array, no markdown or extra text. If no alerts, return [].`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = getServiceClient();
    const cutoff = new Date(Date.now() - 45 * 60 * 1000).toISOString();

    // Fetch recent task events
    const { data: events } = await supabase
      .from('task_events')
      .select('id, task_id, actor_id, type, from_status, to_status, note, at')
      .gte('at', cutoff)
      .order('at', { ascending: false })
      .limit(200);

    // Fetch overdue tasks
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('id, title, owner_id, department_id, timing_type, due_at, status')
      .in('status', ['new', 'seen', 'in_progress', 'blocked'])
      .not('due_at', 'is', null)
      .lt('due_at', new Date().toISOString());

    // Fetch blocked tasks
    const { data: blockedTasks } = await supabase
      .from('tasks')
      .select('id, title, owner_id, department_id, updated_at')
      .eq('status', 'blocked');

    // Fetch workload per person
    const { data: workloads } = await supabase
      .from('tasks')
      .select('owner_id')
      .in('status', ['new', 'seen', 'in_progress']);

    // Aggregate workload
    const workloadMap: Record<string, number> = {};
    for (const t of workloads || []) {
      if (t.owner_id) {
        workloadMap[t.owner_id] = (workloadMap[t.owner_id] || 0) + 1;
      }
    }

    // Fetch today's routine compliance
    const today = new Date().toISOString().split('T')[0];
    const { data: routines } = await supabase
      .from('routines')
      .select('id, title, department_id')
      .eq('is_active', true);

    const { data: routineTasks } = await supabase
      .from('tasks')
      .select('routine_id')
      .eq('routine_instance_date', today)
      .not('routine_id', 'is', null);

    const generatedRoutineIds = new Set((routineTasks || []).map((t: any) => t.routine_id));
    const missedRoutines = (routines || []).filter((r: any) => !generatedRoutineIds.has(r.id));

    // Build context for Gemini
    const context = JSON.stringify({
      recent_events: events || [],
      overdue_tasks: overdueTasks || [],
      blocked_tasks: blockedTasks || [],
      workload_per_person: workloadMap,
      missed_routines: missedRoutines,
      analysis_window_minutes: 45,
      current_time: new Date().toISOString(),
    });

    const aiResult = await generateContent(
      [{ role: 'user', parts: [{ text: `Analyze this operational data and generate alerts:\n\n${context}` }] }],
      SYSTEM_PROMPT,
    );

    const latencyMs = Date.now() - startTime;

    // Parse AI response
    let alerts: any[] = [];
    try {
      const cleaned = aiResult.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      alerts = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', aiResult.text);
      alerts = [];
    }

    // Insert alerts with dedup
    let inserted = 0;
    for (const alert of alerts) {
      const dedupeKey = `ai_${alert.rule_key || 'unknown'}_${today}`;
      const { error } = await supabase.from('ai_alerts').insert({
        level: alert.level || 'important',
        title: alert.title,
        explanation: alert.explanation,
        suggested_action: alert.suggested_action,
        suggested_assignee_id: alert.suggested_assignee_id || null,
        department_id: alert.department_id || null,
        source: 'ai',
        rule_key: alert.rule_key,
        dedupe_key: `${dedupeKey}_${inserted}`,
        evidence: {
          generated_at: new Date().toISOString(),
          window_minutes: 45,
        },
      });
      if (!error) inserted++;
    }

    // Log AI usage
    await logAIUsage(supabase, 'ai-analyze', aiResult.usage, latencyMs);

    return new Response(
      JSON.stringify({
        ok: true,
        alerts_generated: inserted,
        alerts_total: alerts.length,
        latency_ms: latencyMs,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('ai-analyze error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
