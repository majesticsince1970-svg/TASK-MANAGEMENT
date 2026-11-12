// Shared AI provider for Supabase Edge Functions
// Uses Gemini API for all AI operations

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface AIMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface AIResponse {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}

export async function generateContent(
  messages: AIMessage[],
  systemInstruction?: string,
): Promise<AIResponse> {
  const body: Record<string, unknown> = {
    contents: messages,
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  body.generationConfig = {
    temperature: 0.3,
    topP: 0.8,
    maxOutputTokens: 2048,
  };

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = data.usageMetadata || {};

  return {
    text,
    usage: {
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
    },
  };
}

export async function logAIUsage(
  supabaseClient: any,
  functionName: string,
  usage: { inputTokens: number; outputTokens: number },
  latencyMs: number,
  userId?: string,
) {
  await supabaseClient.from('ai_usage').insert({
    function_name: functionName,
    model: GEMINI_MODEL,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    latency_ms: latencyMs,
    triggered_by: userId,
  });
}

