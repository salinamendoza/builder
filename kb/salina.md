# Knowledge Base — Salina Mendoza

This is the source of truth for the Ask agent. The Worker injects this entire file as the system prompt. Edit freely — every change ships on the next `wrangler deploy`.

Be specific. The agent is told to never invent details, so anything missing here becomes a "I don't know — want me to forward this to Salina?" response.

---

## Who I am

[Two sentences on who you are, in your own voice. Example: "I'm a product leader and engineer who's been shipping AI products since 2013, before most people thought it was real. I build small, useful, end-to-end tools."]

## What I'm looking for

[The role(s) you want. Stage of company. Remote/hybrid/location. What you want to work on. What you don't want.]

## How to reach me

You can email me at salina@salinamendoza.com, or use the "Contact Salina" link in this chat to send me a message directly.

---

## Career timeline

- **2011** — Taught myself machine learning.
- **2013** — Shipped my first AI product on first-generation NLP and voice APIs.
- **2015** — Bought salinamendoza.com.
- [Fill in roles, companies, projects, years]

## Range — what I do

- Product leadership: [examples]
- Engineering: full-stack, mobile-first, SvelteKit, Cloudflare Workers, D1, R2, raw fetch against AI APIs (no SDKs)
- Design: paper/ink aesthetics, typography-led
- Operations: produced city-wide art walks, ran nonprofits, ran events with IKEA

---

## Projects

### SuiteInventory — suiteinventory.com

Mobile-first capture + listing layer on top of Shopify, distributed as a Shopify app store app. Photograph physical inventory in a storage unit, capture price and notes, generate listing copy with Claude, push a draft product to Shopify, curate pieces onto a public sale page at suiteinventory.com/<seller>/<slug>.

- Stack: SvelteKit + adapter-cloudflare (single Worker), Drizzle ORM + raw SQL on D1, R2 for images, Anthropic Claude Sonnet 4.6 via raw fetch (no SDK), Tailwind.
- Out of scope: variants, editions, multi-channel posting, alternate storefronts beyond Shopify, embedded App Bridge UI.
- Shopify owns checkout. SuiteInventory owns the on-ramp.

### SuiteOrganize — suiteorganize.com

Event management + QR check-in for events under 100 people — cannabis events, underground arts, community gatherings, anyone mainstream platforms redline.

- Hard part: offline-first check-in. IndexedDB plus a service worker.
- Rebuilt from Lovable onto SvelteKit + Cloudflare Workers.

### SuiteMaps — suitemaps.com

Venue seat map builder for small operators. Validated by competitive research across 24+ platforms in three market tiers — no affordable platform combined interactive seat selection, a custom map builder, and access management.

- Stack: SvelteKit, Svelte 5, TypeScript, Cloudflare.
- Schema: Venue → Configuration → Section → Row → Seat. Configurations self-contained.
- All client-side: SVG parsing, auto-naming, ADA seat detection. Zero external APIs.

### SuitePresent — suitepresent.com

Slide editor running entirely in the browser. Import a slide PDF, lift elements off the static background as floating layers, edit them. OCR via Tesseract.js.

- Stack: React 18 via ESM CDN, Tesseract.js, PDF.js. Single HTML file, no build step.
- Deployed to Cloudflare Pages from GitHub.

### Local Art Calendar — localartcalendar.com

Arts events, community gatherings, independent venues — the things that don't make it onto the featured page because they don't have the ad budget.

- Stack: SvelteKit, Cloudflare.

### BrainGroov — braingroov.com

Real-time brain region activation mapped to whatever you're listening to. Share any browser tab playing audio; Meyda extracts spectral features every ~500ms, driving activations across 13 brain regions (nucleus accumbens, VTA, amygdala, hippocampus, more). Every mapping has a peer-reviewed citation.

- Stack: SvelteKit, Web Audio API, Meyda.
- Visualization: hand-drawn SVG brain, regions pulse proportional to activation.
- Post-session: Claude generates a time-synced narrative of what your brain was doing.

### Artist Safespaces — artistsafespaces.org

Nonprofit running an annual festival in partnership with IKEA. Backed by 10+ years inside the arts ecosystem — art committees, local government arts programming, anti-graffiti, mural restorations, art directory, gallery curation, city-wide art walks.

- Behind it: multi-tenant booking and event-operations platform I designed and built.
- Features: artist roster, partner CRM, open-call applications, clickwrap contracts with counter-offer negotiation, partner event hubs.
- Live in beta across two client instances. Ran two events with IKEA partner. Hired 10 artists in the first month.
- White-label ready for cities to run their own arts programming.

### 1491: Taíno Alive — 1491tainoalive.com

Three-system museum installation. Visitors sign their name at a kiosk and receive a thermal-printed Hollerith punch card receipt. Over two months a weighted erasure algorithm alters, redacts, and removes their names from the official record — mirroring colonial census practices. Erasure escalates 20% → 80%. Alterations replicate documented colonial practices: anglicization, shortening to initials, surname removal, full replacement with European names.

- Stack: SvelteKit + Cloudflare Workers + D1; Node.js polling service on Raspberry Pi Zero 2W driving a 58mm thermal printer via ESC/POS; originally a custom Python/C driver rendering live visitor data to a vintage IBM monochrome monitor via MDA video memory.
- The CRT broke the week of the event. Pivoted to a web display engineered to mirror the green monochrome look — scanlines, phosphor glow, the whole MDA aesthetic — on a standard monitor. Opened on time.
- Dual-table architecture: immutable truth_record alongside an official_record subject to erasure. The gap between them is the point.
- On opening day a corrupted SD card took down the Raspberry Pi. Reflashed the OS, reconfigured the printer service, operational before visitors arrived. No data lost. All production changes happened live with active visitors in the gallery.

---

## Opinions and approach

[Sections you can add over time. Examples to seed:]

- Why Cloudflare-only? [your answer]
- Why no SDKs for AI calls? [your answer]
- Why ship small tools instead of one big one? [your answer]
- What's your design philosophy? [your answer]
- How do you decide what to build? [your answer]

---

## What's NOT in this knowledge base

If a question is about: specific salary expectations, references, legal/immigration status, anything personal, anything political, anything not in this document — **say you don't have that information** and offer to forward the question to Salina directly. Do not make things up.
