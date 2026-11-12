// Edge Function: notify
// Sends web push notifications to a user's registered devices.
// POST { user_id, title, body, action_url }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@majesticops.com';

/** Import key for ECDSA signing (VAPID) */
async function importVapidKey(raw: string): Promise<CryptoKey> {
  const bytes = Uint8Array.from(
    atob(raw.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  );
  return crypto.subtle.importKey(
    'pkcs8',
    bytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Build a VAPID JWT for the push endpoint origin */
async function buildVapidJwt(audience: string): Promise<string> {
  const header = base64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    new TextEncoder().encode(
      JSON.stringify({ aud: audience, exp: now + 86400, sub: VAPID_SUBJECT }),
    ),
  );

  const signingInput = new TextEncoder().encode(`${header}.${payload}`);
  const key = await importVapidKey(VAPID_PRIVATE_KEY);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, signingInput);

  return `${header}.${payload}.${base64url(sig)}`;
}

/** Send a single push notification */
async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
): Promise<boolean> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await buildVapidJwt(audience);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: '86400',
      Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    },
    body: new TextEncoder().encode(payload),
  });

  return res.ok || res.status === 201;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, action_url } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'user_id and title are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // Fetch all push subscriptions for the user
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (error) throw error;

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, message: 'No push subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = JSON.stringify({
      title,
      body: body || '',
      data: { url: action_url || '/' },
    });

    const results = await Promise.allSettled(
      subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
        sendPush(sub, payload),
      ),
    );

    const sent = results.filter(
      (r) => r.status === 'fulfilled' && r.value === true,
    ).length;

    return new Response(
      JSON.stringify({ ok: true, sent, total: subs.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('notify error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
