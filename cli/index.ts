#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, sep } from "node:path";

const CLI = "lazyui";
const REPO = "https://raw.githubusercontent.com/gnuzd/lazyui/main/registry";
const LOCAL = process.env.LAZYUI_REGISTRY;

// Configurable paths (defaults are SvelteKit friendly)
const componentsDir = process.env.LAZYUI_DIR ?? "src/lib/components/ui";
const themeDir = process.env.LAZYUI_THEME_DIR ?? "src/lib/styles";
const utilsDir = process.env.LAZYUI_UTILS_DIR ?? "src/lib/utils";

const CSS_ENTRIES = ["src/app.css", "src/routes/layout.css", "src/index.css"];

const args = process.argv.slice(2);
const force = args.includes("--force") || args.includes("-f");
const noInstall = args.includes("--no-install");

// ---------- Extensions resolution ----------
// Priority: CLI flag > env LAZYUI_EXTENSIONS > default ("on")
function resolveExtensions(): boolean {
  if (args.includes("--ext")) return true;
  if (args.includes("--no-ext")) return false;
  const env = (process.env.LAZYUI_EXTENSIONS ?? "on").toLowerCase().trim();
  return env !== "off" && env !== "0" && env !== "false";
}
const ADD_EXTENSIONS = resolveExtensions();

// ---------- Alias resolution (derived from extension mode) ----------
// extensions ON  -> "#lib/utils" (SvelteKit subpath import)
// extensions OFF -> "$lib/utils" (classic SvelteKit alias)
const utilsAlias = ADD_EXTENSIONS ? "#lib/utils" : "$lib/utils";

const USAGE = [
  "Usage:",
  "  " + CLI + " init                      install base styles + default theme",
  "  " + CLI + " add <component...>        e.g. button input dropdown",
  "  " + CLI + " theme list                list available themes",
  "  " + CLI + " theme add <theme...>      e.g. dracula nord",
  "",
  "Environment Variables:",
  "  LAZYUI_DIR                target folder for components (default: src/lib/components/ui)",
  "  LAZYUI_UTILS_DIR          target folder for utils (default: src/lib/utils)",
  "  LAZYUI_EXTENSIONS         'on' | 'off' — auto-append file extensions to relative",
  "                            imports. Default: on.",
  "",
  "Extension mode also determines the import alias:",
  "  on  -> #lib/utils",
  "  off -> $lib/utils",
  "",
  "Flags:",
  "  -f, --force                 overwrite files that already exist",
  "  --no-install                copy files but do not run the package manager",
  "  --ext                       force auto-appending extensions (overrides env)",
  "  --no-ext                    disable auto-appending extensions (overrides env)",
].join("\n");

const [cmd, sub, ...rest] = args.filter((a) => !a.startsWith("-"));

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const get = async (path: string): Promise<string> => {
  if (LOCAL) return readFile(join(LOCAL, path), "utf8");
  const res = await fetch(REPO + "/" + path);
  if (!res.ok)
    return fail("Could not download " + path + " (HTTP " + res.status + ")");
  return res.text();
};

const write = async (dest: string, content: string) => {
  if (existsSync(dest) && !force) {
    console.log("=", dest, "(already exists, use --force to overwrite)");
    return;
  }
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, content);
  console.log("+", dest);
};

const ensureLines = async (file: string, wanted: string[]) => {
  const current = existsSync(file) ? await readFile(file, "utf8") : "";
  const have = new Set(current.split("\n").map((l) => l.trim()));
  const missing = wanted.filter((l) => !have.has(l));
  if (!missing.length) return;
  const base = current.trimEnd();
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, (base ? base + "\n" : "") + missing.join("\n") + "\n");
  for (const l of missing) console.log("~", file, "(added " + l + ")");
};

const listThemes = async (): Promise<string[]> =>
  JSON.parse(await get("themes.json"));

