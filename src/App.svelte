<script lang="ts">
  import Dropdown from "../registry/ui/actions/dropdown/Dropdown.svelte";
  import ModalContainer from "../registry/ui/actions//modal/ModalContainer.svelte"; // Adjust path

  // ==========================================
  // 1. THEME CONFIG & PERSISTENCE
  // ==========================================
  const themes = ["lazyui", "dracula", "nord", "cupcake", "synthwave"] as const;
  const themeOptions = themes.map((t) => ({ value: t, label: t }));
  const THEME_KEY = "ui-preview-theme";

  let theme = $state<string>(themes[0]);

  // Load theme from localStorage on mount
  $effect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && (themes as readonly string[]).includes(saved)) {
      theme = saved;
    }
  });

  // Apply theme to <html> and save to localStorage on change
  $effect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  });

  // ==========================================
  // 2. COMPONENT DISCOVERY & SECTION MAPPING
  // ==========================================
  const previews = import.meta.glob("../registry/ui/**/*.preview.svelte", {
    eager: true,
  }) as Record<string, { default: any }>;

  const SECTION_ORDER = [
    "actions",
    "forms",
    "data-display",
    "navigation",
    "feedback",
    "layout",
    "components",
    "misc",
  ] as const;

  const SECTION_LABELS: Record<string, string> = {
    actions: "Actions",
    forms: "Forms",
    "data-display": "Data Display",
    navigation: "Navigation",
    feedback: "Feedback",
    layout: "Layout",
    components: "Components",
    misc: "Miscellaneous",
  };

  function parsePath(path: string) {
    const parts = path.split("/");
    const uiIndex = parts.indexOf("ui");
    if (uiIndex === -1 || uiIndex === parts.length - 1)
      return { section: "misc", name: path };
    const rest = parts.slice(uiIndex + 1);
    if (rest.length === 1)
      return {
        section: "components",
        name: rest[0].replace(".preview.svelte", ""),
      };
    if (rest.length === 2)
      return { section: rest[0], name: rest[1].replace(".preview.svelte", "") };
    return { section: rest[0], name: rest[1] };
  }

  const items = Object.entries(previews)
    .map(([path, mod]) => {
      const { section, name } = parsePath(path);
      return { path, name, section, Preview: mod.default };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const sections = $derived.by(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push(item);
    }
    return [...map.entries()]
      .map(([key, items]) => ({
        key,
        label: SECTION_LABELS[key] || key,
        items,
      }))
      .sort((a, b) => {
        const indexA = SECTION_ORDER.indexOf(a.key as any);
        const indexB = SECTION_ORDER.indexOf(b.key as any);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.label.localeCompare(b.label);
      });
  });

  // ==========================================
  // 3. URL ROUTING (Vanilla Svelte)
  // ==========================================
  function readActiveFromUrl(): string {
    const params = new URLSearchParams(window.location.search);
    return params.get("c") ?? items[0]?.name ?? "";
  }

  let activeName = $state<string>(readActiveFromUrl());

  function handlePopState() {
    activeName = readActiveFromUrl();
  }

  function selectComponent(name: string) {
    sidebarOpen = false;
    if (name === activeName) return;
    activeName = name;
    const url = new URL(window.location.href);
    url.searchParams.set("c", name);
    history.pushState({ c: name }, "", url);
  }

  // ==========================================
  // 4. SEARCH & UI STATE
  // ==========================================
  let query = $state("");
  let sidebarOpen = $state(false);
  const current = $derived(items.find((i) => i.name === activeName));

  const filteredSections = $derived(
    query.trim()
      ? sections
          .map((s) => ({
            ...s,
            items: s.items.filter((i) =>
              i.name.toLowerCase().includes(query.toLowerCase()),
            ),
          }))
          .filter((s) => s.items.length > 0)
      : sections,
  );
</script>

<svelte:window on:popstate={handlePopState} />

<svelte:head>
  <title>{current?.name || "Preview"} · UI Registry</title>
</svelte:head>

<div class="app">
  {#if sidebarOpen}
    <button
      class="overlay"
      aria-label="Close menu"
      onclick={() => (sidebarOpen = false)}
    ></button>
  {/if}

  <!-- Sidebar -->
  <aside class="sidebar" class:open={sidebarOpen}>
    <div class="brand">
      <div class="brand-logo">UI</div>
      <div>
        <div class="brand-title">Registry</div>
        <div class="brand-sub">{items.length} components</div>
      </div>
    </div>

    <div class="search">
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        placeholder="Search components…"
        bind:value={query}
        aria-label="Search components"
      />
    </div>

    <nav class="nav" aria-label="Components">
      {#if filteredSections.length === 0}
        <p class="nav-empty">No match</p>
      {:else}
        {#each filteredSections as section (section.key)}
          <div class="section">
            <div class="section-label">{section.label}</div>
            {#each section.items as item (item.name)}
              <button
                class="nav-item"
                class:active={activeName === item.name}
                onclick={() => selectComponent(item.name)}
              >
                <span class="dot"></span>
                <span class="name">{item.name}</span>
              </button>
            {/each}
          </div>
        {/each}
      {/if}
    </nav>

    <!-- Theme Dropdown -->
    <div class="theme-picker">
      <span class="theme-label">Theme</span>
      <Dropdown
        options={themeOptions}
        bind:value={theme}
        searchable={false}
        clearable={false}
        classes={{ root: "theme-dd-root" }}
      >
        {#snippet trigger({ open, toggle, disabled })}
          <button
            type="button"
            class="theme-trigger"
            class:open
            {disabled}
            onclick={toggle}
          >
            <span class="theme-swatch" data-theme-swatch={theme}></span>
            <span class="theme-name">{theme}</span>
            <svg
              class="chevron-down"
              class:rotate={open}
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        {/snippet}

        {#snippet renderOption(opt, selected)}
          <div class="theme-option">
            <span class="theme-swatch" data-theme-swatch={opt.value}></span>
            <span class="theme-name">{opt.label}</span>
          </div>
        {/snippet}
      </Dropdown>
    </div>
  </aside>

  <!-- Content -->
  <div class="content">
    <header class="topbar">
      <button
        class="icon-btn"
        aria-label="Toggle menu"
        onclick={() => (sidebarOpen = !sidebarOpen)}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div class="breadcrumb">
        <span class="muted"
          >{SECTION_LABELS[current?.section ?? ""] ??
            current?.section ??
            "components"}</span
        >
        <span class="sep">/</span>
        <span class="current">{activeName || "—"}</span>
      </div>
    </header>

    <main class="main">
      {#if current}
        <div class="page-head">
          <h1>{current.name}</h1>
          <code>{current.path.split("/").slice(-2).join("/")}</code>
        </div>
        {#key current.name}
          <div class="stage">
            <current.Preview />
          </div>
        {/key}
      {:else}
        <div class="empty">
          <p>No preview found</p>
          <small
            >Select a component from the sidebar or add a <code
              >*.preview.svelte</code
            > file.</small
          >
        </div>
      {/if}
    </main>
  </div>
</div>

<!-- Modal Container for Imperative Modals -->
<ModalContainer />
