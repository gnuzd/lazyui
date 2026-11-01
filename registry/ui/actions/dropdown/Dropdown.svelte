<script lang="ts" generics="T">
  import type { Snippet } from "svelte";
  import { fly, fade } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { Search, X, ChevronDown, Check, Loader2 } from "@lucide/svelte";

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

  type Props<T> = {
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
    classes?: Record<string, string>;
    vars?: Record<string, string>;
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
    id = `dropdown-${Math.random().toString(36).slice(2, 9)}`,
    name,
  }: Props<T> = $props();

  let open = $state(false);
  let query = $state("");
  let highlighted = $state(0);
  let loading = $state(false);
  let loadingMore = $state(false);
  let error = $state<string | null>(null);
  let fetched = $state<Option<T>[]>([]);
  let total = $state<number | undefined>(undefined);
  let hasMore = $state(false);
  let page = $state(0);

  let rootEl: HTMLDivElement | null = $state(null);
  let triggerEl: HTMLElement | null = $state(null);
  let panelEl: HTMLDivElement | null = $state(null);
  let searchEl: HTMLInputElement | null = $state(null);
  let listEl: HTMLDivElement | null = $state(null);

  let placement = $state<"bottom" | "top">("bottom");
  let dynamicMaxHeight = $state(panelMaxHeight);
  let triggerRect = $state({ top: 0, bottom: 0, left: 0, width: 0 });

  const isMulti = $derived(multiple);
  const selectedValues = $derived<T[]>(
    value == null ? [] : Array.isArray(value) ? value : [value],
  );
  const sourceOptions = $derived(fetchOptions ? fetched : options);

  const filteredOptions = $derived(
    fetchOptions || !searchable || !query
      ? sourceOptions
      : sourceOptions.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase()),
        ),
  );

  const selectedOptions = $derived(
    sourceOptions.filter((o) => selectedValues.includes(o.value)),
  );
  const hasSelection = $derived(selectedValues.length > 0);
  const visibleOptions = $derived(selectedOptions.slice(0, maxVisibleChips));
  const hiddenCount = $derived(
    Math.max(0, selectedOptions.length - maxVisibleChips),
  );

  const varsStyle = $derived(
    Object.entries(vars)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; "),
  );
  const panelStyle = $derived(
    `left: ${triggerRect.left}px; width: ${triggerRect.width}px; max-height: ${dynamicMaxHeight}px; ${
      placement === "bottom"
        ? `top: ${triggerRect.bottom + 4}px`
        : `bottom: ${window.innerHeight - triggerRect.top + 4}px`
    }`,
  );

  const debounce = <A extends any[]>(fn: (...args: A) => void, ms: number) => {
    let t: ReturnType<typeof setTimeout>;
    return (...args: A) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  let abortController: AbortController | null = null;

  async function loadOptions(q: string, pageToLoad = 0, append = false) {
    if (!fetchOptions) return;
    abortController?.abort();
    abortController = new AbortController();
    if (append) loadingMore = true;
    else loading = true;
    error = null;
    try {
      const raw = await fetchOptions({
        query: q,
        signal: abortController.signal,
        page: pageToLoad,
        pageSize,
      });
      const result = Array.isArray(raw)
        ? { options: raw, hasMore: false }
        : raw;
      fetched = append ? [...fetched, ...result.options] : result.options;
      total = result.total;
      hasMore = result.hasMore ?? false;
      page = pageToLoad;
    } catch (e: any) {
      if (e?.name !== "AbortError") error = e?.message ?? "Error";
    } finally {
      loading = false;
      loadingMore = false;
    }
  }

  const debouncedLoad = debounce((q: string) => loadOptions(q, 0), debounceMs);

  function onListScroll() {
    if (!paginate || !hasMore || loadingMore || !listEl) return;
    const { scrollTop, scrollHeight, clientHeight } = listEl;
    if (scrollHeight - scrollTop - clientHeight < 40)
      loadOptions(query, page + 1, true);
  }

  function updatePosition() {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const vh = window.innerHeight,
      spaceBelow = vh - rect.bottom,
      spaceAbove = rect.top,
      margin = 8;
    triggerRect = {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
    };
    if (spaceBelow < panelMaxHeight + margin && spaceAbove > spaceBelow) {
      placement = "top";
      dynamicMaxHeight = Math.min(panelMaxHeight, spaceAbove - margin);
    } else {
      placement = "bottom";
      dynamicMaxHeight = Math.min(panelMaxHeight, spaceBelow - margin);
    }
  }

  function openDropdown() {
    if (disabled) return;
    open = true;
    query = "";
    highlighted = 0;
    if (fetchOptions && fetched.length === 0) loadOptions("", 0);
    queueMicrotask(() => {
      updatePosition();
      if (searchable) searchEl?.focus();
    });
  }

  function closeDropdown() {
    open = false;
    query = "";
    abortController?.abort();
  }
  function toggle() {
    open ? closeDropdown() : openDropdown();
  }

  function select(option: Option<T>) {
    if (option.disabled) return;
    if (isMulti) {
      const next = selectedValues.includes(option.value)
        ? selectedValues.filter((v) => v !== option.value)
        : [...selectedValues, option.value];
      value = next;
      onchange?.(next);
    } else {
      value = option.value;
      onchange?.(option.value);
      closeDropdown();
      triggerEl?.focus();
    }
  }

  function clear(e: MouseEvent) {
    e.stopPropagation();
    value = isMulti ? [] : null;
    onchange?.(value);
    closeDropdown();
  }
  function removeValue(v: T, e: MouseEvent) {
    e.stopPropagation();
    const next = selectedValues.filter((x) => x !== v);
    value = next;
    onchange?.(next);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      closeDropdown();
      triggerEl?.focus();
      return;
    }
    if (
      !open &&
      (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")
    ) {
      e.preventDefault();
      openDropdown();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlighted = Math.min(highlighted + 1, filteredOptions.length - 1);
      scrollHighlightedIntoView();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlighted = Math.max(highlighted - 1, 0);
      scrollHighlightedIntoView();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filteredOptions[highlighted];
      if (opt) select(opt);
    } else if (e.key === "Tab") closeDropdown();
  }

  function scrollHighlightedIntoView() {
    queueMicrotask(() =>
      panelEl
        ?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)
        ?.scrollIntoView({ block: "nearest" }),
    );
  }

  function onSearchInput(e: Event) {
    const q = (e.target as HTMLInputElement).value;
    query = q;
    highlighted = 0;
    if (fetchOptions) debouncedLoad(q);
  }

  $effect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !triggerEl?.contains(t) &&
        !panelEl?.contains(t) &&
        !rootEl?.contains(t)
      )
        closeDropdown();
    };
    const onScroll = () => updatePosition();
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  });

  $effect(() => {
    filteredOptions;
    if (highlighted >= filteredOptions.length) highlighted = 0;
  });
