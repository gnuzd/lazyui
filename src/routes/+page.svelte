<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	$effect(() => {
		if (data.items.length > 0 && page.url.pathname === '/') {
			goto(`/components/${data.items[0].name}`, { replaceState: true });
		}
	});
</script>

<div class="empty">
	<p>Redirecting to first component...</p>
</div>
