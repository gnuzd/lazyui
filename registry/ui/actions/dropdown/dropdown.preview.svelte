<script lang="ts">
  import Dropdown, {
    type FetchContext,
    type FetchResult,
    type Option,
  } from "./Dropdown.svelte";
  import CodeBlock from "../../CodeBlock.svelte";
  import { ChevronDown, Users, Check, Search } from "@lucide/svelte";

  // ===== MOCK DATA =====
  const fruits: Option<string>[] = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "cherry", label: "Cherry", description: "Sweet and red" },
    { value: "durian", label: "Durian", disabled: true },
    { value: "elderberry", label: "Elderberry" },
    { value: "fig", label: "Fig" },
  ];

  const USERS = [
    { id: "1", name: "Alice Johnson", email: "alice@example.com" },
    { id: "2", name: "Bob Smith", email: "bob@example.com" },
    { id: "3", name: "Carol Williams", email: "carol@example.com" },
    { id: "4", name: "David Brown", email: "david@example.com" },
    { id: "5", name: "Eve Davis", email: "eve@example.com" },
  ];

  async function fetchUsers({
    query,
    signal,
  }: FetchContext): Promise<Option<string>[]> {
    await new Promise((r) => setTimeout(r, 400)); // Simulate network delay
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const q = query.toLowerCase();
    return USERS.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    ).map((u) => ({
      value: u.id,
      label: u.name,
      description: u.email,
    }));
  }

  const ALL_ITEMS = Array.from({ length: 55 }, (_, i) => ({
    id: String(i + 1),
    name: `Item ${i + 1}`,
    desc: `Description for item ${i + 1}`,
  }));

  async function fetchPaginated({
    query,
    signal,
    page,
    pageSize,
  }: FetchContext): Promise<FetchResult<string>> {
    await new Promise((r) => setTimeout(r, 500));
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const q = query.toLowerCase();
    const filtered = ALL_ITEMS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q),
    );
    const start = page * pageSize;
    const end = start + pageSize;
    return {
      options: filtered.slice(start, end).map((item) => ({
        value: item.id,
        label: item.name,
        description: item.desc,
      })),
      total: filtered.length,
      hasMore: end < filtered.length,
    };
  }

  async function fetchFailing(_ctx: FetchContext): Promise<never> {
    await new Promise((r) => setTimeout(r, 300));
    if (_ctx.signal.aborted) throw new DOMException("Aborted", "AbortError");
    throw new Error("Network error");
  }

  // ===== STATE =====
  let single = $state<string | null>(null);
  let multi = $state<string[]>([]);
  let userId = $state<string | null>(null);
  let assignees = $state<string[]>([]);
  let custom = $state<string | null>(null);
  let paginatedSingle = $state<string | null>(null);

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
    <div class="demo-code-wrap">
      <CodeBlock {code} lang="xml" />
    </div>
  </section>
{/snippet}

