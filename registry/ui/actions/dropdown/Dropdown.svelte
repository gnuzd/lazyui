<script lang="ts" module>
  export type Option<T> = {
    value: T;
    label: string;
    disabled?: boolean;
    description?: string;
  };
  export type FetchContext = {
    query: string;
    signal: AbortSignal;
    page: number;
    pageSize: number;
  };
  export type FetchResult<T> =
    | Option<T>[]
    | { options: Option<T>[]; total?: number; hasMore?: boolean };

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
  }
</script>

<script lang="ts" generics="T">
  import { tick, type Snippet } from "svelte";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { Search, X, ChevronDown, Check, Loader2 } from "@lucide/svelte";

  type Props = {
    options?: Option<T>[];
    fetchOptions?: (ctx: FetchContext) => Promise<FetchResult<T>>;
    multiple?: boolean;
    value?: T | T[] | null;
    onchange?: (value: T | T[] | null) => void;
    placeholder?: string;
    label?: string;
    emptyText?: string;
    loadingText?: string;
    errorText?: string;
    searchable?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    debounceMs?: number;
    panelMaxHeight?: number;
    maxVisibleChips?: number;
    paginate?: boolean;
    pageSize?: number;
    trigger?: Snippet<
      [{ open: boolean; disabled: boolean; toggle: () => void }]
    >;
    renderOption?: Snippet<[Option<T>, boolean]>;
    renderValue?: Snippet<[Option<T>[]]>;
    classes?: Record<string, string>; // per-part class overrides
    vars?: Record<string, string>; // CSS variable overrides
    id?: string;
    name?: string;
  };

  let {
    options = [],
    fetchOptions,
    multiple = false,
    value = $bindable(null),
    onchange,
    placeholder = "Select…",
    label,
    emptyText = "No results",
    loadingText = "Loading…",
    errorText = "Failed to load",
    searchable = false,
    clearable = true,
    disabled = false,
    debounceMs = 250,
    panelMaxHeight = 280,
    maxVisibleChips = 2,
    paginate = false,
    pageSize = 20,
    trigger,
    renderOption,
    renderValue,
    classes = {},
    vars = {},
    id: idProp,
    name,
  }: Props = $props();

  // SSR-safe unique id (Math.random would cause hydration mismatches)
  const uid = $props.id();
  const id = $derived(idProp ?? `dropdown-${uid}`);

  // ===== State =====
  let open = $state(false);
  let query = $state("");
  let highlighted = $state(0);
  let loading = $state(false);
  let loadingMore = $state(false);
  let error = $state<string | null>(null);
  let fetched = $state.raw<Option<T>[]>([]); // .raw: no deep proxies, keeps object identity for T
  let total = $state<number>();
  let hasMore = $state(false);
  let placement = $state<"top" | "bottom">("bottom");
  let panelStyle = $state("");

  let rootEl = $state<HTMLElement>();
  let triggerEl = $state<HTMLElement>();
  let panelEl = $state<HTMLElement>();
  let searchEl = $state<HTMLInputElement>();
  let listEl = $state<HTMLElement>();

  // Non-reactive bookkeeping
  let page = 0;
  let fetchedQuery: string | null = null; // query that produced `fetched`
  let ctrl: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let picked: Option<T>[] = []; // remembers chosen options so labels survive filtering/pagination

  // ===== Derived =====
  const source = $derived(fetchOptions ? fetched : options);
  const selected = $derived<T[]>(
    value == null ? [] : Array.isArray(value) ? value : [value],
  );
  const selectedSet = $derived(new Set(selected)); // O(1) lookups per option
  const q = $derived(query.trim().toLowerCase());
  // Remote results are already filtered by the server
  const filtered = $derived(
    fetchOptions || !searchable || !q
      ? source
      : source.filter((o) => o.label.toLowerCase().includes(q)),
  );
  const selectedOptions = $derived(
    selected
      .map(
        (v) =>
          source.find((o) => o.value === v) ??
          picked.find((o) => o.value === v),
      )
      .filter((o): o is Option<T> => !!o),
  );
  const varsStyle = $derived(
    Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(";"),
  );

  // ===== Positioning =====
  // Flip above when there's no room below; anchor left or right by screen half.
  function place() {
    if (!triggerEl) return;
    const r = triggerEl.getBoundingClientRect();
    const gap = 8;
    const vw = innerWidth;
    const vh = innerHeight;
    const below = vh - r.bottom - gap;
    const above = r.top - gap;
    const flip = below < panelMaxHeight && above > below;
    const alignRight = r.left + r.width / 2 > vw / 2;

    placement = flip ? "top" : "bottom";
    panelStyle = [
      flip ? `bottom:${vh - r.top + 4}px` : `top:${r.bottom + 4}px`,
      alignRight ? `right:${vw - r.right}px` : `left:${r.left}px`,
      `min-width:${r.width}px`,
      `max-width:${alignRight ? r.right - gap : vw - r.left - gap}px`,
      `max-height:${Math.min(panelMaxHeight, flip ? above : below)}px`,
    ].join(";");
  }

  // ===== Data loading =====
  async function load(q: string, p = 0, append = false) {
    if (!fetchOptions) return;
    ctrl?.abort(); // cancel the previous in-flight request
    const c = (ctrl = new AbortController());
    if (append) loadingMore = true;
    else loading = true;
    error = null;
    try {
      const raw = await fetchOptions({
        query: q,
        signal: c.signal,
        page: p,
        pageSize,
      });
      if (c.signal.aborted) return; // stale response, drop it
      const r = Array.isArray(raw)
        ? { options: raw, total: undefined, hasMore: false }
        : raw;
      fetched = append ? [...fetched, ...r.options] : r.options;
      total = r.total;
      hasMore = r.hasMore ?? false;
      page = p;
      fetchedQuery = q;
    } catch (e: any) {
      if (!c.signal.aborted) error = e?.message ?? "Error";
    } finally {
      // Only the latest request may clear the loading flags
      if (ctrl === c) loading = loadingMore = false;
    }
  }

  function onScroll() {
    if (!paginate || !hasMore || loadingMore || !listEl) return;
    const { scrollTop, scrollHeight, clientHeight } = listEl;
    if (scrollHeight - scrollTop - clientHeight < 40)
      load(query, page + 1, true);
  }

  function onSearch() {
    highlighted = 0;
    if (!fetchOptions) return;
    clearTimeout(timer);
    timer = setTimeout(() => load(query), debounceMs); // debounce remote search
  }

  // ===== Actions =====
  async function show() {
    if (disabled) return;
    place(); // position before first paint
    open = true;
    query = "";
    highlighted = 0;
    // Reload when the cached results came from a non-empty search
    if (fetchOptions && fetchedQuery !== "") load("");
    await tick();
    searchEl?.focus();
  }

  function hide() {
    open = false;
    query = "";
    ctrl?.abort();
  }

  const toggle = () => (open ? hide() : show());

  // Single source of truth for value updates
  function setValue(next: T[]) {
    value = multiple ? next : (next[0] ?? null);
    onchange?.(value);
  }

  function select(o: Option<T>) {
    if (o.disabled) return;
    if (!multiple) {
      picked = [o];
      setValue([o.value]);
      hide();
      triggerEl?.focus();
    } else if (selectedSet.has(o.value)) {
      setValue(selected.filter((v) => v !== o.value));
    } else {
      picked.push(o);
      setValue([...selected, o.value]);
    }
  }

  function remove(v: T, e: MouseEvent) {
    e.stopPropagation(); // don't toggle the dropdown
    setValue(selected.filter((x) => x !== v));
  }

  function clear(e: MouseEvent) {
    e.stopPropagation();
    setValue([]);
    hide();
  }

  // Shared by the trigger and the search input.
  // Enter/Space on the closed trigger are left to the native click.
  async function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      hide();
      triggerEl?.focus();
    } else if (!open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        show();
      }
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      highlighted = Math.max(
        0,
        Math.min(filtered.length - 1, highlighted + step),
      );
      await tick();
      panelEl
        ?.querySelector(`[data-index="${highlighted}"]`)
        ?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) select(filtered[highlighted]);
    } else if (e.key === "Tab") {
      hide();
    } else if (e.key === "Backspace" && multiple && !query && selected.length) {
      setValue(selected.slice(0, -1)); // remove the last chip
    }
  }

  // ===== Effects =====
  // While open: close on outside click, reposition on scroll/resize.
  // One AbortController tears down every listener at once.
  $effect(() => {
    if (!open) return;
    const ac = new AbortController();
    const { signal } = ac;
    addEventListener(
      "mousedown",
      (e) => {
        const t = e.target as Node;
        if (!rootEl?.contains(t) && !panelEl?.contains(t)) hide();
      },
      { signal },
    );
    addEventListener("scroll", place, { signal, capture: true, passive: true });
    addEventListener("resize", place, { signal });
    return () => ac.abort();
  });

  // Cleanup on destroy
  $effect(() => () => {
    clearTimeout(timer);
    ctrl?.abort();
  });
