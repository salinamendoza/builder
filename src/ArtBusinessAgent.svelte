<script lang="ts">
  import { streamMessage } from './lib/api';
  import {
    EMAIL_REACTIVATION_PROMPT,
    CONTENT_SOCIAL_COPY_PROMPT,
    CONTENT_REPURPOSE_IDEAS_PROMPT,
    CONTENT_STRATEGY_PROMPT,
    CONTENT_DISTRIBUTION_PROMPT,
    SHOPIFY_COPY_PROMPT,
  } from './lib/prompts';

  type Mode = 'email' | 'content' | 'shopify';

  const MODES: { id: Mode; label: string }[] = [
    { id: 'email', label: 'Email Reactivation' },
    { id: 'content', label: 'Content' },
    { id: 'shopify', label: 'Shopify Copy' },
  ];

  let activeMode = $state<Mode>('email');
  let apiKey = $state(localStorage.getItem('art-agent-api-key') ?? '');
  let loading = $state(false);
  let output = $state('');
  let error = $state('');
  let copied = $state(false);

  // Email mode
  let exhibitDetails = $state(
    '1491 Taíno Alive — an immersive museum exhibit exploring colonial census erasure through an interactive installation where visitor names are systematically altered and erased over time by a weighted algorithm. On view now, closing May 2nd.',
  );
  let toneNotes = $state('');
  let segment = $state<'warm' | 'cold'>('warm');

  // Content mode
  type ContentType = 'social' | 'repurpose' | 'strategy' | 'distribution';
  const CONTENT_TYPES: { id: ContentType; label: string }[] = [
    { id: 'social', label: 'Social Copy' },
    { id: 'repurpose', label: 'Repurpose Ideas' },
    { id: 'strategy', label: 'Strategy' },
    { id: 'distribution', label: 'Distribution' },
  ];
  let contentType = $state<ContentType>('social');
  let sourceContent = $state('');

  // Shopify mode
  let pieceTitle = $state('');
  let medium = $state('');
  let dimensions = $state('');
  let storyNotes = $state('');

  function saveApiKey() {
    localStorage.setItem('art-agent-api-key', apiKey);
  }

  function getSystemPrompt(): string {
    if (activeMode === 'email') return EMAIL_REACTIVATION_PROMPT;
    if (activeMode === 'content') {
      if (contentType === 'social') return CONTENT_SOCIAL_COPY_PROMPT;
      if (contentType === 'repurpose') return CONTENT_REPURPOSE_IDEAS_PROMPT;
      if (contentType === 'strategy') return CONTENT_STRATEGY_PROMPT;
      return CONTENT_DISTRIBUTION_PROMPT;
    }
    return SHOPIFY_COPY_PROMPT;
  }

  function getUserMessage(): string {
    if (activeMode === 'email') {
      let msg = `Exhibit details: ${exhibitDetails}\nSegment: ${segment.toUpperCase()}`;
      if (toneNotes.trim()) msg += `\nTone notes: ${toneNotes}`;
      return msg;
    }
    if (activeMode === 'content') {
      return sourceContent;
    }
    let msg = `Title: ${pieceTitle}`;
    if (medium.trim()) msg += `\nMedium: ${medium}`;
    if (dimensions.trim()) msg += `\nDimensions: ${dimensions}`;
    if (storyNotes.trim()) msg += `\nStory/notes: ${storyNotes}`;
    return msg;
  }

  function canSubmit(): boolean {
    if (!apiKey.trim() || loading) return false;
    if (activeMode === 'email') return !!exhibitDetails.trim();
    if (activeMode === 'content') return !!sourceContent.trim();
    return !!pieceTitle.trim();
  }

  async function handleSubmit() {
    if (!canSubmit()) return;
    loading = true;
    output = '';
    error = '';
    copied = false;

    await streamMessage(
      apiKey,
      getSystemPrompt(),
      getUserMessage(),
      (text) => {
        output += text;
      },
      () => {
        loading = false;
      },
      (err) => {
        error = err;
        loading = false;
      },
    );
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = output;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    }
  }

  async function copySection(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  function getOutputSections(): { title: string; body: string }[] {
    if (!output.trim()) return [];

    // Split on markdown bold headers like **INSTAGRAM** or **Email 1: ...**
    const parts = output.split(/(?=\*\*(?:Email \d|INSTAGRAM|FACEBOOK|TIKTOK|PRODUCT DESCRIPTION|TAGLINE|PRICE ANCHOR|FROM ONE PIECE|SEQUENCE SUGGESTION|DORMANT ASSET|CONTENT PILLARS|THIS WEEK|WHAT TO STOP|UNDERUSED OPPORTUNIT|OWNED CHANNELS|EARNED CHANNELS|COMMUNITY PLAYS|PLATFORM HACKS))/i);
    if (parts.length <= 1) return [{ title: '', body: output }];

    return parts
      .map((part) => {
        const match = part.match(/^\*\*(.+?)\*\*/);
        return {
          title: match ? match[1] : '',
          body: part.trim(),
        };
      })
      .filter((s) => s.body);
  }
</script>

<div class="mx-auto max-w-3xl px-5 py-10 font-serif text-base leading-relaxed sm:py-16">
  <!-- Header -->
  <div class="mb-8 flex flex-wrap items-baseline justify-between gap-4">
    <h1 class="font-serif text-2xl font-bold tracking-tight">Art Agent</h1>
    <input
      type="password"
      bind:value={apiKey}
      oninput={saveApiKey}
      placeholder="API key"
      class="w-48 border-b border-current bg-transparent font-mono text-xs tracking-wide opacity-60 outline-none placeholder:opacity-40 focus:opacity-100"
    />
  </div>

  <!-- Tabs -->
  <div class="mb-8 flex gap-0 border-b border-current/20">
    {#each MODES as mode}
      <button
        onclick={() => { activeMode = mode.id; output = ''; error = ''; }}
        class="relative px-4 py-2 font-mono text-xs uppercase tracking-widest transition-opacity
          {activeMode === mode.id ? 'opacity-100' : 'opacity-40 hover:opacity-70'}"
      >
        {mode.label}
        {#if activeMode === mode.id}
          <span class="absolute bottom-0 left-0 right-0 h-px bg-current"></span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Forms -->
  <div class="mb-6 space-y-4">
    {#if activeMode === 'email'}
      <div>
        <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">
          Exhibit details
        </label>
        <textarea
          bind:value={exhibitDetails}
          rows={3}
          class="w-full resize-y border border-current/20 bg-transparent px-3 py-2 font-serif text-sm leading-relaxed outline-none focus:border-current/50"
        ></textarea>
      </div>
      <div>
        <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">
          Tone notes
        </label>
        <input
          type="text"
          bind:value={toneNotes}
          placeholder="Optional — e.g. more urgency, softer close"
          class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none placeholder:opacity-30 focus:border-current/50"
        />
      </div>
      <div>
        <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">
          Segment
        </label>
        <div class="flex gap-0">
          <button
            onclick={() => (segment = 'warm')}
            class="border border-current/20 px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-opacity
              {segment === 'warm' ? 'bg-current/10 opacity-100' : 'opacity-40 hover:opacity-70'}"
          >
            Warm
          </button>
          <button
            onclick={() => (segment = 'cold')}
            class="border border-current/20 border-l-0 px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-opacity
              {segment === 'cold' ? 'bg-current/10 opacity-100' : 'opacity-40 hover:opacity-70'}"
          >
            Cold
          </button>
        </div>
      </div>
    {:else if activeMode === 'content'}
      <div>
        <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">
          What do you need?
        </label>
        <div class="flex flex-wrap gap-0">
          {#each CONTENT_TYPES as ct, i}
            <button
              onclick={() => (contentType = ct.id)}
              class="border border-current/20 px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-opacity
                {contentType === ct.id ? 'bg-current/10 opacity-100' : 'opacity-40 hover:opacity-70'}
                {i > 0 ? 'border-l-0' : ''}"
            >
              {ct.label}
            </button>
          {/each}
        </div>
      </div>
      <div>
        <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">
          {#if contentType === 'social'}Paste caption/post or describe a piece{:else if contentType === 'repurpose'}Describe the artwork or asset to repurpose{:else if contentType === 'strategy'}What are you working on / promoting / stuck on?{:else}What are you trying to get in front of people?{/if}
        </label>
        <textarea
          bind:value={sourceContent}
          rows={5}
          placeholder={contentType === 'social'
            ? 'Paste an existing caption, describe an artwork, or recap a moment from the studio/exhibit...'
            : contentType === 'repurpose'
              ? 'Describe a piece, a body of work, an exhibit, a studio moment — anything you want to squeeze more content from...'
              : contentType === 'strategy'
                ? 'What are you promoting right now? What\'s coming up? What feels stuck? Give context and I\'ll give you a plan...'
                : 'Describe the exhibit, launch, event, or body of work you need to distribute...'}
          class="w-full resize-y border border-current/20 bg-transparent px-3 py-2 font-serif text-sm leading-relaxed outline-none placeholder:opacity-30 focus:border-current/50"
        ></textarea>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">
            Piece title
          </label>
          <input
            type="text"
            bind:value={pieceTitle}
            class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none focus:border-current/50"
          />
        </div>
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">
            Medium
          </label>
          <input
            type="text"
            bind:value={medium}
            placeholder="e.g. Acrylic on canvas"
            class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none placeholder:opacity-30 focus:border-current/50"
          />
        </div>
      </div>
      <div>
        <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">
          Dimensions
        </label>
        <input
          type="text"
          bind:value={dimensions}
          placeholder='e.g. 36" x 48"'
          class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none placeholder:opacity-30 focus:border-current/50"
        />
      </div>
      <div>
        <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">
          Story / notes
        </label>
        <textarea
          bind:value={storyNotes}
          rows={4}
          placeholder="What's behind this piece? Cultural context, process, why it matters..."
          class="w-full resize-y border border-current/20 bg-transparent px-3 py-2 font-serif text-sm leading-relaxed outline-none placeholder:opacity-30 focus:border-current/50"
        ></textarea>
      </div>
    {/if}
  </div>

  <!-- Submit -->
  <button
    onclick={handleSubmit}
    disabled={!canSubmit()}
    class="border border-current px-5 py-2 font-mono text-xs uppercase tracking-widest transition-opacity
      {canSubmit() ? 'opacity-70 hover:opacity-100' : 'cursor-not-allowed opacity-20'}"
  >
    {loading ? 'Generating...' : 'Generate'}
  </button>

  <!-- Error -->
  {#if error}
    <div class="mt-4 border border-red-500/40 px-4 py-3 font-mono text-xs text-red-600 dark:text-red-400">
      {error}
    </div>
  {/if}

  <!-- Output -->
  {#if output}
    <div class="mt-8 border-t border-current/20 pt-6">
      <div class="mb-4 flex items-baseline justify-between">
        <span class="font-mono text-xs uppercase tracking-widest opacity-60">Output</span>
        <button
          onclick={copyOutput}
          class="border border-current/20 px-3 py-1 font-mono text-xs tracking-wide opacity-50 transition-opacity hover:opacity-100"
        >
          {copied ? 'Copied' : 'Copy all'}
        </button>
      </div>

      {#each getOutputSections() as section}
        <div class="group relative mb-6">
          {#if section.title}
            <button
              onclick={() => copySection(section.body)}
              class="absolute right-0 top-0 border border-current/10 px-2 py-0.5 font-mono text-[10px] tracking-wide opacity-0 transition-opacity group-hover:opacity-50 hover:!opacity-100"
            >
              Copy
            </button>
          {/if}
          <div class="whitespace-pre-wrap font-serif text-sm leading-loose">{section.body}</div>
        </div>
      {/each}

      {#if loading}
        <span class="inline-block animate-pulse font-mono text-xs opacity-40">...</span>
      {/if}
    </div>
  {/if}
</div>