<div class="preview">
  <header class="preview-head">
    <h1>Dropdown</h1>
    <p>
      Single / multi select, static / fetch options, pagination, custom trigger.
    </p>
  </header>

  <!-- 1. SINGLE STATIC -->
  {#snippet singleBody()}
    <div class="field">
      <Dropdown
        label="Fruit"
        placeholder="Pick a fruit"
        options={fruits}
        bind:value={single}
      />
    </div>
    <div class="output">selected: <code>{single ?? "null"}</code></div>
  {/snippet}
  {@render demo(
    "Single · static",
    "Basic single select with static options.",
    singleBody,
    `<script lang="ts">
  import Dropdown, { type Option } from './Dropdown.svelte';

  const fruits: Option<string>[] = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "cherry", label: "Cherry", description: "Sweet and red" },
    { value: "durian", label: "Durian", disabled: true },
    { value: "elderberry", label: "Elderberry" },
    { value: "fig", label: "Fig" },
  ];

  let single = $state<string | null>(null);
<\/script>

<Dropdown 
  label="Fruit" 
  placeholder="Pick a fruit"
  options={fruits} 
  bind:value={single} 
/>`,
    "d1",
  )}

  <!-- 2. MULTI STATIC -->
  {#snippet multiBody()}
    <div class="field">
      <Dropdown
        label="Fruits"
        placeholder="Pick fruits"
        options={fruits}
        searchable
        multiple
        bind:value={multi}
      />
    </div>
    <div class="output">selected: <code>{JSON.stringify(multi)}</code></div>
  {/snippet}
  {@render demo(
    "Multi · static",
    "multiple enables chip-based multi select.",
    multiBody,
    `<script lang="ts">
  import Dropdown, { type Option } from './Dropdown.svelte';

  const fruits: Option<string>[] = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "cherry", label: "Cherry", description: "Sweet and red" },
    { value: "durian", label: "Durian", disabled: true },
    { value: "elderberry", label: "Elderberry" },
    { value: "fig", label: "Fig" },
  ];

  let multi = $state<string[]>([]);
<\/script>

<Dropdown 
  label="Fruits" 
  placeholder="Pick fruits"
  options={fruits} 
  searchable 
  multiple 
  bind:value={multi} 
/>`,
    "d2",
  )}

  <!-- 3. SINGLE FETCH -->
  {#snippet fetchSingleBody()}
    <div class="field">
      <Dropdown
        label="User"
        placeholder="Search users…"
        fetchOptions={fetchUsers}
        searchable
        bind:value={userId}
      />
    </div>
    <div class="output">selected: <code>{userId ?? "null"}</code></div>
  {/snippet}
  {@render demo(
    "Single · fetch",
    "fetchOptions receives ({ query, signal, page, pageSize }).",
    fetchSingleBody,
    `<script lang="ts">
  import Dropdown, { type FetchContext, type Option } from './Dropdown.svelte';

  const USERS = [
    { id: "1", name: "Alice Johnson", email: "alice@example.com" },
    { id: "2", name: "Bob Smith", email: "bob@example.com" },
    { id: "3", name: "Carol Williams", email: "carol@example.com" },
  ];

  async function fetchUsers({ query, signal }: FetchContext): Promise<Option<string>[]> {
    await new Promise((r) => setTimeout(r, 400));
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    
    const q = query.toLowerCase();
    return USERS.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ).map((u) => ({
      value: u.id,
      label: u.name,
      description: u.email,
    }));
  }

  let userId = $state<string | null>(null);
<\/script>

<Dropdown 
  label="User" 
  placeholder="Search users…"
  fetchOptions={fetchUsers} 
  searchable 
  bind:value={userId} 
/>`,
    "d3",
  )}

  <!-- 4. PAGINATION (INFINITE SCROLL) -->
  {#snippet paginationBody()}
    <div class="field">
      <Dropdown
        label="Paginated Items"
        placeholder="Scroll down to load more…"
        fetchOptions={fetchPaginated}
        searchable
        paginate={true}
        pageSize={10}
        bind:value={paginatedSingle}
      />
    </div>
  {/snippet}
  {@render demo(
    "Pagination",
    "Use paginate={true} to load more items when scrolling near the bottom.",
    paginationBody,
    `<script lang="ts">
  import Dropdown, { type FetchContext, type FetchResult } from './Dropdown.svelte';

  const ALL_ITEMS = Array.from({ length: 55 }, (_, i) => ({
    id: String(i + 1),
    name: \`Item \${i + 1}\`,
    desc: \`Description for item \${i + 1}\`,
  }));

  async function fetchPaginated({ query, signal, page, pageSize }: FetchContext): Promise<FetchResult<string>> {
    await new Promise((r) => setTimeout(r, 500));
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    
    const q = query.toLowerCase();
    const filtered = ALL_ITEMS.filter(
      (item) => item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
    );
    
    const start = page * pageSize;
    const end = start + pageSize;
    
    return {
      options: filtered.slice(start, end).map((item) => ({
        value: item.id,
        label: item.name,
        description: item.desc,
      })),
      total: filtered.length,
      hasMore: end < filtered.length,
    };
  }

  let value = $state<string | null>(null);
<\/script>

<Dropdown
  label="Paginated Items"
  fetchOptions={fetchPaginated}
  searchable
  paginate={true}
  pageSize={10}
  bind:value={value}
/>`,
    "d4",
  )}

  <!-- 5. CUSTOM TRIGGER -->
  {#snippet customTriggerBody()}
    <div class="field">
      <Dropdown options={fruits} bind:value={custom}>
        {#snippet trigger({ open, toggle, disabled })}
          <button
            type="button"
            class="custom-trigger"
            class:open
            {disabled}
            onclick={toggle}
          >
            <Users size={16} />
            <span>
              {custom
                ? fruits.find((f) => f.value === custom)?.label
                : "Pick a fruit"}
            </span>
            <ChevronDown size={14} class="chev {open ? 'rotate' : ''}" />
          </button>
        {/snippet}
      </Dropdown>
    </div>
  {/snippet}
  {@render demo(
    "Custom trigger",
    "Pass a trigger snippet to render your own button.",
    customTriggerBody,
    `<script lang="ts">
  import Dropdown, { type Option } from './Dropdown.svelte';
  import { ChevronDown, Users } from '@lucide/svelte';

  const fruits: Option<string>[] = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
  ];

  let custom = $state<string | null>(null);
<\/script>

<Dropdown options={fruits} bind:value={custom}>
  {#snippet trigger({ open, toggle, disabled })}
    <button type="button" class="custom-trigger" class:open {disabled} onclick={toggle}>
      <Users size={16} />
      <span>{custom ?? 'Pick a fruit'}</span>
      <ChevronDown size={14} class="chev {open ? 'rotate' : ''}" />
    </button>
  {/snippet}
</Dropdown>`,
    "d5",
  )}

  <!-- 6. CUSTOM OPTION RENDER -->
  {#snippet customOptionBody()}
    <div class="field">
      <Dropdown
        label="Assignees"
        fetchOptions={fetchUsers}
        searchable
        multiple
        bind:value={assignees}
      >
        {#snippet renderOption(opt, selected)}
          <div class="user-option">
            <div class="avatar">{opt.label.charAt(0)}</div>
            <div class="user-meta">
              <span class="user-name">{opt.label}</span>
              <span class="user-email">{opt.description}</span>
            </div>
            {#if selected}
              <Check size={14} class="check" />
            {/if}
          </div>
        {/snippet}
      </Dropdown>
    </div>
  {/snippet}
  {@render demo(
    "Custom option",
    "Use renderOption snippet to render each option.",
    customOptionBody,
    `<script lang="ts">
  import Dropdown, { type FetchContext, type Option } from './Dropdown.svelte';
  import { Check } from '@lucide/svelte';

  async function fetchUsers({ query, signal }: FetchContext): Promise<Option<string>[]> {
    const res = await fetch(\`/api/users?q=\${query}\`, { signal });
    return (await res.json()).map((u) => ({ value: u.id, label: u.name, description: u.email }));
  }

  let assignees = $state<string[]>([]);
<\/script>

<Dropdown fetchOptions={fetchUsers} multiple bind:value={assignees}>
  {#snippet renderOption(opt, selected)}
    <div class="user-option">
      <div class="avatar">{opt.label.charAt(0)}</div>
      <span>{opt.label}</span>
      {#if selected} <Check /> {/if}
    </div>
  {/snippet}
</Dropdown>`,
    "d6",
  )}

  <!-- 7. ERROR STATE -->
  {#snippet errorBody()}
    <div class="field">
      <Dropdown
        label="Failing fetch"
        placeholder="Try opening…"
        fetchOptions={fetchFailing}
        searchable
        bind:value={single}
      />
    </div>
  {/snippet}
  {@render demo(
    "Error state",
    "If fetchOptions rejects, the panel shows errorText.",
    errorBody,
    `<script lang="ts">
  import Dropdown, { type FetchContext } from './Dropdown.svelte';

  async function fetchFailing(_ctx: FetchContext): Promise<never> {
    await new Promise((r) => setTimeout(r, 300));
    if (_ctx.signal.aborted) throw new DOMException("Aborted", "AbortError");
    throw new Error("Network error");
  }

  let value = $state<string | null>(null);
<\/script>

<Dropdown 
  label="Failing fetch" 
  fetchOptions={fetchFailing} 
  searchable 
  bind:value={value} 
/>`,
    "d7",
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
    margin-bottom: 24px;
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
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .field {
    max-width: 360px;
    display: flex;
    flex-direction: column;
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

  .demo-code-wrap {
    border-top: 1px solid var(--color-base-300);
  }

  /* Custom trigger styling */
  .custom-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 40px;
    padding: 0 12px;
    background: var(--color-base-100);
    border: 1px solid var(--color-base-300);
    border-radius: var(--radius-field);
    color: var(--color-base-content);
    font-size: 13px;
    cursor: pointer;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .custom-trigger:hover {
    border-color: var(--color-primary);
  }
  .custom-trigger.open {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px
      color-mix(in oklch, var(--color-primary) 20%, transparent);
  }
  .custom-trigger .chev {
    transition: transform 0.15s;
  }
  .custom-trigger .chev.rotate {
    transform: rotate(180deg);
  }

  /* User Option Render */
  .user-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }
  .avatar {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: color-mix(in oklch, var(--color-primary) 15%, transparent);
    color: var(--color-primary);
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .user-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .user-name {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .user-email {
    font-size: 11px;
    color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
  }
  .check {
    color: var(--color-primary);
    flex-shrink: 0;
  }
</style>
