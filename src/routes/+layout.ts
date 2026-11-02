// src/routes/+layout.ts
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = () => {
	// Trỏ đường dẫn đến thư mục registry (cách src/routes 2 cấp)
	const previews = import.meta.glob('../../registry/ui/**/*.preview.svelte', {
		eager: true
	}) as Record<string, { default: any }>;

	const SECTION_ORDER = [
		'actions',
		'forms',
		'data-display',
		'navigation',
		'feedback',
		'layout',
		'components',
		'misc'
	] as const;

	const SECTION_LABELS: Record<string, string> = {
		actions: 'Actions',
		forms: 'Forms',
		'data-display': 'Data Display',
		navigation: 'Navigation',
		feedback: 'Feedback',
		layout: 'Layout',
		components: 'Components',
		misc: 'Miscellaneous'
	};

	function parsePath(path: string) {
		const parts = path.split('/');
		const uiIndex = parts.indexOf('ui');
		if (uiIndex === -1 || uiIndex === parts.length - 1) return { section: 'misc', name: path };
		const rest = parts.slice(uiIndex + 1);
		if (rest.length === 1)
			return { section: 'components', name: rest[0].replace('.preview.svelte', '') };
		if (rest.length === 2)
			return { section: rest[0], name: rest[1].replace('.preview.svelte', '') };
		return { section: rest[0], name: rest[1] };
	}

	const items = Object.entries(previews)
		.map(([path, mod]) => {
			const { section, name } = parsePath(path);
			return { path, name, section };
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	const sectionsMap = new Map<string, typeof items>();
	for (const item of items) {
		if (!sectionsMap.has(item.section)) sectionsMap.set(item.section, []);
		sectionsMap.get(item.section)!.push(item);
	}

	const sections = [...sectionsMap.entries()]
		.map(([key, items]) => ({ key, label: SECTION_LABELS[key] || key, items }))
		.sort((a, b) => {
			const indexA = SECTION_ORDER.indexOf(a.key as any);
			const indexB = SECTION_ORDER.indexOf(b.key as any);
			if (indexA !== -1 && indexB !== -1) return indexA - indexB;
			if (indexA !== -1) return -1;
			if (indexB !== -1) return 1;
			return a.label.localeCompare(b.label);
		});

	return { sections, items, SECTION_LABELS };
};
