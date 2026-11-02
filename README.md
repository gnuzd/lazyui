# lazyui-svelte

Copy-paste UI components for **Svelte 5** and **Tailwind CSS 4**, with **daisyUI-style themes**.
Components are copied into your project as source code (like shadcn), so you own them and can edit them freely.

## Quick start

Requirements: Svelte 5.16+ and Tailwind CSS 4 already set up in your project.

```bash
npx lazyui-svelte init                     # base styles + default theme
npx lazyui-svelte add button input dropdown
```

`init` does three things:

1. Creates `src/lib/styles/base.css` and `src/lib/styles/app.css`.
2. Adds the `@import` directive to your main CSS file (e.g., `src/app.css` or `src/routes/layout.css`) so the theme is loaded globally.

Components are flattened and written directly to `src/lib/components/ui/`, while shared utils are placed in `src/lib/utils/`:

```svelte
<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
</script>

<Button variant="outline" size="sm">Save</Button>
```

> **Note on extensions:** By default, the CLI automatically appends `.svelte` or `.js` to relative imports, and uses the `#lib/utils` alias (which supports extension resolution). If you prefer the classic SvelteKit behavior (`$lib/utils` and no extensions in imports), use the `--no-ext` flag.

## Themes

```bash
npx lazyui-svelte theme list
npx lazyui-svelte theme add dracula nord
```

`theme add` downloads `src/lazyui/themes/<name>.css` and adds `@import "./themes/<name>.css";` to **`src/lazyui/app.css`**. Your own main CSS file is not touched again: it only imports `app.css` once.

### Choosing a theme

```html
<!-- 1. The whole app -->
<html data-theme="dracula">

<!-- 2. One part of the page -->
<div data-theme="nord">...</div>

<!-- 3. theme-controller (pure CSS, daisyUI-style; not persisted across reloads) -->
<input type="radio" name="theme" class="theme-controller" value="dracula" />
```

The `lazyui` theme is the default when nothing is selected. There is no automatic light/dark mode: the theme is whatever the user (or you) picks.

To persist the choice, set the attribute from JavaScript. Put this in `<head>` to avoid a flash:

```html
<script>
  document.documentElement.dataset.theme = localStorage.theme ?? "lazyui";
</script>
```

And save it when the user changes theme: `localStorage.theme = name`.

### Creating your own theme

Create `src/lazyui/themes/brand.css`, then add `@import "./themes/brand.css";` to `src/lazyui/app.css`:

```css
[data-theme="brand"],
:root:has(input.theme-controller[value="brand"]:checked) {
  color-scheme: light;
  --color-primary: oklch(60% 0.2 150);
  --color-primary-content: oklch(98% 0 0);
  --radius-field: 1rem;
  /* Anything you leave out falls back to the default `lazyui` theme. */
}
```

### Tokens

| Token | Used for |
| --- | --- |
| `--color-primary`, `--color-secondary`, `--color-accent`, `--color-neutral` (+ `-content`) | brand colors and the text color on top of them |
| `--color-base-100`, `--color-base-200`, `--color-base-300`, `--color-base-content` | page background, raised surfaces, borders, default text |
| `--color-info`, `--color-success`, `--color-warning`, `--color-error` (+ `-content`) | status colors |
| `--radius-selector`, `--radius-field`, `--radius-box` | radius for toggles/checkboxes, inputs/buttons, cards/popovers |
| `--size-field` | base unit for control heights (`h-10` equivalent is 10 times this value) |
| `--border` | default border width |

Colors are available as Tailwind utilities (`bg-primary`, `text-base-content`, `border-base-300`...). Radius has `rounded-selector`, `rounded-field` and `rounded-box`. Plain `border` uses `base-300` as its color.

Themes rely on the CSS `:has()` selector (Chrome/Edge 105+, Safari 15.4+, Firefox 121+) for `theme-controller`. `data-theme` works everywhere.

## CLI reference

| Command | Description |
| --- | --- |
| `lazyui-svelte init` | Install base styles + default theme and wire up your CSS |
| `lazyui-svelte add <component...>` | Copy components (and the components and npm packages they need) into your project |
| `lazyui-svelte theme list` | List available themes (installed ones are marked) |
| `lazyui-svelte theme add <theme...>` | Install themes and import them in `src/lazyui/app.css` |

**Flags:**

