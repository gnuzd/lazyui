<script lang="ts">
  import { modal } from "../../_utils/modal.svelte";
  import ModalWrapper from "./ModalWrapper.svelte";
</script>

{#each modal.instances as instance (instance.id)}
  <ModalWrapper {instance} />
{/each}
