#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, sep } from 'node:path';

const CLI = 'lazyui';
const REPO = 'https://raw.githubusercontent.com/gnuzd/lazyui/main/registry';
const LOCAL = process.env.LAZYUI_REGISTRY;

// Configurable paths (defaults are SvelteKit friendly)
const componentsDir = process.env.LAZYUI_DIR ?? 'src/lib/components/ui';
// utils/ lives next to the ui folder, i.e. inside its parent directory
// (e.g. src/lib/components/utils/ when componentsDir is src/lib/components/ui).
const themeDir = process.env.LAZYUI_THEME_DIR ?? 'src/lib/styles';

const CSS_ENTRIES = ['src/app.css', 'src/routes/layout.css', 'src/index.css'];

const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');
const noInstall = args.includes('--no-install');

// Default: extensions ON. Only disabled via --no-ext.
const ADD_EXTENSIONS = !args.includes('--no-ext');

// Single fixed import alias for the utils folder.
const UTILS_IMPORT = '#lib/utils';

const USAGE = [
	'Usage:',
	'  ' + CLI + ' init                      install base styles + default theme',
	'  ' + CLI + ' add <component...>        e.g. button input dropdown',
	'  ' + CLI + ' theme list                list available themes',
	'  ' + CLI + ' theme add <theme...>      e.g. dracula nord',
	'',
	'Environment Variables:',
	'  LAZYUI_DIR                target folder for components (default: src/lib/components/ui)',
	'                            the utils/ folder is written next to this folder (same level as ui)',
	'',
	'Flags:',
	'  -f, --force                 overwrite files that already exist',
	'  --no-install                copy files but do not run the package manager',
	'  --no-ext                    disable auto-appending file extensions to relative imports'
].join('\n');

const [cmd, sub, ...rest] = args.filter((a) => !a.startsWith('-'));

const fail = (message: string): never => {
	console.error(message);
	process.exit(1);
};

const get = async (path: string): Promise<string> => {
	if (LOCAL) return readFile(join(LOCAL, path), 'utf8');
	const res = await fetch(REPO + '/' + path);
	if (!res.ok) return fail('Could not download ' + path + ' (HTTP ' + res.status + ')');
	return res.text();
};

const write = async (dest: string, content: string) => {
	if (existsSync(dest) && !force) {
		console.log('=', dest, '(already exists, use --force to overwrite)');
		return;
	}
	await mkdir(dirname(dest), { recursive: true });
	await writeFile(dest, content);
	console.log('+', dest);
};

const ensureLines = async (file: string, wanted: string[]) => {
	const current = existsSync(file) ? await readFile(file, 'utf8') : '';
	const have = new Set(current.split('\n').map((l) => l.trim()));
	const missing = wanted.filter((l) => !have.has(l));
	if (!missing.length) return;
	const base = current.trimEnd();
	await mkdir(dirname(file), { recursive: true });
	await writeFile(file, (base ? base + '\n' : '') + missing.join('\n') + '\n');
	for (const l of missing) console.log('~', file, '(added ' + l + ')');
};

const listThemes = async (): Promise<string[]> => JSON.parse(await get('themes.json'));

// Print manual import instructions for the generated theme CSS.
function warnManualCssImport(target: string) {
	const entry = CSS_ENTRIES.find((f) => existsSync(f)) ?? CSS_ENTRIES[0];
	let rel = relative(dirname(entry), target).split(sep).join('/');
	if (!rel.startsWith('.')) rel = './' + rel;
	const line = '@import "' + rel + '";';

	console.warn(
		'\n\u26a0  Manual step required: add this line to your main CSS file,' +
			'\n   right after @import "tailwindcss":\n\n' +
			'     ' +
			line +
			'\n'
	);
}

async function init() {
	await write(join(themeDir, 'base.css'), await get('theme/base.css'));
	await write(join(themeDir, 'themes/lazyui.css'), await get('theme/themes/lazyui.css'));

	const appCss = join(themeDir, 'app.css');
	await ensureLines(appCss, [
		'@import "tailwindcss";',
		'@import "./base.css";',
		'@import "./themes/lazyui.css";'
	]);

	warnManualCssImport(appCss);

	console.log('Next: ' + CLI + ' add button input dropdown');
}

async function themeAdd(names: string[]) {
	const appCss = join(themeDir, 'app.css');
	if (!existsSync(appCss)) fail("Theme files not found. Run '" + CLI + " init' first.");
	const all = await listThemes();
	for (const n of names) {
		if (!all.includes(n)) fail("Unknown theme '" + n + "'. Available: " + all.join(', '));
	}
	for (const n of names) {
		await write(join(themeDir, 'themes', n + '.css'), await get('theme/themes/' + n + '.css'));
		await ensureLines(appCss, ['@import "./themes/' + n + '.css";']);
	}
	console.log(
		'\nUse it with <html data-theme="' +
			names[0] +
			'"> or <input type="radio" class="theme-controller" value="' +
			names[0] +
			'" />'
	);
}

