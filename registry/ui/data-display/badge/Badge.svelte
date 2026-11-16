<script lang="ts">
	import { match } from 'ts-pattern';
	import { cn } from '../../../utils/cn';

	type Variant = 'success' | 'warning' | 'error' | 'default';

	interface Props {
		value: string;
		variant: Variant;
		class?: string;
	}

	let { value, variant, class: classes }: Props = $props();

	const cls = $derived(
		match(variant)
			.with('success', () => 'bg-success/15 text-success-content border-success')
			.with('warning', () => 'bg-warning/15 text-warning-content border-warning')
			.with('error', () => 'bg-error/15 text-error-content border-error')
			.otherwise(() => 'bg-base-300 text-base-content border-base-300')
	);

	const base =
		'inline-flex items-center gap-1.5 rounded-field border px-2 py-0.5 font-mono text-[11px] font-medium {cls}';
</script>

<span class={cn(base, cls, classes)}>
	{value}
</span>
