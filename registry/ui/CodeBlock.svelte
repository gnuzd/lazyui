<script lang="ts">
  import hljs from "highlight.js";

  let { code, lang = "xml" }: { code: string; lang?: string } = $props();
  let el: HTMLElement;

  $effect(() => {
    if (el && code) {
      const result = hljs.highlight(code, { language: lang });
      el.innerHTML = result.value;
    }
  });
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css"
  />
</svelte:head>

<pre class="code-block rounded-t-none!"><code bind:this={el} class="hljs {lang}"
  ></code></pre>

<style>
  .code-block {
    margin: 0;
    padding: 16px;
    background: #282c34;
    border-radius: var(--radius-box);
    overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    line-height: 1.6;
  }
  .code-block code {
    background: transparent;
    padding: 0;
  }
</style>