</script>

<div
  bind:this={rootEl}
  class="dropdown-root {classes.root ?? ''}"
  class:disabled
  class:open
  style={varsStyle}
>
  {#if label}<label class="dropdown-label {classes.label ?? ''}" for={id}
      >{label}</label
    >{/if}
  {#if name && !isMulti}<input type="hidden" {name} value={value ?? ""} />{/if}

  {#if trigger}
    <div
      bind:this={triggerEl}
      class="custom-trigger-wrapper {classes.trigger ?? ''}"
      tabindex="-1"
    >
      {@render trigger({ open, disabled, toggle })}
    </div>
  {:else}
    <button
      bind:this={triggerEl}
      {id}
      type="button"
      class="dropdown-trigger {classes.trigger ?? ''}"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls="{id}-panel"
      {disabled}
      onclick={toggle}
      onkeydown={onKeydown}
    >
      <div class="dropdown-value {classes.value ?? ''}">
        {#if hasSelection}
          {#if renderValue}
            {@render renderValue(selectedOptions)}
          {:else if isMulti}
            <div class="dropdown-chips {classes.chips ?? ''}">
              {#each visibleOptions as opt}
                <span class="dropdown-chip {classes.chip ?? ''}">
                  {opt.label}
                  <span
                    role="button"
                    tabindex="-1"
                    class="dropdown-chip-x"
                    aria-label="Remove {opt.label}"
                    onclick={(e) => removeValue(opt.value, e)}
                    onkeydown={(e) =>
                      e.key === "Enter" && removeValue(opt.value, e as any)}
                  >
                    <X size={12} strokeWidth={2.5} />
                  </span>
                </span>
              {/each}
              {#if hiddenCount > 0}<span
                  class="dropdown-chip dropdown-chip-more">+{hiddenCount}</span
                >{/if}
            </div>
          {:else}
            <span class="dropdown-single">{selectedOptions[0]?.label}</span>
          {/if}
        {:else}
          <span class="dropdown-placeholder {classes.placeholder ?? ''}"
            >{placeholder}</span
          >
        {/if}
      </div>
      <div class="dropdown-actions {classes.actions ?? ''}">
        {#if clearable && hasSelection && !disabled}
          <span
            role="button"
            tabindex="-1"
            class="dropdown-clear {classes.clear ?? ''}"
            aria-label="Clear"
            onclick={clear}
            onkeydown={(e) => e.key === "Enter" && clear(e as any)}
          >
            <X size={14} strokeWidth={2} />
          </span>
        {/if}
        <ChevronDown
          size={14}
          strokeWidth={2}
          class="dropdown-chevron {classes.chevron ?? ''} {open
            ? 'rotate'
            : ''}"
        />
      </div>
    </button>
  {/if}

  {#if open}
    <div
      bind:this={panelEl}
      id="{id}-panel"
      class="dropdown-panel {classes.panel ?? ''}"
      class:bottom={placement === "bottom"}
      class:top={placement === "top"}
      role="listbox"
      aria-multiselectable={isMulti}
      style={panelStyle}
      transition:fly={{
        y: placement === "bottom" ? -6 : 6,
        duration: 150,
        easing: cubicOut,
      }}
    >
      {#if searchable}
        <div class="dropdown-search {classes.search ?? ''}">
          <Search size={14} strokeWidth={2} aria-hidden="true" />
          <input
            bind:this={searchEl}
            type="text"
            placeholder="Search…"
            value={query}
            oninput={onSearchInput}
            onkeydown={onKeydown}
            aria-label="Search options"
          />
        </div>
      {/if}

      <div
        bind:this={listEl}
        class="dropdown-list {classes.list ?? ''}"
        onscroll={onListScroll}
      >
        {#if loading}
          <div
            class="dropdown-state {classes.state ?? ''}"
            transition:fade={{ duration: 120 }}
          >
            {loadingText}
          </div>
        {:else if error}
          <div
            class="dropdown-state dropdown-error {classes.state ?? ''}"
            transition:fade={{ duration: 120 }}
          >
            {errorText}
          </div>
        {:else if filteredOptions.length === 0}
          <div
            class="dropdown-state {classes.state ?? ''}"
            transition:fade={{ duration: 120 }}
          >
            {emptyText}
          </div>
        {:else}
          {#each filteredOptions as opt, i (opt.value)}
            {@const selected = selectedValues.includes(opt.value)}
            <div
              data-index={i}
              class="dropdown-option {classes.option ?? ''}"
              class:highlighted={i === highlighted}
              class:selected
              class:disabled={opt.disabled}
              role="option"
              aria-selected={selected}
              aria-disabled={opt.disabled}
              tabindex="-1"
              onclick={() => select(opt)}
              onmouseenter={() => (highlighted = i)}
              onkeydown={(e) => e.key === "Enter" && select(opt)}
            >
              {#if renderOption}
                {@render renderOption(opt, selected)}
              {:else}
                <div class="dropdown-option-main">
                  <span
                    class="dropdown-option-label {classes.optionLabel ?? ''}"
                    >{opt.label}</span
                  >
                  {#if opt.description}<span
                      class="dropdown-option-desc {classes.optionDesc ?? ''}"
                      >{opt.description}</span
                    >{/if}
                </div>
                {#if selected}<Check
                    size={14}
                    strokeWidth={2.5}
                    class="dropdown-check"
                  />{/if}
              {/if}
            </div>
          {/each}
          {#if loadingMore}<div class="dropdown-state {classes.state ?? ''}">
              <Loader2 size={14} class="spin" /> Loading…
            </div>{/if}
        {/if}
      </div>

      {#if paginate && total !== undefined}
        <div class="dropdown-footer {classes.footer ?? ''}">
          Showing {fetched.length} of {total}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .dropdown-root {
    position: relative;
    display: block;
    color: var(--color-base-content, #0f172a);
    font-family: inherit;

    /* Local overrides mapped directly to theme */
    --dd-bg: var(--color-base-100, #fff);
    --dd-bg-2: var(--color-base-200, #f1f2f5);
    --dd-ink: var(--color-base-content, #0f172a);
    --dd-ink-2: color-mix(
      in oklch,
      var(--color-base-content, #0f172a) 60%,
      transparent
    );
    --dd-line: var(--color-base-300, #e5e7eb);
    --dd-accent: var(--color-primary, #2563eb);
    --dd-accent-soft: color-mix(
      in oklch,
      var(--color-primary, #2563eb) 15%,
      transparent
    );
    --dd-radius: var(--radius-field, 1rem);
    --dd-shadow: 0 10px 30px rgb(0 0 0 / 0.15), 0 2px 6px rgb(0 0 0 / 0.08);
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
    font-size: 12px;
    font-weight: 600;
    color: var(--dd-ink-2);
    margin-bottom: 6px;
  }

  .dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 40px;
    padding: 0 12px;
    box-sizing: border-box;
    background: var(--dd-bg);
    border: 1px solid var(--dd-line);
    border-radius: var(--dd-radius);
    color: var(--dd-ink);
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
    border-color: var(--dd-accent);
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--dd-accent) 25%, transparent);
  }
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

  .dropdown-chips {
    display: flex;
    flex-wrap: nowrap;
    gap: 4px;
    overflow: hidden;
    max-width: 100%;
    align-items: center;
  }
  .dropdown-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px 2px 8px;
    background: var(--dd-accent-soft);
    color: var(--dd-ink);
    border-radius: 6px;
    font-size: 12px;
    max-width: 100%;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .dropdown-chip-x {
    display: inline-grid;
    place-items: center;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    cursor: pointer;
    opacity: 0.7;
    color: currentColor;
  }
  .dropdown-chip-x:hover {
    background: color-mix(in oklch, var(--dd-ink) 10%, transparent);
    opacity: 1;
  }
  .dropdown-chip-more {
    background: var(--dd-bg-2);
    color: var(--dd-ink-2);
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }

  .dropdown-actions {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--dd-ink-2);
  }
  .dropdown-clear {
    display: inline-grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
  }
  .dropdown-clear:hover {
    background: var(--dd-bg-2);
    color: var(--dd-ink);
  }

  .dropdown-chevron {
    transition: transform 0.15s;
  }
  .dropdown-chevron.rotate {
    transform: rotate(180deg);
  }

  .dropdown-panel {
    position: fixed;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    background: var(--dd-bg);
    border: 1px solid var(--dd-line);
    border-radius: var(--dd-radius);
    box-shadow: var(--dd-shadow);
    overflow: hidden;
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
    border: none;
    background: transparent;
    color: var(--dd-ink);
    font-size: 13px;
    outline: none;
    min-width: 0;
  }
  .dropdown-search input::placeholder {
    color: var(--dd-ink-2);
  }

  .dropdown-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
    overscroll-behavior: contain;
  }

  .dropdown-state {
    padding: 16px;
    text-align: center;
    font-size: 12px;
    color: var(--dd-ink-2);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .dropdown-error {
    color: var(--color-error, #dc2626);
  }

  .dropdown-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.1s;
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
    color: var(--dd-ink-2);
  }
  .dropdown-check {
    color: var(--dd-accent);
    flex-shrink: 0;
  }

  .dropdown-footer {
    padding: 8px 12px;
    border-top: 1px solid var(--dd-line);
    font-size: 11px;
    color: var(--dd-ink-2);
    text-align: center;
  }

  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
