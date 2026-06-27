import KB from '../../kb/salina.md';

interface Env {
  ANTHROPIC_API_KEY: string;
  RESEND_API_KEY: string;
  RATE_LIMIT: KVNamespace;
  TO_EMAIL: string;
  FROM_EMAIL: string;
  ALLOWED_ORIGIN: string;
}

type Msg = { role: 'user' | 'assistant'; content: string };

const MODEL = 'claude-sonnet-4-6';
const MAX_TURNS = 20;
const MAX_CHARS = 2000;

const SYSTEM_PROMPT = (kb: string) => `You are an assistant on Salina Mendoza's portfolio site at suiteproducts.com. Visitors are hiring managers, recruiters, and other builders curious about her work.

Answer questions about Salina using ONLY the knowledge base below. Be conversational, warm, and direct — like a friend who knows her work well.

CRITICAL RULES:
- Only state facts that appear in the knowledge base. Never infer, extrapolate, or invent details (dates, numbers, names, technologies, companies, roles).
- If a question cannot be answered from the KB, say so plainly. Suggest forwarding the question to Salina directly. Do not guess.
- Keep replies concise — 2-4 sentences by default. Use a short paragraph for deeper questions.
- Don't recite the KB verbatim. Synthesize.
- When you offer to forward a question to Salina (because you don't know, or because they're clearly trying to reach her), end your reply with the exact token <<<ESCALATE>>> on its own line. The UI uses this to show a forward button. Do NOT use this token for casual questions.

KNOWLEDGE BASE:
---
${kb}
---`;

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(obj: unknown, status = 200, origin = '*'): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

async function rateLimit(env: Env, ip: string, scope: string, limit: number, ttl = 3600): Promise<boolean> {
  const key = `rl:${scope}:${ip}`;
  const v = await env.RATE_LIMIT.get(key);
  const count = v ? parseInt(v, 10) : 0;
  if (count >= limit) return false;
  await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: ttl });
  return true;
}

async function handleAsk(req: Request, env: Env, origin: string): Promise<Response> {
  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  if (!(await rateLimit(env, ip, 'ask', 30))) return json({ error: 'rate_limited' }, 429, origin);

  let body: { messages?: Msg[] };
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400, origin); }

  const messages = (body.messages || []).slice(-MAX_TURNS).map(m => ({
    role: m.role,
    content: String(m.content || '').slice(0, MAX_CHARS),
  })).filter(m => m.role === 'user' || m.role === 'assistant');

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return json({ error: 'no_user_message' }, 400, origin);
  }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT(KB),
      messages,
    }),
  });

  if (!r.ok) {
    const detail = await r.text();
    return json({ error: 'upstream', detail }, 502, origin);
  }
  const data = await r.json() as { content?: Array<{ text?: string }> };
  const raw = data.content?.[0]?.text || '';
  const escalate = raw.includes('<<<ESCALATE>>>');
  const reply = raw.replace(/<<<ESCALATE>>>/g, '').trim();
  return json({ reply, escalate }, 200, origin);
}

async function handleEscalate(req: Request, env: Env, origin: string): Promise<Response> {
  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  if (!(await rateLimit(env, ip, 'esc', 5))) return json({ error: 'rate_limited' }, 429, origin);

  let body: { name?: string; email?: string; message?: string; honeypot?: string; transcript?: Msg[] };
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400, origin); }

  if (body.honeypot) return json({ ok: true }, 200, origin); // silently drop bots

  const email = (body.email || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'invalid_email' }, 400, origin);
  }
  const message = (body.message || '').trim().slice(0, 4000);
  if (!message) return json({ error: 'empty_message' }, 400, origin);
  const name = (body.name || '').trim().slice(0, 120) || '(no name)';

  const transcript = (body.transcript || []).slice(-MAX_TURNS)
    .map(m => `[${m.role}]\n${String(m.content || '').slice(0, MAX_CHARS)}`)
    .join('\n\n');

  const text = `From: ${name} <${email}>

Message:
${message}

— — — — — — — — — —
Chat transcript:

${transcript || '(no prior chat)'}

— — — — — — — — — —
IP: ${ip}`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: env.TO_EMAIL,
      reply_to: email,
      subject: `[suiteproducts.com] ${name} — ${message.slice(0, 60)}`,
      text,
    }),
  });

  if (!r.ok) {
    const detail = await r.text();
    return json({ error: 'email_failed', detail }, 502, origin);
  }
  return json({ ok: true }, 200, origin);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || '*';
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origin) });
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/api/ask') return handleAsk(req, env, origin);
    if (req.method === 'POST' && url.pathname === '/api/escalate') return handleEscalate(req, env, origin);
    return new Response('Not found', { status: 404, headers: corsHeaders(origin) });
  },
};
