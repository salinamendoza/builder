<script lang="ts">
  import { streamMessage, sendMessage, fileToContentBlock } from './lib/api';
  import {
    EMAIL_REACTIVATION_PROMPT,
    CONTENT_SOCIAL_COPY_PROMPT,
    CONTENT_REPURPOSE_IDEAS_PROMPT,
    CONTENT_STRATEGY_PROMPT,
    CONTENT_DISTRIBUTION_PROMPT,
    SHOPIFY_COPY_PROMPT,
    LISTING_AGENT_PROMPT,
    PRESS_RELEASE_PROMPT,
  } from './lib/prompts';
  import {
    type PricingConfig,
    type PricingResult,
    type PricingInput,
    DEFAULT_MEDIUMS,
    loadPricingConfig,
    savePricingConfig,
    calculatePrice,
    parseDimensions,
  } from './lib/pricing';

  type Mode = 'email' | 'content' | 'shopify' | 'listing' | 'press';

  const MODES: { id: Mode; label: string }[] = [
    { id: 'email', label: 'Email' },
    { id: 'content', label: 'Content' },
    { id: 'shopify', label: 'Shopify Copy' },
    { id: 'listing', label: 'Listing' },
    { id: 'press', label: 'Press' },
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

  // Shopify copy mode
  let pieceTitle = $state('');
  let medium = $state('');
  let dimensions = $state('');
  let storyNotes = $state('');

  // Press mode
  let pressDetails = $state('');
  let pressMuseumWriteup = $state('');

  // Listing mode
  let listingImages = $state<File[]>([]);
  let listingImagePreviews = $state<string[]>([]);
  let listingTitle = $state('');
  let listingMedium = $state('');
  let listingDimensions = $state('');
  let listingStory = $state('');
  let listingComplexity = $state('standard');
  let listingCultural = $state('standard');
  let listingExhibition = $state('none');

  // Listing generated data
  interface ListingData {
    title: string;
    description: string;
    tagline: string;
    tags: string[];
    seoTitle: string;
    seoDescription: string;
    estimatedMedium: string;
    estimatedDimensions: string;
    priceAnchorCopy: string;
    missingInfo: string[];
  }
  let listingData = $state<ListingData | null>(null);
  let pricingResult = $state<PricingResult | null>(null);
  let listingStep = $state<'input' | 'review'>('input');

  // Pricing config
  let pricingConfig = $state<PricingConfig>(loadPricingConfig());
  let showPricingConfig = $state(false);

  // Splash video
  let videoExpanded = $state(true);
  let videoEl: HTMLVideoElement | undefined = $state(undefined);

  function onVideoEnded() {
    videoExpanded = false;
  }

  function replayVideo() {
    videoExpanded = true;
    if (videoEl) {
      videoEl.currentTime = 0;
      videoEl.play();
    }
  }

  function saveApiKey() {
    localStorage.setItem('art-agent-api-key', apiKey);
  }

  // --- Shared modes (email, content, shopify) ---

  function getSystemPrompt(): string {
    if (activeMode === 'email') return EMAIL_REACTIVATION_PROMPT;
    if (activeMode === 'content') {
      if (contentType === 'social') return CONTENT_SOCIAL_COPY_PROMPT;
      if (contentType === 'repurpose') return CONTENT_REPURPOSE_IDEAS_PROMPT;
      if (contentType === 'strategy') return CONTENT_STRATEGY_PROMPT;
      return CONTENT_DISTRIBUTION_PROMPT;
    }
    if (activeMode === 'press') return PRESS_RELEASE_PROMPT;
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
    if (activeMode === 'press') {
      let msg = pressDetails;
      if (pressMuseumWriteup.trim()) msg += `\n\n---\nMuseum/gallery write-up for reference (DO NOT copy — use as source material):\n${pressMuseumWriteup}`;
      return msg;
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
    if (activeMode === 'shopify') return !!pieceTitle.trim();
    if (activeMode === 'press') return !!pressDetails.trim();
    return false; // listing has its own submit
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
      (text) => { output += text; },
      () => { loading = false; },
      (err) => { error = err; loading = false; },
    );
  }

  // --- Listing mode ---

  function handleImageDrop(e: DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
      f.type.startsWith('image/'),
    );
    addImages(files);
  }

  function handleImageSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    addImages(files);
    input.value = '';
  }

  function addImages(files: File[]) {
    const newFiles = files.slice(0, 5 - listingImages.length);
    listingImages = [...listingImages, ...newFiles];
    for (const file of newFiles) {
      const reader = new FileReader();
      reader.onload = () => {
        listingImagePreviews = [...listingImagePreviews, reader.result as string];
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage(index: number) {
    listingImages = listingImages.filter((_, i) => i !== index);
    listingImagePreviews = listingImagePreviews.filter((_, i) => i !== index);
  }

  function canSubmitListing(): boolean {
    return !loading && !!apiKey.trim() && listingImages.length > 0;
  }

  async function handleListingSubmit() {
    if (!canSubmitListing()) return;
    loading = true;
    error = '';
    listingData = null;
    pricingResult = null;

    // Build content blocks: images + text
    const contentBlocks = [];
    for (const file of listingImages) {
      contentBlocks.push(await fileToContentBlock(file));
    }

    let textParts = [];
    if (listingTitle.trim()) textParts.push(`Title: ${listingTitle}`);
    if (listingMedium.trim()) textParts.push(`Medium: ${listingMedium}`);
    if (listingDimensions.trim()) textParts.push(`Dimensions: ${listingDimensions}`);
    if (listingStory.trim()) textParts.push(`Story/notes: ${listingStory}`);
    if (textParts.length === 0) textParts.push('Generate a listing based on these images.');

    contentBlocks.push({ type: 'text' as const, text: textParts.join('\n') });

    const result = await sendMessage(apiKey, LISTING_AGENT_PROMPT, contentBlocks);

    if (result.error) {
      error = result.error;
      loading = false;
      return;
    }

    // Parse JSON from response
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      const data = JSON.parse(jsonMatch[0]) as ListingData;
      listingData = data;

      // Use agent's estimates if fields were empty
      if (!listingMedium.trim() && data.estimatedMedium) {
        listingMedium = data.estimatedMedium;
      }
      if (!listingDimensions.trim() && data.estimatedDimensions) {
        listingDimensions = data.estimatedDimensions;
      }
      if (!listingTitle.trim() && data.title) {
        listingTitle = data.title;
      }

      // Calculate pricing
      computePricing();
      listingStep = 'review';
    } catch (e) {
      error = `Failed to parse listing data: ${e instanceof Error ? e.message : String(e)}\n\nRaw response:\n${result.text}`;
    }

    loading = false;
  }

  function computePricing() {
    const dims = parseDimensions(listingDimensions);
    if (!dims) {
      pricingResult = null;
      return;
    }

    const input: PricingInput = {
      widthInches: dims.w,
      heightInches: dims.h,
      medium: listingMedium,
      complexity: listingComplexity,
      culturalSignificance: listingCultural,
      exhibitionContext: listingExhibition,
    };

    pricingResult = calculatePrice(pricingConfig, input);
  }

  function resetListing() {
    listingStep = 'input';
    listingData = null;
    pricingResult = null;
  }

  function updatePricingConfig() {
    savePricingConfig(pricingConfig);
    computePricing();
  }

  // --- Copy helpers ---

  async function copyText(text: string) {
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

  async function copyOutput() {
    await copyText(output);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function copyFullListing() {
    if (!listingData) return;
    const parts = [
      `Title: ${listingData.title}`,
      `\nTagline: ${listingData.tagline}`,
      `\nDescription:\n${listingData.description}`,
      `\nTags: ${listingData.tags.join(', ')}`,
      `\nSEO Title: ${listingData.seoTitle}`,
      `SEO Description: ${listingData.seoDescription}`,
      `\nPrice Anchor Copy:\n${listingData.priceAnchorCopy}`,
      pricingResult ? `\nSuggested Price: $${pricingResult.suggestedPrice}` : '',
      pricingResult ? `Pricing Breakdown: ${pricingResult.breakdown}` : '',
    ];
    copyText(parts.filter(Boolean).join('\n'));
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function getOutputSections(): { title: string; body: string }[] {
    if (!output.trim()) return [];
    const parts = output.split(/(?=\*\*(?:Email \d|INSTAGRAM|FACEBOOK|TIKTOK|PRODUCT DESCRIPTION|TAGLINE|PRICE ANCHOR|FROM ONE PIECE|SEQUENCE SUGGESTION|DORMANT ASSET|CONTENT PILLARS|THIS WEEK|WHAT TO STOP|UNDERUSED OPPORTUNIT|OWNED CHANNELS|EARNED CHANNELS|COMMUNITY PLAYS|PLATFORM HACKS|PRESS RELEASE|BLOG\/WEBSITE|PULL QUOTES))/i);
    if (parts.length <= 1) return [{ title: '', body: output }];
    return parts
      .map((part) => {
        const match = part.match(/^\*\*(.+?)\*\*/);
        return { title: match ? match[1] : '', body: part.trim() };
      })
      .filter((s) => s.body);
  }
</script>

<div class="mx-auto max-w-3xl px-5 py-10 font-serif text-base leading-relaxed sm:py-16">
  <!-- Splash video -->
  {#if videoExpanded}
    <div class="mb-6">
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        bind:this={videoEl}
        autoplay
        muted
        playsinline
        onended={onVideoEnded}
        class="w-full"
      >
        <source src="/intro.mp4" type="video/mp4" />
      </video>
    </div>
  {:else}
    <button
      onclick={replayVideo}
      class="mb-6 flex w-full items-center justify-center border border-current/10 py-1 font-mono text-[10px] uppercase tracking-widest opacity-30 transition-opacity hover:opacity-60"
    >
      replay
    </button>
  {/if}

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
  <div class="mb-8 flex flex-wrap gap-0 border-b border-current/20">
    {#each MODES as mode}
      <button
        onclick={() => { activeMode = mode.id; output = ''; error = ''; }}
        class="relative px-3 py-2 font-mono text-xs uppercase tracking-widest transition-opacity
          {activeMode === mode.id ? 'opacity-100' : 'opacity-40 hover:opacity-70'}"
      >
        {mode.label}
        {#if activeMode === mode.id}
          <span class="absolute bottom-0 left-0 right-0 h-px bg-current"></span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- ==================== EMAIL / CONTENT / SHOPIFY FORMS ==================== -->
  {#if activeMode !== 'listing'}
    <div class="mb-6 space-y-4">
      {#if activeMode === 'email'}
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Exhibit details</label>
          <textarea bind:value={exhibitDetails} rows={3} class="w-full resize-y border border-current/20 bg-transparent px-3 py-2 font-serif text-sm leading-relaxed outline-none focus:border-current/50"></textarea>
        </div>
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Tone notes</label>
          <input type="text" bind:value={toneNotes} placeholder="Optional — e.g. more urgency, softer close" class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none placeholder:opacity-30 focus:border-current/50" />
        </div>
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Segment</label>
          <div class="flex gap-0">
            <button onclick={() => (segment = 'warm')} class="border border-current/20 px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-opacity {segment === 'warm' ? 'bg-current/10 opacity-100' : 'opacity-40 hover:opacity-70'}">Warm</button>
            <button onclick={() => (segment = 'cold')} class="border border-current/20 border-l-0 px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-opacity {segment === 'cold' ? 'bg-current/10 opacity-100' : 'opacity-40 hover:opacity-70'}">Cold</button>
          </div>
        </div>
      {:else if activeMode === 'content'}
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">What do you need?</label>
          <div class="flex flex-wrap gap-0">
            {#each CONTENT_TYPES as ct, i}
              <button
                onclick={() => (contentType = ct.id)}
                class="border border-current/20 px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-opacity
                  {contentType === ct.id ? 'bg-current/10 opacity-100' : 'opacity-40 hover:opacity-70'}
                  {i > 0 ? 'border-l-0' : ''}"
              >{ct.label}</button>
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
            placeholder={contentType === 'social' ? 'Paste an existing caption, describe an artwork, or recap a moment...' : contentType === 'repurpose' ? 'Describe a piece, body of work, exhibit, studio moment...' : contentType === 'strategy' ? "What are you promoting right now? What's coming up? What feels stuck?" : 'Describe the exhibit, launch, event, or body of work you need to distribute...'}
            class="w-full resize-y border border-current/20 bg-transparent px-3 py-2 font-serif text-sm leading-relaxed outline-none placeholder:opacity-30 focus:border-current/50"
          ></textarea>
        </div>
      {:else}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Piece title</label>
            <input type="text" bind:value={pieceTitle} class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none focus:border-current/50" />
          </div>
          <div>
            <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Medium</label>
            <input type="text" bind:value={medium} placeholder="e.g. Acrylic on canvas" class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none placeholder:opacity-30 focus:border-current/50" />
          </div>
        </div>
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Dimensions</label>
          <input type="text" bind:value={dimensions} placeholder='e.g. 36" x 48"' class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none placeholder:opacity-30 focus:border-current/50" />
        </div>
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Story / notes</label>
          <textarea bind:value={storyNotes} rows={4} placeholder="What's behind this piece? Cultural context, process, why it matters..." class="w-full resize-y border border-current/20 bg-transparent px-3 py-2 font-serif text-sm leading-relaxed outline-none placeholder:opacity-30 focus:border-current/50"></textarea>
        </div>
      {:else if activeMode === 'press'}
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Event / exhibit details</label>
          <textarea bind:value={pressDetails} rows={4} placeholder="What's the event, exhibit, or announcement? Include dates, venue, what the audience will experience..." class="w-full resize-y border border-current/20 bg-transparent px-3 py-2 font-serif text-sm leading-relaxed outline-none placeholder:opacity-30 focus:border-current/50"></textarea>
        </div>
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Museum / gallery write-up (optional)</label>
          <textarea bind:value={pressMuseumWriteup} rows={4} placeholder="Paste the institution's press release or write-up here. The agent will reference it — not copy it — and write your own version." class="w-full resize-y border border-current/20 bg-transparent px-3 py-2 font-serif text-sm leading-relaxed outline-none placeholder:opacity-30 focus:border-current/50"></textarea>
        </div>
      {/if}
    </div>

    <button onclick={handleSubmit} disabled={!canSubmit()} class="border border-current px-5 py-2 font-mono text-xs uppercase tracking-widest transition-opacity {canSubmit() ? 'opacity-70 hover:opacity-100' : 'cursor-not-allowed opacity-20'}">
      {loading ? 'Generating...' : 'Generate'}
    </button>

    {#if error}
      <div class="mt-4 border border-red-500/40 px-4 py-3 font-mono text-xs text-red-600 dark:text-red-400">{error}</div>
    {/if}

    {#if output}
      <div class="mt-8 border-t border-current/20 pt-6">
        <div class="mb-4 flex items-baseline justify-between">
          <span class="font-mono text-xs uppercase tracking-widest opacity-60">Output</span>
          <button onclick={copyOutput} class="border border-current/20 px-3 py-1 font-mono text-xs tracking-wide opacity-50 transition-opacity hover:opacity-100">
            {copied ? 'Copied' : 'Copy all'}
          </button>
        </div>
        {#each getOutputSections() as section}
          <div class="group relative mb-6">
            {#if section.title}
              <button onclick={() => copyText(section.body)} class="absolute right-0 top-0 border border-current/10 px-2 py-0.5 font-mono text-[10px] tracking-wide opacity-0 transition-opacity group-hover:opacity-50 hover:!opacity-100">Copy</button>
            {/if}
            <div class="whitespace-pre-wrap font-serif text-sm leading-loose">{section.body}</div>
          </div>
        {/each}
        {#if loading}
          <span class="inline-block animate-pulse font-mono text-xs opacity-40">...</span>
        {/if}
      </div>
    {/if}
  {/if}

  <!-- ==================== LISTING MODE ==================== -->
  {#if activeMode === 'listing'}
    {#if listingStep === 'input'}
      <div class="space-y-4">
        <!-- Image upload -->
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Photos (up to 5)</label>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            ondragover={(e) => e.preventDefault()}
            ondrop={handleImageDrop}
            class="flex min-h-32 flex-wrap items-center gap-3 border border-dashed border-current/30 p-4"
          >
            {#each listingImagePreviews as preview, i}
              <div class="group relative">
                <img src={preview} alt="Upload {i + 1}" class="h-24 w-24 object-cover" />
                <button
                  onclick={() => removeImage(i)}
                  class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-current font-mono text-xs text-white opacity-0 transition-opacity group-hover:opacity-80 dark:text-black"
                >x</button>
              </div>
            {/each}
            {#if listingImages.length < 5}
              <label class="flex h-24 w-24 cursor-pointer items-center justify-center border border-current/20 font-mono text-xs opacity-40 transition-opacity hover:opacity-70">
                + Add
                <input type="file" accept="image/*" multiple onchange={handleImageSelect} class="hidden" />
              </label>
            {/if}
            {#if listingImages.length === 0}
              <span class="font-mono text-xs opacity-30">Drop images here or click +</span>
            {/if}
          </div>
        </div>

        <!-- Title -->
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Title</label>
          <input type="text" bind:value={listingTitle} placeholder="Leave blank to let the agent suggest one" class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none placeholder:opacity-30 focus:border-current/50" />
        </div>

        <!-- Medium + Dimensions -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Medium</label>
            <input type="text" bind:value={listingMedium} list="medium-options" placeholder="Agent will estimate from photos" class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none placeholder:opacity-30 focus:border-current/50" />
            <datalist id="medium-options">
              {#each DEFAULT_MEDIUMS as m}
                <option value={m}></option>
              {/each}
            </datalist>
          </div>
          <div>
            <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Dimensions</label>
            <input type="text" bind:value={listingDimensions} placeholder='e.g. 24 x 36 — agent estimates if blank' class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none placeholder:opacity-30 focus:border-current/50" />
          </div>
        </div>

        <!-- Story -->
        <div>
          <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Story / notes (optional)</label>
          <textarea bind:value={listingStory} rows={3} placeholder="Skip it if you don't have it yet — the agent works with just the images" class="w-full resize-y border border-current/20 bg-transparent px-3 py-2 font-serif text-sm leading-relaxed outline-none placeholder:opacity-30 focus:border-current/50"></textarea>
        </div>

        <!-- Pricing weights -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Complexity</label>
            <div class="flex flex-wrap gap-0">
              {#each ['low', 'standard', 'high', 'exceptional'] as level, i}
                <button
                  onclick={() => (listingComplexity = level)}
                  class="border border-current/20 px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-opacity
                    {listingComplexity === level ? 'bg-current/10 opacity-100' : 'opacity-40 hover:opacity-70'}
                    {i > 0 ? 'border-l-0' : ''}"
                >{level}</button>
              {/each}
            </div>
          </div>
          <div>
            <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Cultural weight</label>
            <div class="flex flex-wrap gap-0">
              {#each ['standard', 'significant', 'central'] as level, i}
                <button
                  onclick={() => (listingCultural = level)}
                  class="border border-current/20 px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-opacity
                    {listingCultural === level ? 'bg-current/10 opacity-100' : 'opacity-40 hover:opacity-70'}
                    {i > 0 ? 'border-l-0' : ''}"
                >{level}</button>
              {/each}
            </div>
          </div>
          <div>
            <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Exhibition</label>
            <div class="flex flex-wrap gap-0">
              {#each ['none', 'group', 'solo', 'museum'] as level, i}
                <button
                  onclick={() => (listingExhibition = level)}
                  class="border border-current/20 px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-opacity
                    {listingExhibition === level ? 'bg-current/10 opacity-100' : 'opacity-40 hover:opacity-70'}
                    {i > 0 ? 'border-l-0' : ''}"
                >{level}</button>
              {/each}
            </div>
          </div>
        </div>

        <!-- Pricing config toggle -->
        <button
          onclick={() => (showPricingConfig = !showPricingConfig)}
          class="font-mono text-xs opacity-40 transition-opacity hover:opacity-70"
        >
          {showPricingConfig ? '- Hide' : '+'} Pricing config
        </button>

        {#if showPricingConfig}
          <div class="space-y-3 border border-current/10 p-4">
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {#each Object.entries(pricingConfig.mediumRates) as [med, rate]}
                <div>
                  <label class="block font-mono text-[10px] uppercase tracking-widest opacity-50">{med}</label>
                  <div class="flex items-center gap-1">
                    <span class="font-mono text-xs opacity-50">$</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={rate}
                      onchange={(e) => {
                        pricingConfig.mediumRates[med] = parseFloat((e.target as HTMLInputElement).value) || 0;
                        updatePricingConfig();
                      }}
                      class="w-16 border-b border-current/20 bg-transparent py-0.5 font-mono text-xs outline-none focus:border-current/50"
                    />
                    <span class="font-mono text-[10px] opacity-40">/sq in</span>
                  </div>
                </div>
              {/each}
            </div>
            <div class="flex flex-wrap gap-4">
              <div>
                <label class="block font-mono text-[10px] uppercase tracking-widest opacity-50">Career multiplier</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  bind:value={pricingConfig.careerMultiplier}
                  onchange={updatePricingConfig}
                  class="w-16 border-b border-current/20 bg-transparent py-0.5 font-mono text-xs outline-none focus:border-current/50"
                />
              </div>
              <div>
                <label class="block font-mono text-[10px] uppercase tracking-widest opacity-50">Minimum price</label>
                <div class="flex items-center gap-1">
                  <span class="font-mono text-xs opacity-50">$</span>
                  <input
                    type="number"
                    step="25"
                    min="0"
                    bind:value={pricingConfig.minimumPrice}
                    onchange={updatePricingConfig}
                    class="w-20 border-b border-current/20 bg-transparent py-0.5 font-mono text-xs outline-none focus:border-current/50"
                  />
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Submit -->
        <div class="pt-2">
          <button
            onclick={handleListingSubmit}
            disabled={!canSubmitListing()}
            class="border border-current px-5 py-2 font-mono text-xs uppercase tracking-widest transition-opacity
              {canSubmitListing() ? 'opacity-70 hover:opacity-100' : 'cursor-not-allowed opacity-20'}"
          >
            {loading ? 'Analyzing...' : 'Build Listing'}
          </button>
        </div>

        {#if error}
          <div class="border border-red-500/40 px-4 py-3 font-mono text-xs text-red-600 dark:text-red-400">{error}</div>
        {/if}
      </div>

    {:else if listingStep === 'review' && listingData}
      <!-- ==================== LISTING REVIEW ==================== -->
      <div class="space-y-6">
        <div class="flex items-baseline justify-between">
          <span class="font-mono text-xs uppercase tracking-widest opacity-60">Review Listing</span>
          <div class="flex gap-2">
            <button onclick={resetListing} class="border border-current/20 px-3 py-1 font-mono text-xs tracking-wide opacity-50 transition-opacity hover:opacity-100">Back</button>
            <button onclick={copyFullListing} class="border border-current/20 px-3 py-1 font-mono text-xs tracking-wide opacity-50 transition-opacity hover:opacity-100">
              {copied ? 'Copied' : 'Copy all'}
            </button>
          </div>
        </div>

        <!-- Images preview -->
        {#if listingImagePreviews.length}
          <div class="flex flex-wrap gap-2">
            {#each listingImagePreviews as preview, i}
              <img src={preview} alt="Listing {i + 1}" class="h-20 w-20 object-cover opacity-80" />
            {/each}
          </div>
        {/if}

        <!-- Missing info warnings -->
        {#if listingData.missingInfo.length > 0}
          <div class="border border-current/20 px-4 py-3">
            <span class="font-mono text-xs uppercase tracking-widest opacity-60">Agent needs confirmation</span>
            <ul class="mt-1 space-y-0.5">
              {#each listingData.missingInfo as info}
                <li class="font-serif text-sm opacity-70">- {info}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Editable fields -->
        <div class="space-y-4">
          <div>
            <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Title</label>
            <input type="text" bind:value={listingData.title} class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-lg font-bold outline-none focus:border-current/50" />
          </div>

          <div>
            <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Tagline</label>
            <input type="text" bind:value={listingData.tagline} class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm italic outline-none focus:border-current/50" />
          </div>

          <div>
            <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Description</label>
            <textarea bind:value={listingData.description} rows={6} class="w-full resize-y border border-current/20 bg-transparent px-3 py-2 font-serif text-sm leading-relaxed outline-none focus:border-current/50"></textarea>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Medium</label>
              <input type="text" bind:value={listingMedium} onchange={computePricing} class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none focus:border-current/50" />
            </div>
            <div>
              <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Dimensions</label>
              <input type="text" bind:value={listingDimensions} onchange={computePricing} class="w-full border border-current/20 bg-transparent px-3 py-2 font-serif text-sm outline-none focus:border-current/50" />
            </div>
          </div>

          <div>
            <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Tags</label>
            <input type="text" value={listingData.tags.join(', ')} onchange={(e) => { listingData!.tags = (e.target as HTMLInputElement).value.split(',').map(t => t.trim()).filter(Boolean); }} class="w-full border border-current/20 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-current/50" />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">SEO title</label>
              <input type="text" bind:value={listingData.seoTitle} class="w-full border border-current/20 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-current/50" />
            </div>
            <div>
              <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">SEO description</label>
              <input type="text" bind:value={listingData.seoDescription} class="w-full border border-current/20 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-current/50" />
            </div>
          </div>

          <div>
            <label class="mb-1 block font-mono text-xs uppercase tracking-widest opacity-60">Price anchor copy</label>
            <textarea bind:value={listingData.priceAnchorCopy} rows={3} class="w-full resize-y border border-current/20 bg-transparent px-3 py-2 font-serif text-sm leading-relaxed outline-none focus:border-current/50"></textarea>
          </div>
        </div>

        <!-- Pricing -->
        <div class="border-t border-current/20 pt-4">
          <span class="font-mono text-xs uppercase tracking-widest opacity-60">Pricing</span>
          {#if pricingResult}
            <div class="mt-2">
              <span class="font-serif text-3xl font-bold">${pricingResult.suggestedPrice}</span>
              <p class="mt-1 font-mono text-[10px] leading-relaxed opacity-50">{pricingResult.breakdown}</p>
            </div>
          {:else}
            <p class="mt-2 font-mono text-xs opacity-40">Enter dimensions as "W x H" to calculate pricing</p>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
