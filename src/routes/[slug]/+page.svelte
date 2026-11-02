<script lang="ts">
	import { page } from '$app/state';

	const modules = import.meta.glob('/registry/ui/**/*.preview.svelte');
	const slug = $derived(page.params.slug);

	const previewPath = $derived(
		Object.keys(modules).find((path) => path.endsWith(`/${slug}.preview.svelte`))
	);

	const PreviewComponent = $derived(previewPath ? modules[previewPath] : null);
</script>

{#if PreviewComponent}
	{#await PreviewComponent()}
		<div class="loading">Loading preview...</div>
	{:then module}
		<div class="preview-wrapper">
			<module.default />
		</div>
	{/await}
{:else}
	<div class="empty">
		<p>Component "{slug}" not found.</p>
		<small>Make sure a <code>{slug}.preview.svelte</code> file exists in the registry.</small>
	</div>
{/if}
