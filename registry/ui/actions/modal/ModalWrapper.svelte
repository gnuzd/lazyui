<script lang="ts">
  import { modal, type ModalInstance } from "../../_utils/modal.svelte";
  import X from "@lucide/svelte/icons/x";
  import { fly, fade } from "svelte/transition";

  let { instance }: { instance: ModalInstance } = $props();

  const onClose = () => modal.close(instance.id);

  // Use $derived to safely extract the component for dynamic rendering.
  // This avoids the {@const} block restriction in Svelte 5.
  const Render = $derived(instance.component);

  function handleBackdropClick(e: MouseEvent) {
    if (
      instance.options.dismissible !== false &&
      e.target === e.currentTarget
    ) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && instance.options.dismissible !== false) {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="modal-backdrop"
  transition:fade={{ duration: 150 }}
  onclick={handleBackdropClick}
  role="presentation"
>
  <div
    class="modal-panel size-{instance.options.size}"
    transition:fly={{ y: 10, duration: 200 }}
    role="dialog"
    aria-modal="true"
  >
    <header class="modal-header">
      <h2 class="modal-title">{instance.options.title || ""}</h2>
      {#if instance.options.dismissible !== false}
        <button class="modal-close" onclick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>
      {/if}
    </header>

    <div class="modal-content">
      <!-- Dynamically render the component with safely defaulted props -->
      <Render {...instance.options.props ?? {}} {onClose} />
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .modal-panel {
    background: var(--color-base-100, #fff);
    color: var(--color-base-content, #0f172a);
    border: 1px solid var(--color-base-300, #e5e7eb);
    border-radius: var(--radius-box, 1rem);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    width: 100%;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    font-family: inherit;
  }

  /* Sizes */
  .size-sm {
    max-width: 400px;
  }
  .size-md {
    max-width: 500px;
  }
  .size-lg {
    max-width: 700px;
  }
  .size-xl {
    max-width: 900px;
  }
  .size-full {
    max-width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-base-300, #e5e7eb);
  }

  .modal-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .modal-close {
    background: transparent;
    border: none;
    color: color-mix(
      in oklch,
      var(--color-base-content, #0f172a) 60%,
      transparent
    );
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-field, 0.5rem);
    display: grid;
    place-items: center;
    transition:
      background-color 0.15s,
      color 0.15s;
  }
  .modal-close:hover {
    background: var(--color-base-200, #f1f2f5);
    color: var(--color-base-content, #0f172a);
  }

  .modal-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }
</style>
