// Shared TTS provider for Supabase Edge Functions
// Uses Google Cloud Text-to-Speech API for Malayalam audio

const TTS_API_KEY = Deno.env.get('GOOGLE_CLOUD_TTS_KEY') || '';
const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export interface TTSOptions {
  text: string;
  language: 'en-IN' | 'ml-IN';
  speed?: number;
}

export async function synthesizeSpeech(options: TTSOptions): Promise<Uint8Array> {
  const body = {
    input: { text: options.text },
    voice: {
      languageCode: options.language,
      name: options.language === 'ml-IN' ? 'ml-IN-Wavenet-A' : 'en-IN-Wavenet-C',
      ssmlGender: 'FEMALE',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: options.speed || 1.0,
      pitch: 0,
    },
  };

  const res = await fetch(`${TTS_URL}?key=${TTS_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`TTS API error: ${res.status}`);
  }

  const data = await res.json();
  // audioContent is base64 encoded
  const audioBytes = Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0));
  return audioBytes;
}

// Cache TTS by hash to avoid duplicate API calls
const ttsCache = new Map<string, Uint8Array>();

export async function synthesizeWithCache(options: TTSOptions): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(options)));
  const key = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (ttsCache.has(key)) {
    return ttsCache.get(key)!;
  }

  const audio = await synthesizeSpeech(options);
  ttsCache.set(key, audio);
  return audio;
}

