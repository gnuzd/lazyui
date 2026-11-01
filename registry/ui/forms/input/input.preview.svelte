<script lang="ts">
  import Input from "./Input.svelte";
  import { Search, Mail, User, Lock } from "@lucide/svelte";

  // ===== STATE FOR LIVE DEMOS =====
  let basicText = $state("");
  let searchQuery = $state("");
  let password = $state("");
  let bio = $state("");
  let errorInput = $state("invalid-email");
  let hintInput = $state("john@example.com");
  let customVarInput = $state("Custom themed input");

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
    <h1>Input</h1>
    <p>
      Text fields, passwords, textareas, icons, clear buttons, and validation
      states.
    </p>
  </header>

  <!-- 1. BASIC -->
  {#snippet basicBody()}
    <div class="field">
      <Input
        label="Full Name"
        placeholder="Enter your name..."
        bind:value={basicText}
      />
    </div>
    <div class="output">value: <code>{basicText || "empty"}</code></div>
  {/snippet}
  {@render demo(
    "Basic Input",
    "Standard text input with a label and placeholder.",
    basicBody,
    `<Input 
  label="Full Name" 
  placeholder="Enter your name..." 
  bind:value={basicText} 
/>`,
    "i1",
  )}

  <!-- 2. SIZES -->
  {#snippet sizesBody()}
    <div class="field gap-4">
      <Input size="sm" placeholder="Small input" />
      <Input size="md" placeholder="Medium input (default)" />
      <Input size="lg" placeholder="Large input" />
    </div>
  {/snippet}
  {@render demo(
    "Sizes",
    "Available sizes: sm, md, lg.",
    sizesBody,
    `<Input size="sm" placeholder="Small input" />
<Input size="md" placeholder="Medium input (default)" />
<Input size="lg" placeholder="Large input" />`,
    "i2",
  )}

  <!-- 3. ICONS -->
  {#snippet iconsBody()}
    <div class="field gap-4">
      <Input placeholder="Search...">
        {#snippet leadingIcon()}<Search size={16} />{/snippet}
      </Input>

      <Input placeholder="Email address">
        {#snippet leadingIcon()}<Mail size={16} />{/snippet}
      </Input>
    </div>
  {/snippet}
  {@render demo(
    "Icons",
    "Add leading or trailing icons using snippets.",
    iconsBody,
    `<Input placeholder="Search...">
  {#snippet leadingIcon()}<Search size={16} />{/snippet}
</Input>

<Input placeholder="Email address">
  {#snippet leadingIcon()}<Mail size={16} />{/snippet}
</Input>`,
    "i3",
  )}

  <!-- 4. PASSWORD & CLEARABLE -->
  {#snippet specialBody()}
    <div class="field gap-4">
      <Input
        type="password"
        label="Password"
        placeholder="Enter password"
        bind:value={password}
      />
      <Input
        label="Search with clear"
        placeholder="Type to search..."
        bind:value={searchQuery}
        clearable
      >
        {#snippet leadingIcon()}<Search size={16} />{/snippet}
      </Input>
    </div>
  {/snippet}
  {@render demo(
    "Password & Clearable",
    "Password inputs get an automatic visibility toggle. Set clearable to show an X button when typing.",
    specialBody,
    `<!-- Password toggle is built-in for type="password" -->
<Input type="password" label="Password" bind:value={password} />

<!-- Add clearable to show a clear button -->
<Input label="Search" bind:value={searchQuery} clearable>
  {#snippet leadingIcon()}<Search size={16} />{/snippet}
</Input>`,
    "i4",
  )}

  <!-- 5. TEXTAREA -->
  {#snippet textareaBody()}
    <div class="field">
      <Input
        type="textarea"
        label="Bio"
        placeholder="Tell us about yourself..."
        bind:value={bio}
      />
    </div>
    <div class="output">value: <code>{bio || "empty"}</code></div>
  {/snippet}
  {@render demo(
    "Textarea",
    'Use type="textarea" for multi-line input.',
    textareaBody,
    `<Input 
  type="textarea" 
  label="Bio" 
  placeholder="Tell us about yourself..." 
  bind:value={bio} 
/>`,
    "i5",
  )}

  <!-- 6. VALIDATION STATES -->
  {#snippet validationBody()}
    <div class="field gap-4">
      <Input
        label="Email (Error)"
        bind:value={errorInput}
        error="Please enter a valid email address."
      />
      <Input
        label="Email (Hint)"
        bind:value={hintInput}
        hint="We'll never share your email."
      />
    </div>
  {/snippet}
  {@render demo(
    "Validation",
    "Use error to show a red state with a message, or hint for helper text.",
    validationBody,
    `<Input 
  label="Email (Error)" 
  bind:value={errorInput} 
  error="Please enter a valid email address." 
/>

<Input 
  label="Email (Hint)" 
  bind:value={hintInput} 
  hint="We'll never share your email." 
/>`,
    "i6",
  )}

  <!-- 7. DISABLED & READ-ONLY -->
  {#snippet disabledBody()}
    <div class="field gap-4">
      <Input label="Disabled Input" placeholder="Cannot type here" disabled />
      <Input label="Read-only Input" value="Read only value" readonly />
    </div>
  {/snippet}
  {@render demo(
    "Disabled & Read-only",
    "disabled blocks interaction, readonly allows selection and copy.",
    disabledBody,
    `<Input label="Disabled Input" disabled />
<Input label="Read-only Input" value="Read only value" readonly />`,
    "i7",
  )}

  <!-- 8. CSS VARIABLES OVERRIDE -->
  {#snippet varsBody()}
    <div class="field gap-4">
      <Input
        label="Custom Accent"
        bind:value={customVarInput}
        vars={{
          "--input-accent": "var(--color-accent)",
          "--input-radius": "2rem",
        }}
      />
      <Input
        label="Custom Error"
        placeholder="Search..."
        error="Error with custom color"
        vars={{
          "--input-error": "var(--color-warning)",
        }}
      >
        {#snippet leadingIcon()}<Search size={16} />{/snippet}
      </Input>
    </div>
  {/snippet}
  {@render demo(
    "CSS variable override",
    "Pass the vars prop to override any internal --input-* token for specific instances.",
    varsBody,
    `<!-- Override internal CSS variables directly -->
<Input 
  label="Custom Accent" 
  bind:value={value} 
  vars={{ 
    '--input-accent': 'var(--color-accent)', 
    '--input-radius': '2rem' 
  }} 
/>

<Input 
  label="Custom Error" 
  error="Error with custom color"
  vars={{ '--input-error': 'var(--color-warning)' }}
>
  {#snippet leadingIcon()}<Search size={16} />{/snippet}
</Input>`,
    "i8",
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

  .field {
    max-width: 360px;
    display: flex;
    flex-direction: column;
  }
  .gap-4 {
    gap: 16px;
  }

  .output {
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
    padding: 8px 10px;
    background: var(--color-base-100);
    border: 1px dashed var(--color-base-300);
    border-radius: var(--radius-field);
  }
  .output code {
    color: var(--color-base-content);
    font-weight: 600;
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
