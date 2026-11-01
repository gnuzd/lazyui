<script lang="ts">
  import Button from "../../button/Button.svelte";

  let {
    title,
    description,
    onClose,
  }: {
    title: string;
    description: string;
    onClose: () => void;
  } = $props();
</script>

<div class="space-y-6">
  <div>
    <h3 class="text-lg font-bold text-base-content">{title}</h3>
    <p class="text-sm text-base-content/70 mt-1">{description}</p>
  </div>

  <div class="flex justify-end gap-3">
    <Button buttonStyle="ghost" onclick={onClose}>Close Nested</Button>
  </div>
</div>

<style>
  .space-y-6 > * + * {
    margin-top: 1.5rem;
  }
  .text-lg {
    font-size: 1.125rem;
    line-height: 1.75rem;
  }
  .font-bold {
    font-weight: 700;
  }
  .text-sm {
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
  .text-base-content {
    color: var(--base-content);
  }
  .text-base-content\/70 {
    color: color-mix(in oklch, var(--base-content) 70%, transparent);
  }
  .mt-1 {
    margin-top: 0.25rem;
  }
  .flex {
    display: flex;
  }
  .justify-end {
    justify-content: flex-end;
  }
  .gap-3 {
    gap: 0.75rem;
  }
</style>
