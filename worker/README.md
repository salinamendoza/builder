# suiteproducts-ask

Cloudflare Worker that powers the "Ask about my work" chat on suiteproducts.com.

- `POST /api/ask` — chat with Claude Sonnet 4.6, grounded on `kb/salina.md`. Never invents facts. Emits `<<<ESCALATE>>>` when it should offer a handoff.
- `POST /api/escalate` — emails the question + transcript to Salina via Resend.

## Setup

```bash
cd worker
npm install

# 1. Auth
npx wrangler login

# 2. Create KV namespace for rate limiting
npx wrangler kv:namespace create RATE_LIMIT
# → paste the returned id into wrangler.toml

# 3. Set secrets
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put RESEND_API_KEY

# 4. (Optional) Tweak [vars] in wrangler.toml
#    TO_EMAIL        — where escalations go
#    FROM_EMAIL      — verified Resend sender (DNS must be set up on Resend)
#    ALLOWED_ORIGIN  — your portfolio domain, for CORS

# 5. Deploy
npx wrangler deploy
```

## Wiring the frontend

The portfolio page calls `${ASK_API_BASE}/ask` and `/escalate`. Default is `/api`.

If the Worker lives at a different origin (e.g. `https://ask.suiteproducts.com`), inject this above the `<script>` in `index.html`:

```html
<script>window.ASK_API_BASE = 'https://ask.suiteproducts.com/api';</script>
```

Or route `suiteproducts.com/api/*` to this Worker via a Cloudflare route — then no JS change needed.

## Updating the knowledge base

Edit `kb/salina.md` at the repo root. Redeploy: `npx wrangler deploy`. The KB is embedded into the Worker bundle at build time (`[[rules]] type = "Text"`).

## Switching email provider

Default is Resend. To use MailChannels (free from Workers, needs SPF/DKIM on FROM_EMAIL's domain), swap the `fetch('https://api.resend.com/emails', ...)` call in `src/index.ts` — payload shape is documented at https://api.mailchannels.net/tx/v1/send.

## Rate limits

- `/api/ask`: 30 requests per IP per hour
- `/api/escalate`: 5 per IP per hour

Tune in `src/index.ts`.
