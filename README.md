# lazyui

Copy-paste UI components for **Svelte 5** and **Tailwind CSS 4**, with **daisyUI-style themes**.
Components are copied into your project as source code (like shadcn), so you own them and can edit them freely.

## Quick start

Requirements: Svelte 5.16+ and Tailwind CSS 4 already set up in your project.

```bash
npx lazyui init                     # base styles + default theme
npx lazyui add button input dropdown
```

`init` does three things:

1. Creates `src/lazyui/base.css` and `src/lazyui/themes/lazyui.css`.
2. Creates `src/lazyui/index.css`, the single file that imports the base styles and every theme.
3. Adds one line to your main CSS file (`src/app.css`, `src/routes/layout.css` or `src/index.css`), right after Tailwind:

```css
@import "tailwindcss";
@import "./lazyui/index.css";
```

Components are written to `src/lib/components/ui/<name>/`:

```svelte
<script lang="ts">
  import Button from "$lib/components/ui/button/Button.svelte";
</script>

<Button variant="outline" size="sm">Save</Button>
```

## Themes

```bash
npx lazyui theme list
npx lazyui theme add dracula nord
```

`theme add` downloads `src/lazyui/themes/<name>.css` and adds `@import "./themes/<name>.css";` to
**`src/lazyui/index.css`**. Your own CSS file is not touched again: it only imports `index.css` once.

### Choosing a theme

```html
<!-- 1. The whole app -->
<html data-theme="dracula">

<!-- 2. One part of the page -->
<div data-theme="nord">...</div>

<!-- 3. theme-controller (pure CSS, daisyUI-style; not persisted across reloads) -->
<input type="radio" name="theme" class="theme-controller" value="dracula" />
```

The `lazyui` theme is the default when nothing is selected. There is no automatic light/dark mode:
the theme is whatever the user (or you) picks.

To persist the choice, set the attribute from JavaScript. Put this in `<head>` to avoid a flash:

```html
<script>
  document.documentElement.dataset.theme = localStorage.theme ?? "lazyui";
</script>
```

and save it when the user changes theme: `localStorage.theme = name`.

### Creating your own theme

Create `src/lazyui/themes/brand.css`, then add `@import "./themes/brand.css";` to `src/lazyui/index.css`:

```css
[data-theme="brand"],
:root:has(input.theme-controller[value="brand"]:checked) {
  color-scheme: light;
  --primary: oklch(60% 0.2 150);
  --primary-content: oklch(98% 0 0);
  --radius-field: 1rem;
  /* Anything you leave out falls back to the default `lazyui` theme. */
}
```

### Tokens

| Token | Used for |
| --- | --- |
| `primary`, `secondary`, `accent`, `neutral` (+ `-content`) | brand colors and the text color on top of them |
| `base-100`, `base-200`, `base-300`, `base-content` | page background, raised surfaces, borders, default text |
| `info`, `success`, `warning`, `error` | status colors |
| `--radius-selector`, `--radius-field`, `--radius-box` | radius for toggles/checkboxes, inputs/buttons, cards/popovers |
| `--size-field` | base unit for control heights (`h-10` equivalent is 10 times this value) |
| `--border` | default border width |

Colors are available as Tailwind utilities (`bg-primary`, `text-base-content`, `border-base-300`...). Radius has
`rounded-selector`, `rounded-field` and `rounded-box`. Plain `border` uses `base-300` as its color.

Themes rely on the CSS `:has()` selector (Chrome/Edge 105+, Safari 15.4+, Firefox 121+) for `theme-controller`.
`data-theme` works everywhere.

## CLI reference

| Command | Description |
| --- | --- |
| `lazyui init` | Install base styles + default theme and wire up your CSS |
| `lazyui add <component...>` | Copy components (and the components and npm packages they need) into your project |
| `lazyui theme list` | List available themes (installed ones are marked) |
| `lazyui theme add <theme...>` | Install themes and import them in `src/lazyui/index.css` |
| `-f`, `--force` | Overwrite files that already exist (existing files are skipped by default) |
| `--no-install` | Copy files but do not run the package manager (the command is printed instead) |

Environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `LAZYUI_DIR` | `src/lib/components/ui` | Where components are written |
| `LAZYUI_THEME_DIR` | `src/lazyui` | Where theme files are written |
| `LAZYUI_REGISTRY` | (GitHub raw URL) | Read the registry from a local folder instead of GitHub |

## Components that need other code

A registry item in `registry/registry.json` can declare what it needs:

```json
{
  "utils":   { "files": ["ui/_utils/cn.ts"], "dependencies": ["clsx", "tailwind-merge"] },
  "popover": {
    "files": ["ui/popover/Popover.svelte"],
    "dependencies": ["@floating-ui/dom"],
    "registryDependencies": ["utils"]
  }
}
```

| Field | Meaning |
| --- | --- |
| `files` | Files under `registry/ui/`, copied to `src/lib/components/ui/` with the same sub-folders |
| `registryDependencies` | Other registry items. They are resolved recursively and copied too |
| `dependencies` | npm packages. Installed with your package manager (`bun`, `pnpm`, `yarn` or `npm`, detected from the lockfile) if they are not in your `package.json` yet |
| `devDependencies` | Same, installed as dev dependencies |

`npx lazyui add popover` therefore copies `popover/` and `_utils/cn.ts`, then runs something like
`npm install @floating-ui/dom clsx tailwind-merge`. Add a version with `"@floating-ui/dom@^1"` if you need to pin one.

Because every file keeps the same folder layout in your project as in `registry/ui/`, components import each other with
**relative paths** and never need a path alias:

```svelte
<script lang="ts">
  import { cn } from "../_utils/cn";   // registry/ui/popover/ -> registry/ui/_utils/cn.ts
</script>
```

A package that ships its own CSS or Tailwind classes (for example a UI kit) may also need an `@source` line in your CSS
so Tailwind scans it. Document that in the component's section of your docs.

## Developing this repository

```bash
bun install
bun run dev        # sandbox: every component and theme, with a theme switcher
```

```
registry/
  registry.json        component -> files
  themes.json          list of theme names
  theme/base.css       Tailwind color mapping, radius utilities, base layer
  theme/themes/*.css   one file per theme
  ui/<name>/           Component.svelte + name.preview.svelte (shown in the sandbox)
cli/index.ts           the CLI
src/                   sandbox app
```

**Add a component:** create `registry/ui/<name>/<Name>.svelte` and `<name>.preview.svelte`, then add it to
`registry/registry.json`. The sandbox picks up every `*.preview.svelte` automatically.

**Add a theme:** copy any file in `registry/theme/themes/`, change the name in both selectors and the values, add the
name to `registry/themes.json` and to the imports in `src/app.css`, and list it in `src/App.svelte`.

**Test the CLI before pushing:**

```bash
bun run build:cli
cd /path/to/some-svelte-project
LAZYUI_REGISTRY=/path/to/lazyui/registry node /path/to/lazyui/dist/index.js init
```

**Publish:** push to `github.com/gnuzd/lazyui` (the CLI downloads from the `main` branch), then
`bun run build:cli && npm publish`. Check the name is free first with `npm view lazyui`;
if it is taken, use a scope such as `@gnuzd/lazyui`.
