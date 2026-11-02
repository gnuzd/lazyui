<script lang="ts">
	import { page } from '$app/state';
	import './layout.css';
	import Dropdown from '../../registry/ui/actions/dropdown/Dropdown.svelte';
	import ModalContainer from '../../registry/ui/actions/modal/ModalContainer.svelte';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: any; children: Snippet } = $props();

	// ==========================================
	// THEME CONFIG & PERSISTENCE
	// ==========================================
	const themes = ['lazyui', 'dracula', 'nord', 'cupcake', 'synthwave'] as const;
	const themeOptions = themes.map((t) => ({ value: t, label: t }));
	const THEME_KEY = 'ui-preview-theme';

	let theme = $state<string>(themes[0]);

	$effect(() => {
		const saved = localStorage.getItem(THEME_KEY);
		if (saved && (themes as readonly string[]).includes(saved)) {
			theme = saved;
		}
	});

	$effect(() => {
		document.documentElement.dataset.theme = theme;
		localStorage.setItem(THEME_KEY, theme);
	});

	// ==========================================
	// NAVIGATION STATE & SEARCH
	// ==========================================
	let query = $state('');
	let sidebarOpen = $state(false);

	// SvelteKit lấy slug từ URL (ví dụ: /components/button -> "button")
	const activeName = $derived(page.params.slug ?? '');
	const current = $derived(data.items.find((i: any) => i.name === activeName));

	const filteredSections = $derived(
		query.trim()
			? data.sections
					.map((s: any) => ({
						...s,
						items: s.items.filter((i: any) => i.name.toLowerCase().includes(query.toLowerCase()))
					}))
					.filter((s: any) => s.items.length > 0)
			: data.sections
	);

	let copiedCli = $state(false);
	const cliCommand = $derived(`npx lazyui add ${activeName}`);
	async function copyCli() {
		await navigator.clipboard.writeText(cliCommand);
		copiedCli = true;
		setTimeout(() => (copiedCli = false), 2000);
	}
</script>

<svelte:head>
	<title>{current?.name || 'Preview'} · UI Registry</title>
</svelte:head>

<div class="app">
	{#if sidebarOpen}
		<button class="overlay" aria-label="Close menu" onclick={() => (sidebarOpen = false)}></button>
	{/if}

	<!-- Sidebar -->
	<aside class="sidebar" class:open={sidebarOpen}>
		<div class="brand">
			<div class="brand-logo">UI</div>
			<div>
				<div class="brand-title">Registry</div>
				<div class="brand-sub">{data.items.length} components</div>
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
							<!-- Dùng thẻ <a> thay vì button đ�� chuẩn SEO & chuẩn SvelteKit -->
							<a
								href="/{item.name}"
								class="nav-item"
								class:active={activeName === item.name}
								onclick={() => (sidebarOpen = false)}
							>
								<span class="dot"></span>
								<span class="name">{item.name}</span>
							</a>
						{/each}
					</div>
				{/each}
			{/if}
		</nav>
	</aside>

	<!-- Content -->
	<div class="content">
		<header class="topbar">
			<div class="flex-1">
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
					<span class="muted">
						{data.SECTION_LABELS[current?.section ?? ''] ?? current?.section ?? 'components'}
					</span>
					<span class="sep">/</span>
					<span class="current">{activeName || '—'}</span>
				</div>
			</div>

			<div class="topbar-actions">
				<button class="cli-btn" onclick={copyCli}>
					{#if copiedCli}
						<Check size={14} class="text-success" /><span>Copied!</span>
					{:else}
						<Copy size={14} /><code>{cliCommand}</code>
					{/if}
				</button>
				<div style="max-width: 300px;">
					<Dropdown
						options={themeOptions}
						bind:value={theme}
						searchable={false}
						clearable={false}
						classes={{ root: 'theme-dd-root' }}
					>
						{#snippet trigger({ open, toggle, disabled })}
							<button type="button" class="theme-trigger" class:open {disabled} onclick={toggle}>
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
						{#snippet renderOption(opt, _selected)}
							<div class="theme-option">
								<span class="theme-swatch" data-theme-swatch={opt.value}></span>
								<span class="theme-name">{opt.label}</span>
							</div>
						{/snippet}
					</Dropdown>
				</div>
			</div>
		</header>

		<main class="main">
			<!-- SvelteKit sử dụng children snippet để render nội dung +page.svelte -->
			{@render children()}
		</main>
	</div>
</div>

<ModalContainer />