async function themeList() {
	for (const n of await listThemes()) {
		const installed = existsSync(join(themeDir, 'themes', n + '.css'));
		console.log(n + (installed ? '  (installed)' : ''));
	}
}

type Item = {
	files: string[];
	dependencies?: string[];
	devDependencies?: string[];
	registryDependencies?: string[];
};

const pkgName = (spec: string) => spec.replace(/(?!^)@.*$/, '');

const detectPm = () =>
	existsSync('bun.lock') || existsSync('bun.lockb')
		? 'bun'
		: existsSync('pnpm-lock.yaml')
			? 'pnpm'
			: existsSync('yarn.lock')
				? 'yarn'
				: 'npm';

async function installPackages(specs: string[], dev: boolean) {
	const pkg = existsSync('package.json') ? JSON.parse(await readFile('package.json', 'utf8')) : {};
	const have = { ...pkg.dependencies, ...pkg.devDependencies };
	const missing = [...new Set(specs)].filter((s) => !(pkgName(s) in have));
	if (!missing.length) return;

	const pm = detectPm();
	const devFlag = pm === 'bun' || pm === 'yarn' ? '--dev' : '--save-dev';
	const cmd = [pm === 'npm' ? 'install' : 'add', ...(dev ? [devFlag] : []), ...missing];
	if (noInstall) return console.log('Install manually:', pm, cmd.join(' '));

	console.log('$', pm, cmd.join(' '));
	const res = spawnSync(pm, cmd, {
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});
	if (res.status !== 0) console.error('Install failed. Run it yourself:', pm, cmd.join(' '));
}

function addExtensionsToImports(content: string): string {
	return content.replace(
		/(from\s+|import\s+)(['"])(\.[^'"]+)\2/g,
		(match, prefix: string, quote: string, importPath: string) => {
			if (/\.[a-zA-Z0-9]+$/.test(importPath)) return match;

			const lastSegment = importPath.split('/').pop() ?? '';
			const ext = /^[A-Z]/.test(lastSegment) ? '.svelte' : '.js';
			return `${prefix}${quote}${importPath}${ext}${quote}`;
		}
	);
}

async function add(names: string[]) {
	const registry: Record<string, Item> = JSON.parse(await get('registry.json'));

	const order: string[] = [];
	const visit = (n: string, from?: string): void => {
		const item = registry[n];
		if (!item) {
			return fail(
				"Unknown component '" +
					n +
					"'" +
					(from ? " (required by '" + from + "')" : '') +
					'. Available: ' +
					Object.keys(registry).join(', ')
			);
		}
		if (order.includes(n)) return;
		order.push(n);
		for (const d of item.registryDependencies ?? []) visit(d, n);
	};
	for (const n of names) visit(n);

	const deps: string[] = [];
	const devDeps: string[] = [];

	console.log('i extensions: ' + (ADD_EXTENSIONS ? 'on' : 'off'));

	for (const n of order) {
		const item = registry[n];
		deps.push(...(item.dependencies ?? []));
		devDeps.push(...(item.devDependencies ?? []));

		for (const f of item.files) {
			// Files under a utils/ segment belong to the utils folder.
			const isUtil = /(^|\/)utils\//.test(f);
			// Preserve the path after "utils/" so subfolders/files keep their name.
			const utilRel = isUtil ? f.slice(f.indexOf('utils/') + 'utils/'.length) : '';
			const destPath = isUtil
				? join(dirname(componentsDir), 'utils', utilRel)
				: join(componentsDir, basename(f));

			let content = await get(f);

			if (!isUtil) {
				// Rewrite relative imports into the utils folder to the fixed alias,
				// preserving the subpath after "utils/".
				content = content.replace(
					/(?:\.\.\/)+utils\/([^'"]+)/g,
					(_m, sub: string) => UTILS_IMPORT + '/' + sub
				);

				if (ADD_EXTENSIONS) {
					content = addExtensionsToImports(content);
				}
			}

			await write(destPath, content);
		}
	}

	const extra = order.filter((n) => !names.includes(n));
	if (extra.length) console.log('Also added (required): ' + extra.join(', '));

	await installPackages(deps, false);
	await installPackages(devDeps, true);

	if (!existsSync(join(themeDir, 'app.css'))) {
		console.log("\nTip: run '" + CLI + " init' to install the theme the components rely on.");
	}
}

try {
	if (cmd === 'init') await init();
	else if (cmd === 'add' && sub) await add([sub, ...rest]);
	else if (cmd === 'theme' && sub === 'list') await themeList();
	else if (cmd === 'theme' && sub === 'add' && rest.length) await themeAdd(rest);
	else fail(USAGE);
} catch (e) {
	fail(e instanceof Error ? e.message : String(e));
}
