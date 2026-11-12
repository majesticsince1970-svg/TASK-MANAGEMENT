// Edge Function: tts
// Text-to-speech endpoint with Supabase Storage caching.
// POST { text, language } → audio/mpeg binary
// Uses Google Cloud TTS via _shared/speech/provider.ts
// Caches results in the `tts-cache` storage bucket.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { synthesizeSpeech } from '../_shared/speech/provider.ts';
import { corsHeaders } from '../_shared/cors.ts';

/** Generate a hex SHA-256 hash for cache keying */
async function sha256Hex(input: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, language } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const lang = (language === 'ml-IN' ? 'ml-IN' : 'en-IN') as 'en-IN' | 'ml-IN';
    const supabase = getServiceClient();

    // Build cache key from text + language
    const cacheKey = await sha256Hex(`${lang}:${text}`);
    const cachePath = `${lang}/${cacheKey}.mp3`;

    // 1. Check cache in tts-cache bucket
    const { data: cachedFile } = await supabase.storage
      .from('tts-cache')
      .download(cachePath);

    if (cachedFile) {
      const audioBytes = new Uint8Array(await cachedFile.arrayBuffer());
      return new Response(audioBytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=604800',
          'X-Cache': 'HIT',
        },
      });
    }

    // 2. Cache miss — synthesize
    const audioBytes = await synthesizeSpeech({ text, language: lang });

    // 3. Store in cache bucket (fire-and-forget)
    supabase.storage
      .from('tts-cache')
      .upload(cachePath, audioBytes, {
        contentType: 'audio/mpeg',
        upsert: true,
      })
      .then(({ error }) => {
        if (error) console.error('TTS cache write error:', error);
      });

    return new Response(audioBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=604800',
        'X-Cache': 'MISS',
      },
    });
  } catch (err) {
    console.error('tts error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
