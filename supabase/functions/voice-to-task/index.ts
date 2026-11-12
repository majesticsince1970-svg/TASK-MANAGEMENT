// Edge Function: voice-to-task
// Processes audio or transcribed text into structured task data.
// POST { audio_base64?, text?, language? }
// If audio_base64 is provided, uses Gemini for STT then parses.
// If text is provided, parses directly.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { logAIUsage } from '../_shared/ai/provider.ts';
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PARSE_PROMPT = `You are a task parser for Majestic Jewellers' operations system.
Extract structured task data from the given text (which may be in English or Malayalam).

Return ONLY JSON:
{
  "title": "task title in English",
  "title_ml": "task title in Malayalam if original was Malayalam, else null",
  "assignee_name": "person name mentioned or null",
  "timing_type": "urgent|dated|long|flexible|repeating",
  "importance": "normal|important",
  "due_description": "natural language due date like 'tomorrow', 'end of week', 'in 2 hours'",
  "proof_type": "none|photo|file|video|number|checklist|signature|link|text_note",
  "description": "any additional context or null",
  "department_hint": "department name if mentioned or null"
}

Rules:
- If urgency words like "urgent", "immediately", "ഉടനെ" are used → timing_type: "urgent"
- If "important" or "പ്രധാനം" is used → importance: "important"
- Default timing_type: "dated", importance: "normal", proof_type: "none"
- Extract the core action as the title`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { audio_base64, text, language } = body;

    if (!audio_base64 && !text) {
      return new Response(
        JSON.stringify({ error: 'Either audio_base64 or text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = getServiceClient();
    let transcribedText = text || '';
    let totalUsage = { inputTokens: 0, outputTokens: 0 };

    // Step 1: If audio, transcribe with Gemini
    if (audio_base64 && !text) {
      const sttBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/webm',
                  data: audio_base64,
                },
              },
              {
                text: `Transcribe this audio accurately. The speaker may use English, Malayalam, or a mix. Return ONLY the transcribed text, nothing else.`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      };

      const sttRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sttBody),
      });

      if (!sttRes.ok) {
        const err = await sttRes.text();
        throw new Error(`STT error: ${sttRes.status} ${err}`);
      }

      const sttData = await sttRes.json();
      transcribedText = sttData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const sttUsage = sttData.usageMetadata || {};
      totalUsage.inputTokens += sttUsage.promptTokenCount || 0;
      totalUsage.outputTokens += sttUsage.candidatesTokenCount || 0;
    }

    if (!transcribedText.trim()) {
      return new Response(
        JSON.stringify({ error: 'Could not transcribe audio or text is empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Step 2: Parse text into structured task
    const parseBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `Parse this into a task:\n\n"${transcribedText}"` }],
        },
      ],
      systemInstruction: { parts: [{ text: PARSE_PROMPT }] },
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    };

    const parseRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parseBody),
    });

    if (!parseRes.ok) {
      const err = await parseRes.text();
      throw new Error(`Parse error: ${parseRes.status} ${err}`);
    }

    const parseData = await parseRes.json();
    const parseText = parseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parseUsage = parseData.usageMetadata || {};
    totalUsage.inputTokens += parseUsage.promptTokenCount || 0;
    totalUsage.outputTokens += parseUsage.candidatesTokenCount || 0;

    const latencyMs = Date.now() - startTime;

    // Parse the JSON response
    let taskData;
    try {
      const cleaned = parseText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      taskData = JSON.parse(cleaned);
    } catch {
      taskData = { title: transcribedText, timing_type: 'dated', importance: 'normal', proof_type: 'none' };
    }

    // Log usage
    await logAIUsage(supabase, 'voice-to-task', totalUsage, latencyMs);

    return new Response(
      JSON.stringify({
        transcription: transcribedText,
        task: taskData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('voice-to-task error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
