// Edge Function: ai-digest
// Daily digest generation — runs at digest_time via pg_cron.
// Summarises completed tasks, pending approvals, overdue items.
// Stores digest notification for each manager.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { generateContent, logAIUsage } from '../_shared/ai/provider.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `You are Majestic AI generating a daily operations digest for Majestic Jewellers.
Summarise the data into a clear, concise daily report with sections:
1. 📊 Overview — headline numbers
2. ✅ Completed Today — notable completions
3. ⏰ Overdue — items needing attention
4. 📝 Pending Approvals — tasks awaiting review
5. 💡 Recommendations — 1-2 actionable suggestions

Keep it under 500 words. Use bullet points. Be professional yet friendly.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = getServiceClient();
    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00.000Z`;

    // 1. Tasks completed today
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('id, title, owner_id, department_id, timing_type, importance, completed_at')
      .eq('status', 'done')
      .gte('completed_at', todayStart)
      .order('completed_at', { ascending: false });

    // 2. Pending approvals
    const { data: pendingApprovals } = await supabase
      .from('tasks')
      .select('id, title, owner_id, department_id, submitted_at')
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: true });

    // 3. Overdue tasks
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('id, title, owner_id, department_id, due_at, timing_type, status')
      .in('status', ['new', 'seen', 'in_progress', 'blocked'])
      .not('due_at', 'is', null)
      .lt('due_at', new Date().toISOString())
      .order('due_at', { ascending: true });

    // 4. Department names for context
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name');
    const deptMap: Record<string, string> = {};
    for (const d of departments || []) deptMap[d.id] = d.name;

    // 5. Profile names for context
    const ownerIds = new Set<string>();
    for (const list of [completedTasks, pendingApprovals, overdueTasks]) {
      for (const t of list || []) if (t.owner_id) ownerIds.add(t.owner_id);
    }
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', [...ownerIds]);
    const nameMap: Record<string, string> = {};
    for (const p of profiles || []) nameMap[p.id] = p.full_name;

    // Enrich data with names
    const enrich = (tasks: any[]) =>
      (tasks || []).map((t: any) => ({
        ...t,
        owner_name: nameMap[t.owner_id] || 'Unassigned',
        department_name: deptMap[t.department_id] || 'Unknown',
      }));

    const context = JSON.stringify({
      date: today,
      completed: enrich(completedTasks),
      pending_approvals: enrich(pendingApprovals),
      overdue: enrich(overdueTasks),
      summary: {
        completed_count: completedTasks?.length || 0,
        pending_approvals_count: pendingApprovals?.length || 0,
        overdue_count: overdueTasks?.length || 0,
      },
    });

    // Call Gemini
    const aiResult = await generateContent(
      [{ role: 'user', parts: [{ text: `Generate the daily digest for today:\n\n${context}` }] }],
      SYSTEM_PROMPT,
    );

    const latencyMs = Date.now() - startTime;
    const digestText = aiResult.text;

    // Get all managers (owner, director, dept_head)
    const { data: managers } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['owner', 'director', 'dept_head'])
      .eq('is_active', true);

    // Insert digest notification for each manager
    const notifications = (managers || []).map((m: any) => ({
      user_id: m.id,
      type: 'daily_digest',
      title: `📋 Daily Digest — ${today}`,
      body: digestText,
      level: 'info',
      action_url: '/dashboard',
      channels: ['in_app'],
      dedupe_key: `digest_${today}_${m.id}`,
    }));

    if (notifications.length > 0) {
      await supabase.from('notifications').upsert(notifications, { onConflict: 'dedupe_key' });
    }

    // Log AI usage
    await logAIUsage(supabase, 'ai-digest', aiResult.usage, latencyMs);

    return new Response(
      JSON.stringify({
        ok: true,
        digest: digestText,
        recipients: notifications.length,
        latency_ms: latencyMs,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('ai-digest error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
