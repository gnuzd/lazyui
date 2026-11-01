<script lang="ts">
  import Button from "./Button.svelte";
  import {
    Plus,
    Trash2,
    ArrowRight,
    Download,
    ExternalLink,
  } from "@lucide/svelte";

  // ===== STATE FOR LIVE DEMOS =====
  let saving = $state(false);
  const save = async () => {
    saving = true;
    await new Promise((r) => setTimeout(r, 1500));
    saving = false;
  };

  // ===== COPY SNIPPET HELPER =====
  let copied = $state<string | null>(null);
  async function copy(key: string, code: string) {
    await navigator.clipboard.writeText(code);
    copied = key;
    setTimeout(() => (copied = null), 1500);
  }
</script>

{#snippet demo(
  title: string,
  desc: string,
  body: import("svelte").Snippet,
  code: string,
  key: string,
)}
  <section class="demo">
    <div class="demo-head">
      <div>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
      <button class="copy-btn" onclick={() => copy(key, code)}>
        {copied === key ? "Copied!" : "Copy"}
      </button>
    </div>
    <div class="demo-body">
      {@render body()}
    </div>
    <pre class="demo-code"><code>{code}</code></pre>
  </section>
{/snippet}

<div class="preview">
  <header class="preview-head">
    <h1>Button</h1>
    <p>Variants, sizes, shapes, loading states, icons, and anchor support.</p>
  </header>

  <!-- 1. BUTTON STYLES -->
  {#snippet stylesBody()}
    <div class="flex-wrap">
      <Button>Solid</Button>
      <Button buttonStyle="soft">Soft</Button>
      <Button buttonStyle="outline">Outline</Button>
      <Button buttonStyle="ghost">Ghost</Button>
      <Button buttonStyle="link">Link</Button>
    </div>
  {/snippet}
  {@render demo(
    "Button styles",
    "Use buttonStyle to switch between solid, soft, outline, ghost, and link.",
    stylesBody,
    `<Button>Solid</Button>
<Button buttonStyle="soft">Soft</Button>
<Button buttonStyle="outline">Outline</Button>
<Button buttonStyle="ghost">Ghost</Button>
<Button buttonStyle="link">Link</Button>`,
    "b1",
  )}

  <!-- 2. VARIANTS -->
  {#snippet variantsBody()}
    <div class="flex-wrap">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="error">Error</Button>
    </div>
    <div class="flex-wrap mt-4">
      <Button variant="primary" buttonStyle="outline">Primary</Button>
      <Button variant="secondary" buttonStyle="outline">Secondary</Button>
      <Button variant="success" buttonStyle="outline">Success</Button>
      <Button variant="warning" buttonStyle="outline">Warning</Button>
      <Button variant="error" buttonStyle="outline">Error</Button>
    </div>
  {/snippet}
  {@render demo(
    "Variants",
    "Semantic color variants (primary, secondary, success, warning, error).",
    variantsBody,
    `<Button variant="primary">Primary</Button>
<Button variant="success">Success</Button>
<Button variant="error">Error</Button>

<!-- With outline style -->
<Button variant="primary" buttonStyle="outline">Primary</Button>`,
    "b2",
  )}

  <!-- 3. SIZES -->
  {#snippet sizesBody()}
    <div class="flex-wrap align-center">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  {/snippet}
  {@render demo(
    "Sizes",
    "Available sizes: xs, sm, md (default), lg.",
    sizesBody,
    `<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>`,
    "b3",
  )}

  <!-- 4. SHAPES -->
  {#snippet shapesBody()}
    <div class="flex-wrap align-center gap-4">
      <Button>Default</Button>
      <Button shape="square" aria-label="Add">
        {#snippet iconOnly()}<Plus size={16} />{/snippet}
      </Button>
      <Button shape="circle" aria-label="Add">
        {#snippet iconOnly()}<Plus size={16} />{/snippet}
      </Button>
    </div>
  {/snippet}
  {@render demo(
    "Shapes",
    "Use default for text, square or circle for icon-only buttons.",
    shapesBody,
    `<!-- Default -->
<Button>Default</Button>

<!-- Square (icon only) -->
<Button shape="square" aria-label="Add">
  {#snippet iconOnly()}<Plus size={16} />{/snippet}
</Button>

<!-- Circle (icon only) -->
<Button shape="circle" aria-label="Add">
  {#snippet iconOnly()}<Plus size={16} />{/snippet}
</Button>`,
    "b4",
  )}

  <!-- 5. ICONS -->
  {#snippet iconsBody()}
    <div class="flex-wrap">
      <Button>
        {#snippet leadingIcon()}<Plus size={16} />{/snippet}
        Create
      </Button>
      <Button>
        Next
        {#snippet trailingIcon()}<ArrowRight size={16} />{/snippet}
      </Button>
      <Button variant="secondary">
        {#snippet leadingIcon()}<Download size={16} />{/snippet}
        Download
        {#snippet trailingIcon()}<ExternalLink size={16} />{/snippet}
      </Button>
      <Button variant="error" shape="circle" aria-label="Delete">
        {#snippet iconOnly()}<Trash2 size={16} />{/snippet}
      </Button>
    </div>
  {/snippet}
  {@render demo(
    "Icons",
    "Use leadingIcon, trailingIcon, or iconOnly snippets.",
    iconsBody,
    `<Button>
  {#snippet leadingIcon()}<Plus size={16} />{/snippet}
  Create
</Button>

<Button>
  Next
  {#snippet trailingIcon()}<ArrowRight size={16} />{/snippet}
</Button>

<Button variant="error" shape="circle" aria-label="Delete">
  {#snippet iconOnly()}<Trash2 size={16} />{/snippet}
</Button>`,
    "b5",
  )}

  <!-- 6. LOADING STATES -->
  {#snippet loadingBody()}
    <div class="flex-wrap">
      <Button loading>Loading (overlay)</Button>
      <Button loading loadingMode="replace" loadingText="Saving…">Save</Button>
      <Button loading loadingMode="inline">Processing</Button>
    </div>
    <div class="flex-wrap mt-4">
      <Button variant="primary" loading={saving} onclick={save}>
        {saving ? "Saving…" : "Click to save"}
      </Button>
    </div>
  {/snippet}
  {@render demo(
    "Loading states",
    "Control how the loading spinner appears using loadingMode (overlay, replace, inline).",
    loadingBody,
    `<!-- Overlay (default): keeps button size, spinner on top -->
<Button loading>Loading</Button>

<!-- Replace: swaps content with spinner + text -->
<Button loading loadingMode="replace" loadingText="Saving…">Save</Button>

<!-- Inline: spinner + text side by side -->
<Button loading loadingMode="inline">Processing</Button>

<!-- Bind to state -->
<Button loading={saving} onclick={save}>
  {saving ? 'Saving…' : 'Click to save'}
</Button>`,
    "b6",
  )}

  <!-- 7. FULL WIDTH & DISABLED -->
  {#snippet fullDisabledBody()}
    <div class="w-full space-y-2 max-w-sm">
      <Button fullWidth>Full Width</Button>
      <Button fullWidth buttonStyle="outline" disabled>Disabled</Button>
      <Button fullWidth loading={saving} onclick={save}>
        {saving ? "Saving…" : "Full Width + Loading"}
      </Button>
    </div>
  {/snippet}
  {@render demo(
    "Full width & Disabled",
    "Use fullWidth to stretch, and disabled to block interaction.",
    fullDisabledBody,
    `<Button fullWidth>Full Width</Button>
<Button fullWidth buttonStyle="outline" disabled>Disabled</Button>`,
    "b7",
  )}

  <!-- 8. ANCHOR SUPPORT -->
  {#snippet anchorBody()}
    <div class="flex-wrap">
      <Button href="https://github.com" target="_blank">
        {#snippet leadingIcon()}<ExternalLink size={16} />{/snippet}
        External Link (target="_blank")
      </Button>
      <Button href="/dashboard" buttonStyle="outline">Internal Link</Button>
      <Button href="/locked" aria-disabled={true}>Disabled Anchor</Button>
    </div>
  {/snippet}
  {@render demo(
    "Anchor (href)",
    'Passing href renders an <a> tag. Automatically adds rel="noopener noreferrer" for target="_blank".',
    anchorBody,
    `<Button href="https://github.com" target="_blank">
  External Link
</Button>

<Button href="/dashboard" buttonStyle="outline">
  Internal Link
</Button>

<Button href="/locked" aria-disabled={true}>
  Disabled Anchor
</Button>`,
    "b8",
  )}

  <!-- 9. CSS VARIABLE OVERRIDE -->
  {#snippet varsBody()}
    <!-- Wrapping in a div allows overriding local CSS variables per instance -->
    <div
      class="flex-wrap"
      style="--color-primary: #f92aad; --color-success: #10b981;"
    >
      <Button variant="primary">Custom Pink</Button>
      <Button variant="success" buttonStyle="outline">Custom Emerald</Button>
    </div>
  {/snippet}
  {@render demo(
    "CSS variable override",
    "Wrap the button in a container to override the --color-* theme tokens locally.",
    varsBody,
    `<!-- Override --color-primary for this specific section -->
<div style="--color-primary: #f92aad; --color-success: #10b981;">
  <Button variant="primary">Custom Pink</Button>
  <Button variant="success" buttonStyle="outline">Custom Emerald</Button>
</div>`,
    "b9",
  )}
</div>

<style>
  .preview {
    max-width: 900px;
    margin: 0 auto;
    padding: 8px 0;
  }
  .preview-head {
    margin-bottom: 24px;
  }
  .preview-head h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    text-transform: capitalize;
  }
  .preview-head p {
    margin: 6px 0 0;
    font-size: 13px;
    color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
  }

  .demo {
    border: 1px solid var(--color-base-300);
    border-radius: var(--radius-box);
    background: var(--color-base-100);
    overflow: hidden;
    margin-bottom: 20px;
  }
  .demo-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-base-300);
  }
  .demo-head h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  .demo-head p {
    margin: 2px 0 0;
    font-size: 12px;
    color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
  }

  .copy-btn {
    flex-shrink: 0;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    background: var(--color-base-200);
    border: 1px solid var(--color-base-300);
    border-radius: var(--radius-field);
    color: var(--color-base-content);
    cursor: pointer;
    transition: background-color 0.15s;
  }
  .copy-btn:hover {
    background: var(--color-base-300);
  }

  .demo-body {
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--color-base-200);
  }

  .flex-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-start;
  }
  .align-center {
    align-items: center;
  }
  .w-full {
    width: 100%;
  }
  .max-w-sm {
    max-width: 320px;
  }
  .space-y-2 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 8px;
  }
  .mt-4 {
    margin-top: 16px;
  }

  .demo-code {
    margin: 0;
    padding: 14px 16px;
    background: #0f172a;
    color: #e2e8f0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    line-height: 1.6;
    overflow-x: auto;
    border-top: 1px solid var(--color-base-300);
  }
  .demo-code code {
    white-space: pre;
  }
</style>
