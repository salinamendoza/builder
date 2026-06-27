# CLAUDE.md

Conventions for working in this repo. Read before touching anything.

## What this is

`suiteproducts.com` — Salina Mendoza's portfolio site for hiring conversations. Single static `index.html` at the repo root, plus a Cloudflare Worker in `worker/` that powers the (currently hidden) Ask agent.

This page is the canonical link from Salina's social bios. Range and credibility matter more than feature count.

## File layout

```
index.html             ← the entire site. one file, no build step.
intro.m4a              ← audio for the "Listen" button. user-owned, don't touch.
screenshots/<slug>.png ← one screenshot per project. native ratio, no cropping.
kb/salina.md           ← knowledge base for the Ask agent. user owns the voice.
worker/                ← Cloudflare Worker. /api/ask + /api/escalate.
worker/README.md       ← deploy instructions.
```

The `src/`, `public/`, `svelte.config.js`, `vite.config.ts`, `package.json` at the repo root are vestigial from an earlier scaffold — the deployed site is `index.html`. Leave them alone unless asked.

## Stack — non-negotiable

- **Static page**: vanilla HTML/CSS/JS in `index.html`. No bundler, no framework, no build step.
- **Worker**: SvelteKit-shaped TS in Cloudflare Workers. Anthropic API via raw fetch (no SDK). Model id `claude-sonnet-4-6`.
- **Cloudflare-only.** Never suggest Vercel, Supabase, Neon, AWS, Render, etc. Hard locked.
- **No SDKs for AI APIs.** Raw fetch only.

## Aesthetic

- Two-column desktop (sticky intro left, scrolling work right), single column mobile (breakpoint 900px).
- Fonts: Fraunces (serif, body + headings) + JetBrains Mono (UI chrome, tags, tagline).
- Palette: paper `#fafaf7`, ink `#1a1a1a`, screenshot frame `#f0efe9`. No other colors.
- Screenshots set their own height — no fixed aspect ratio, no `object-fit: cover` cropping, no letterbox padding.
- Screenshot hover: subtle scale + dim + URL pill overlay. Mobile: bottom-gradient URL label, always visible.

## Anti-patterns — do not add

These were tried and removed. Don't bring them back.

- Section labels like `SELECTED WORK` above the project grid (the tagline + screenshots already announce it).
- Footer sign-off with name/links (the sticky left column has the name; footer is redundant noise).
- Collapse/expand `<details>` for project cards (hiring reviewers shouldn't have to click to read).
- "Built with" badges, generated-by tags, AI-shaped boilerplate.
- Emoji in copy, headings, commit messages — unless the user asks.

## Voice and copy

- Tight, declarative, no hedging. Match the user's existing copy — read a few project blocks before editing.
- Em dashes are fine. Oxford commas optional.
- Don't auto-correct grammar Salina has deliberately written one way (she'll ask). Example: she rejected adding a comma to "before everything got complicated".
- Project copy is in her voice. If you rewrite, run the new version past her before pushing.
- Commit messages: lowercase, imperative, one line. No co-author trailer unless requested.

## Adding a project

1. Drop `screenshots/<slug>.png` (native ratio, ~1600px wide).
2. Add an `<article class="project">` block in `index.html`, modeling on an existing one.
3. Mirror the same change to `kb/salina.md` so the Ask agent knows about it.
4. Order matters — Suite products grouped at top, others below.

## Ask agent

- Lives in `worker/`. Frontend is the hidden FAB in `index.html` (style="display:none" until ready).
- KB at `kb/salina.md` is the source of truth. Worker embeds it as a text import at build time.
- Hard rule in the system prompt: never invent facts. Emits `<<<ESCALATE>>>` token when it should offer a handoff; the UI catches it and surfaces the contact form.
- Escalation email via Resend. Rate-limited via KV.
- To re-enable the agent UI: remove `style="display:none"` from `#askFab` in `index.html`.

## Branch + push

- Always commit and push to the user's working branch. Don't open PRs unless asked.
- Don't `git add -A` if there are unrelated untracked files — name files explicitly.

## When in doubt

Ask Salina. She has strong opinions and they're usually right. Don't over-design.