async function importIntoApp(target: string) {
  const entry = CSS_ENTRIES.find((f) => existsSync(f));
  let rel = relative(dirname(entry ?? CSS_ENTRIES[0]), target)
    .split(sep)
    .join("/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  const line = '@import "' + rel + '";';
  const manual = () =>
    console.log(
      'Add this line to your main CSS file, right after @import "tailwindcss":\n  ' +
        line,
    );

  if (!entry) return manual();
  const lines = (await readFile(entry, "utf8")).split("\n");
  if (lines.some((l) => l.trim() === line))
    return console.log("=", entry, "(already imports " + rel + ")");
  const i = lines.findIndex(
    (l) => l.includes("@import") && l.includes("tailwindcss"),
  );
  if (i < 0) return manual();
  lines.splice(i + 1, 0, line);
  await writeFile(entry, lines.join("\n"));
  console.log("~", entry, "(added " + line + ")");
}

async function init() {
  await write(join(themeDir, "base.css"), await get("theme/base.css"));
  await write(
    join(themeDir, "themes/lazyui.css"),
    await get("theme/themes/lazyui.css"),
  );

  const appCss = join(themeDir, "app.css");
  await ensureLines(appCss, [
    '@import "tailwindcss";',
    '@import "./base.css";',
    '@import "./themes/lazyui.css";',
  ]);
  await importIntoApp(appCss);

  console.log("\nNext: " + CLI + " add button input dropdown");
}

async function themeAdd(names: string[]) {
  const appCss = join(themeDir, "app.css");
  if (!existsSync(appCss))
    fail("Theme files not found. Run '" + CLI + " init' first.");
  const all = await listThemes();
  for (const n of names) {
    if (!all.includes(n))
      fail("Unknown theme '" + n + "'. Available: " + all.join(", "));
  }
  for (const n of names) {
    await write(
      join(themeDir, "themes", n + ".css"),
      await get("theme/themes/" + n + ".css"),
    );
    await ensureLines(appCss, ['@import "./themes/' + n + '.css";']);
  }
  console.log(
    '\nUse it with <html data-theme="' +
      names[0] +
      '"> or <input type="radio" class="theme-controller" value="' +
      names[0] +
      '" />',
  );
}

async function themeList() {
  for (const n of await listThemes()) {
    const installed = existsSync(join(themeDir, "themes", n + ".css"));
    console.log(n + (installed ? "  (installed)" : ""));
  }
}

type Item = {
  files: string[];
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
};

const pkgName = (spec: string) => spec.replace(/(?!^)@.*$/, "");

const detectPm = () =>
  existsSync("bun.lock") || existsSync("bun.lockb")
    ? "bun"
    : existsSync("pnpm-lock.yaml")
      ? "pnpm"
      : existsSync("yarn.lock")
        ? "yarn"
        : "npm";

async function installPackages(specs: string[], dev: boolean) {
  const pkg = existsSync("package.json")
    ? JSON.parse(await readFile("package.json", "utf8"))
    : {};
  const have = { ...pkg.dependencies, ...pkg.devDependencies };
  const missing = [...new Set(specs)].filter((s) => !(pkgName(s) in have));
  if (!missing.length) return;

  const pm = detectPm();
  const devFlag = pm === "bun" || pm === "yarn" ? "--dev" : "--save-dev";
  const cmd = [
    pm === "npm" ? "install" : "add",
    ...(dev ? [devFlag] : []),
    ...missing,
  ];
  if (noInstall) return console.log("Install manually:", pm, cmd.join(" "));

  console.log("$", pm, cmd.join(" "));
  const res = spawnSync(pm, cmd, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0)
    console.error("Install failed. Run it yourself:", pm, cmd.join(" "));
}

function addExtensionsToImports(content: string): string {
  return content.replace(
    /(from\s+|import\s+)(['"])(\.[^'"]+)\2/g,
    (match, prefix: string, quote: string, importPath: string) => {
      if (/\.[a-zA-Z0-9]+$/.test(importPath)) return match;

      const lastSegment = importPath.split("/").pop() ?? "";
      const ext = /^[A-Z]/.test(lastSegment) ? ".svelte" : ".js";
      return `${prefix}${quote}${importPath}${ext}${quote}`;
    },
  );
}

async function add(names: string[]) {
  const registry: Record<string, Item> = JSON.parse(await get("registry.json"));

  const order: string[] = [];
  const visit = (n: string, from?: string): void => {
    const item = registry[n];
    if (!item) {
      return fail(
        "Unknown component '" +
          n +
          "'" +
          (from ? " (required by '" + from + "')" : "") +
          ". Available: " +
          Object.keys(registry).join(", "),
      );
    }
    if (order.includes(n)) return;
    order.push(n);
    for (const d of item.registryDependencies ?? []) visit(d, n);
  };
  for (const n of names) visit(n);

  const deps: string[] = [];
  const devDeps: string[] = [];

  console.log(
    "i extensions: " +
      (ADD_EXTENSIONS ? "on" : "off") +
      "  |  alias: " +
      utilsAlias,
  );

  for (const n of order) {
    const item = registry[n];
    deps.push(...(item.dependencies ?? []));
    devDeps.push(...(item.devDependencies ?? []));

    for (const f of item.files) {
      const isUtil = f.includes("/_utils/");
      const destPath = isUtil
        ? join(utilsDir, basename(f))
        : join(componentsDir, basename(f));

      let content = await get(f);

      if (!isUtil) {
        content = content.replace(/(?:\.\.\/)+_utils\//g, `${utilsAlias}/`);

        if (ADD_EXTENSIONS) {
          content = addExtensionsToImports(content);
        }
      }

      await write(destPath, content);
    }
  }

  const extra = order.filter((n) => !names.includes(n));
  if (extra.length) console.log("Also added (required): " + extra.join(", "));

  await installPackages(deps, false);
  await installPackages(devDeps, true);

  if (!existsSync(join(themeDir, "app.css"))) {
    console.log(
      "\nTip: run '" +
        CLI +
        " init' to install the theme the components rely on.",
    );
  }
}

try {
  if (cmd === "init") await init();
  else if (cmd === "add" && sub) await add([sub, ...rest]);
  else if (cmd === "theme" && sub === "list") await themeList();
  else if (cmd === "theme" && sub === "add" && rest.length)
    await themeAdd(rest);
  else fail(USAGE);
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}