| Flag | Description |
| --- | --- |
| `-f`, `--force` | Overwrite files that already exist (existing files are skipped by default) |
| `--no-install` | Copy files but do not run the package manager (the command is printed instead) |
| `--ext` | Force auto-appending extensions to relative imports (default behavior) |
| `--no-ext` | Disable auto-appending extensions. Also switches the utils alias from `#lib/utils` to `$lib/utils` |

**Environment variables:**

| Variable | Default | Meaning |
| --- | --- | --- |
| `LAZYUI_DIR` | `src/lib/components/ui` | Where components are written |
| `LAZYUI_UTILS_DIR` | `src/lib/utils` | Where shared utilities (like `cn.ts`) are written |
| `LAZYUI_EXTENSIONS` | `on` | `on` or `off`. Same effect as `--ext` / `--no-ext`. CLI flags override this. |
| `LAZYUI_THEME_DIR` | `src/lazyui` | Where theme files are written |
| `LAZYUI_REGISTRY` | (GitHub raw URL) | Read the registry from a local folder instead of GitHub |

> **Alias logic:** When extensions are enabled (`on`), the CLI rewrites `_utils` imports to `#lib/utils` (SvelteKit subpath imports). When extensions are disabled (`off`), it uses `$lib/utils` (classic SvelteKit alias) to keep your code untouched.

## Components that need other code

A registry item in `registry/registry.json` can declare what it needs:

```json
{
  "utils": { 
    "files": ["ui/_utils/cn.ts"], 
    "dependencies": ["clsx", "tailwind-merge"] 
  },
  "popover": {
    "files": ["ui/popover/Popover.svelte"],
    "dependencies": ["@floating-ui/dom"],
    "registryDependencies": ["utils"]
  }
}
```

| Field | Meaning |
| --- | --- |
| `files` | Files under `registry/ui/`, copied into your project (flattened for components, preserved for `_utils`) |
| `registryDependencies` | Other registry items. They are resolved recursively and copied too |
| `dependencies` | npm packages. Installed with your package manager (`bun`, `pnpm`, `yarn` or `npm`, detected from the lockfile) if they are not in your `package.json` yet |
| `devDependencies` | Same, installed as dev dependencies |

`npx lazyui-svelte add popover` therefore copies `Popover.svelte`, `cn.ts`, and then runs something like:
`npm install @floating-ui/dom clsx tailwind-merge`. Add a version with `"@floating-ui/dom@^1"` if you need to pin one.

Because the CLI flattens the component tree but preserves the `_utils` folder, it automatically rewrites the internal imports to use your configured alias so you never have to worry about relative paths breaking:

```svelte
<script lang="ts">
  // The CLI transforms relative paths (../../_utils/cn) into:
  import { cn } from "#lib/utils/cn"; // (or "$lib/utils/cn" if --no-ext is used)
</script>
```

A package that ships its own CSS or Tailwind classes (for example a UI kit) may also need an `@source` line in your CSS so Tailwind scans it. Document that in the component's section of your docs.

## Developing this repository

```bash
bun install
bun run dev        # sandbox: every component and theme, with a theme switcher
```

```text
registry/
  registry.json        component -> files mapping
  themes.json          list of theme names
  theme/base.css       Tailwind color mapping, radius utilities, base layer
  theme/themes/*.css   one file per theme
  ui/                  Flattened structure for components + _utils
cli/index.ts           the CLI
src/                   sandbox app
```

**Add a component:** create the component and its `.preview.svelte` file under `registry/ui/`, then add it to `registry/registry.json`. The sandbox picks up every `*.preview.svelte` automatically.

**Add a theme:** copy any file in `registry/theme/themes/`, change the name in both selectors and the values, add the name to `registry/themes.json` and to the imports in `src/lazyui/app.css`, and list it in `src/App.svelte`.

**Test the CLI before pushing:**

```bash
bun run build:cli
cd /path/to/some-svelte-project
LAZYUI_REGISTRY=/path/to/lazyui/registry node /path/to/lazyui/dist/index.js init
```

**Publish:** push to `github.com/gnuzd/lazyui` (the CLI downloads from the `main` branch), then `bun run build:cli && npm publish`. Check the name is free first with `npm view lazyui-svelte`; if it is taken, use a scope such as `@gnuzd/lazyui-svelte`.