</script>

<div
  bind:this={rootEl}
  class={["dropdown-root", classes.root]}
  class:disabled
  class:open
  style={varsStyle}
>
  {#if label}
    <label class={["dropdown-label", classes.label]} for={id}>{label}</label>
  {/if}

  <!-- One hidden input per value so forms work in both modes -->
  {#if name}
    {#each selected as v}<input type="hidden" {name} value={v as any} />{/each}
  {/if}

  {#if trigger}
    <div
      bind:this={triggerEl}
      class={["custom-trigger-wrapper", classes.trigger]}
      tabindex="-1"
    >
      {@render trigger({ open, disabled, toggle })}
    </div>
  {:else}
    <button
      bind:this={triggerEl}
      {id}
      type="button"
      class={["dropdown-trigger", classes.trigger]}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls="{id}-panel"
      {disabled}
      onclick={toggle}
      onkeydown={onKeydown}
    >
      <span class={["dropdown-value", classes.value]}>
        {#if !selectedOptions.length}
          <span class={["dropdown-placeholder", classes.placeholder]}
            >{placeholder}</span
          >
        {:else if renderValue}
          {@render renderValue(selectedOptions)}
        {:else if multiple}
          <span class={["dropdown-chips", classes.chips]}>
            {#each selectedOptions.slice(0, maxVisibleChips) as o (o.value)}
              <span class={["dropdown-chip", classes.chip]}>
                {o.label}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <span
                  role="button"
                  tabindex="-1"
                  class="dropdown-chip-x"
                  aria-label="Remove {o.label}"
                  onclick={(e) => remove(o.value, e)}
                >
                  <X size={12} strokeWidth={2.5} />
                </span>
              </span>
            {/each}
            {#if selectedOptions.length > maxVisibleChips}
              <span class="dropdown-chip dropdown-chip-more">
                +{selectedOptions.length - maxVisibleChips}
              </span>
            {/if}
          </span>
        {:else}
          <span class="dropdown-single">{selectedOptions[0].label}</span>
        {/if}
      </span>

      <span class={["dropdown-actions", classes.actions]}>
        {#if clearable && selected.length && !disabled}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <span
            role="button"
            tabindex="-1"
            class={["dropdown-clear", classes.clear]}
            aria-label="Clear"
            onclick={clear}
          >
            <X size={14} strokeWidth={2} />
          </span>
        {/if}
        <!-- Wrapped in a span: scoped CSS can't reach classes passed to child components -->
        <span class={["dropdown-chevron", classes.chevron]} class:rotate={open}>
          <ChevronDown size={14} strokeWidth={2} />
        </span>
      </span>
    </button>
  {/if}

  {#if open}
    <div
      use:portal
      bind:this={panelEl}
      class={["dropdown-panel", classes.panel]}
      style="{varsStyle};{panelStyle}"
      transition:fly={{
        y: placement === "bottom" ? -6 : 6,
        duration: 150,
        easing: cubicOut,
      }}
    >
      {#if searchable}
        <label class={["dropdown-search", classes.search]}>
          <Search size={14} strokeWidth={2} aria-hidden="true" />
          <input
            bind:this={searchEl}
            bind:value={query}
            oninput={onSearch}
            onkeydown={onKeydown}
            type="text"
            placeholder="Search…"
            aria-label="Search options"
          />
        </label>
      {/if}

      <div
        bind:this={listEl}
        id="{id}-panel"
        role="listbox"
        aria-multiselectable={multiple}
        class={["dropdown-list", classes.list]}
        onscroll={onScroll}
      >
        {#if loading}
          <div class={["dropdown-state", classes.state]}>{loadingText}</div>
        {:else if error}
          <div class={["dropdown-state dropdown-error", classes.state]}>
            {errorText}
          </div>
        {:else if !filtered.length}
          <div class={["dropdown-state", classes.state]}>{emptyText}</div>
        {:else}
          {#each filtered as opt, i (opt.value)}
            {@const isSelected = selectedSet.has(opt.value)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
              data-index={i}
              class={[
                "dropdown-option",
                classes.option,
                {
                  highlighted: i === highlighted,
                  selected: isSelected,
                  disabled: opt.disabled,
                },
              ]}
              role="option"
              tabindex="-1"
              aria-selected={isSelected}
              aria-disabled={opt.disabled}
              onclick={() => select(opt)}
              onmouseenter={() => (highlighted = i)}
            >
              {#if renderOption}
                {@render renderOption(opt, isSelected)}
              {:else}
                <span class="dropdown-option-main">
                  <span class={["dropdown-option-label", classes.optionLabel]}
                    >{opt.label}</span
                  >
                  {#if opt.description}
                    <span class={["dropdown-option-desc", classes.optionDesc]}
                      >{opt.description}</span
                    >
                  {/if}
                </span>
                <!-- Icon inherits the accent color from .selected via currentColor -->
                {#if isSelected}<Check size={14} strokeWidth={2.5} />{/if}
              {/if}
            </div>
          {/each}
          {#if loadingMore}
            <div class={["dropdown-state", classes.state]}>
              <span class="spin"><Loader2 size={14} /></span>
              {loadingText}
            </div>
          {/if}
        {/if}
      </div>

      {#if paginate && total !== undefined}
        <div class={["dropdown-footer", classes.footer]}>
          Showing {fetched.length} of {total}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Tokens are declared on both the root and the portaled panel.
     Note: the panel lives in <body>, so set data-theme on <html> or <body>,
     not on a wrapper div. */
  .dropdown-root,
  .dropdown-panel {
    --dd-bg: var(--color-base-100, #fff);
    --dd-bg-2: var(--color-base-200, #f1f2f5);
    --dd-ink: var(--color-base-content, #0f172a);
    --dd-ink-2: color-mix(in oklch, var(--dd-ink) 60%, transparent);
    --dd-line: var(--color-base-300, #e5e7eb);
    --dd-accent: var(--color-primary, #2563eb);
    --dd-radius: var(--radius-field, 1rem);
  }

  .dropdown-root {
    position: relative;
    display: block;
    color: var(--dd-ink);
  }
  .dropdown-root.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
  .custom-trigger-wrapper {
    display: inline-block;
    width: 100%;
    outline: none;
  }
  .dropdown-label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--dd-ink-2);
  }

  /* ----- Trigger ----- */
  .dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    box-sizing: border-box;
    width: 100%;
    height: 40px;
    padding: 0 12px;
    background: var(--dd-bg);
    border: 1px solid var(--dd-line);
    border-radius: var(--dd-radius);
    color: var(--dd-ink);
    font: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .dropdown-trigger:hover {
    border-color: color-mix(in oklch, var(--dd-accent) 40%, var(--dd-line));
  }
  .dropdown-trigger:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--dd-accent) 25%, transparent);
  }
  .dropdown-trigger:focus-visible,
  .dropdown-root.open .dropdown-trigger {
    border-color: var(--dd-accent);
  }

  .dropdown-value {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
  }
  .dropdown-placeholder {
    color: var(--dd-ink-2);
  }
  .dropdown-single {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ----- Chips ----- */
  .dropdown-chips {
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    overflow: hidden;
  }
  .dropdown-chip {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    gap: 4px;
    padding: 2px 4px 2px 8px;
    border-radius: 6px;
    background: color-mix(in oklch, var(--dd-accent) 15%, transparent);
    font-size: 12px;
    white-space: nowrap;
  }
  .dropdown-chip-more {
    padding: 2px 6px;
    background: var(--dd-bg-2);
    color: var(--dd-ink-2);
    font-size: 11px;
    font-weight: 600;
  }
  .dropdown-chip-x,
  .dropdown-clear {
    display: inline-grid;
    place-items: center;
    border-radius: 4px;
    cursor: pointer;
  }
  .dropdown-chip-x {
    width: 16px;
    height: 16px;
    opacity: 0.7;
  }
  .dropdown-chip-x:hover {
    opacity: 1;
    background: color-mix(in oklch, var(--dd-ink) 10%, transparent);
  }
  .dropdown-clear {
    width: 20px;
    height: 20px;
  }
  .dropdown-clear:hover {
    background: var(--dd-bg-2);
    color: var(--dd-ink);
  }

  .dropdown-actions {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--dd-ink-2);
  }
  .dropdown-chevron {
    display: inline-flex;
    transition: transform 0.15s;
  }
  .dropdown-chevron.rotate {
    transform: rotate(180deg);
  }

  /* ----- Panel ----- */
  .dropdown-panel {
    position: fixed;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    width: max-content;
    overflow: hidden;
    background: var(--dd-bg);
    color: var(--dd-ink);
    border: 1px solid var(--dd-line);
    border-radius: var(--dd-radius);
    box-shadow:
      0 10px 30px rgb(0 0 0 / 0.15),
      0 2px 6px rgb(0 0 0 / 0.08);
    font-size: 13px;
  }
  .dropdown-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--dd-line);
    color: var(--dd-ink-2);
  }
  .dropdown-search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--dd-ink);
    font: inherit;
  }
  .dropdown-search input::placeholder {
    color: var(--dd-ink-2);
  }
  .dropdown-list {
    flex: 1;
    padding: 4px;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .dropdown-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 16px;
    font-size: 12px;
    color: var(--dd-ink-2);
  }
  .dropdown-error {
    color: var(--color-error, #dc2626);
  }

  /* ----- Options ----- */
  .dropdown-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
  }
  .dropdown-option.highlighted {
    background: var(--dd-bg-2);
  }
  .dropdown-option.selected {
    color: var(--dd-accent);
    font-weight: 500;
  }
  .dropdown-option.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .dropdown-option-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .dropdown-option-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dropdown-option-desc {
    font-size: 11px;
    font-weight: 400;
    color: var(--dd-ink-2);
  }
  .dropdown-footer {
    padding: 8px 12px;
    border-top: 1px solid var(--dd-line);
    font-size: 11px;
    color: var(--dd-ink-2);
    text-align: center;
  }

  .spin {
    display: inline-flex;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
