<script lang="ts">
  import { modal } from "../../_utils/modal.svelte";
  import ModalContent from "./preview/ModalContent.svelte";
  import Button from "../button/Button.svelte";

  // ===== COPY SNIPPET HELPER =====
  let copied = $state<string | null>(null);
  async function copy(key: string, code: string) {
    await navigator.clipboard.writeText(code);
    copied = key;
    setTimeout(() => (copied = null), 1500);
  }

  // ===== DEMO TRIGGERS =====
  function openBasic() {
    modal.open(ModalContent, {
      title: "Basic Modal",
      props: {
        title: "Welcome to the Modal",
        description:
          "This modal is rendered via the imperative API. You can close it by clicking the backdrop, pressing Escape, or clicking Cancel.",
      },
      onDismiss: () => console.log("Basic modal dismissed"),
    });
  }

  function openNonDismissible() {
    modal.open(ModalContent, {
      title: "Action Required",
      dismissible: false, // Prevent backdrop/escape close
      props: {
        title: "Terms of Service",
        description:
          "You cannot close this modal by clicking outside or pressing Escape. You must click the Cancel button.",
      },
    });
  }

  function openSized(size: "sm" | "md" | "lg" | "full") {
    modal.open(ModalContent, {
      title: `Size: ${size}`,
      size,
      props: {
        title: `This is a ${size} modal`,
        description:
          "Modals come in different max-widths. Full screen takes up the entire viewport.",
      },
    });
  }
</script>

<!-- Reusable Demo Card Snippet -->
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
    <h1>Modal</h1>
    <p>
      Imperative, type-safe modals with nested support and customizable actions.
    </p>
  </header>

  <!-- 1. BASIC MODAL -->
  {#snippet basicBody()}
    <div class="flex-wrap">
      <Button onclick={openBasic}>Open Basic Modal</Button>
    </div>
  {/snippet}
  {@render demo(
    "Basic Modal",
    "Opens a standard modal with a title, description, and injected onClose prop.",
    basicBody,
    `import { modal } from './modal.svelte';
import ModalContent from './ModalContent.svelte';

function openBasic() {
  modal.open(ModalContent, {
    title: 'Basic Modal',
    props: {
      title: 'Welcome',
      description: 'This is a basic modal.',
    },
    onDismiss: () => console.log('Dismissed!'),
  });
}`,
    "m1",
  )}

  <!-- 2. SIZES -->
  {#snippet sizesBody()}
    <div class="flex-wrap">
      <Button
        variant="secondary"
        buttonStyle="outline"
        onclick={() => openSized("sm")}>Small</Button
      >
      <Button
        variant="secondary"
        buttonStyle="outline"
        onclick={() => openSized("md")}>Medium</Button
      >
      <Button
        variant="secondary"
        buttonStyle="outline"
        onclick={() => openSized("lg")}>Large</Button
      >
      <Button
        variant="secondary"
        buttonStyle="outline"
        onclick={() => openSized("full")}>Full Screen</Button
      >
    </div>
  {/snippet}
  {@render demo(
    "Sizes",
    "Control the max-width of the modal using the size option.",
    sizesBody,
    `modal.open(ModalContent, {
  title: 'Full Screen',
  size: 'full', // 'sm' | 'md' | 'lg' | 'xl' | 'full'
  props: { ... }
});`,
    "m2",
  )}

  <!-- 3. NON-DISMISSIBLE -->
  {#snippet nonDismissibleBody()}
    <div class="flex-wrap">
      <Button variant="warning" onclick={openNonDismissible}
        >Force Action Modal</Button
      >
    </div>
  {/snippet}
  {@render demo(
    "Non-dismissible",
    "Set dismissible: false to force the user to use the action buttons. Backdrop clicks and Escape are disabled.",
    nonDismissibleBody,
    `modal.open(ModalContent, {
  title: 'Action Required',
  dismissible: false, 
  props: { ... }
});`,
    "m3",
  )}

  <!-- 4. NESTED MODALS -->
  {#snippet nestedBody()}
    <div class="flex-wrap">
      <Button variant="accent" onclick={openBasic}>Open Parent Modal</Button>
    </div>
    <p class="text-sm text-base-content/60 mt-2">
      Click "Open Nested" inside the modal to spawn a child modal.
    </p>
  {/snippet}
  {@render demo(
    "Nested Modals",
    "The store stacks instances in an array, allowing modals to spawn other modals naturally.",
    nestedBody,
    `// Inside a modal component:
function openNested() {
  modal.open(ModalContent, {
    title: 'Nested',
    size: 'sm',
    props: { ... }
  });
}`,
    "m4",
  )}

  <!-- 5. CLOSE ALL -->
  {#snippet closeAllBody()}
    <div class="flex-wrap">
      <Button variant="primary" onclick={openBasic}>Open Modal</Button>
      <Button
        variant="error"
        buttonStyle="outline"
        onclick={() => modal.closeAll()}>Close All Modals</Button
      >
    </div>
  {/snippet}
  {@render demo(
    "Close All",
    "Useful for routing changes or global shortcuts. Forcefully closes and clears the modal stack.",
    closeAllBody,
    `import { modal } from './modal.svelte';

// Clears the entire stack and triggers onDismiss for all
modal.closeAll();`,
    "m5",
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

  /* Demo Card matching the Layout Theme */
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
    background: var(--base-200);
  }

  .flex-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-start;
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
    border-top: 1px solid var(--base-300);
  }
  .demo-code code {
    white-space: pre;
  }
</style>
