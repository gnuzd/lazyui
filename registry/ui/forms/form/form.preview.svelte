<script lang="ts">
  import { z } from "zod";
  import Input from "../input/Input.svelte";
  import CodeBlock from "../../CodeBlock.svelte";
  import { createForm } from "../../_utils/form.svelte";

  // ===== COPY SNIPPET HELPER =====
  let copied = $state<string | null>(null);
  async function copy(key: string, code: string) {
    await navigator.clipboard.writeText(code);
    copied = key;
    setTimeout(() => (copied = null), 1500);
  }

  // ===== STATE FOR LIVE DEMOS =====

  // 1. Basic Form
  const basicForm = createForm(
    z.object({
      name: z.string().min(2, "Name must be at least 2 characters"),
    }),
    { name: "" }
  );

  // 2. Advanced Form (Async Validation & Submitting)
  const advancedForm = createForm(
    z.object({
      email: z.email("Invalid email address"),
      password: z.string().min(8, "Password must be at least 8 characters"),
    }),
    { email: "", password: "" },
    {
      async onSubmit(values) {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        if (values.email === "admin@example.com") {
          return {
            success: false,
            errors: { email: "This email is already in use" },
          };
        }
        
        return {
          success: true,
          message: "Account registered successfully!",
        };
      },
    }
  );

  // 3. Server Action Form (SvelteKit enhance)
  const serverForm = createForm(
    z.object({
      title: z.string().min(1, "Title is required"),
    }),
    { title: "" }
  );
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
    <h1>Create Form</h1>
    <p>
      Headless form state management with Zod validation. Works seamlessly on both Client and Server (SvelteKit).
    </p>
  </header>

  <!-- 1. BASIC FORM -->
  {#snippet basicBody()}
    <form use:basicForm.enhance novalidate class="form-demo">
      <Input
        label="Full Name"
        placeholder="Enter your name..."
        bind:value={basicForm.form.name}
        onblur={() => basicForm.validateField("name")}
        error={basicForm.errors.name}
      />
      <button type="submit" class="submit-btn" disabled={basicForm.submitting}>
        Save
      </button>
    </form>
    <div class="output">
      isValid: <code>{basicForm.isValid}</code> | isTainted: <code>{basicForm.isTainted}</code>
    </div>
  {/snippet}
  {@render demo(
    "Basic Form",
    "Standard form validation using a Zod schema. Automatically validates on blur.",
    basicBody,
    `<script lang="ts">
  import { z } from 'zod';
  import { createForm } from './form.svelte';
  import Input from '../input/Input.svelte';

  const form = createForm(
    z.object({
      name: z.string().min(2, "Name must be at least 2 characters")
    }),
    { name: '' }
  );
<\/script>

<form use:form.enhance novalidate>
  <Input
    label="Full Name"
    bind:value={form.form.name}
    onblur={() => form.validateField("name")}
    error={form.errors.name}
  />
  <button type="submit" disabled={form.submitting}>Save</button>
</form>`,
    "f1"
  )}

  <!-- 2. ASYNC SUBMIT & VALIDATION -->
  {#snippet advancedBody()}
    <form use:advancedForm.enhance novalidate class="form-demo">
      <Input
        label="Email"
        type="email"
        placeholder="Enter your email..."
        bind:value={advancedForm.form.email}
        onblur={() => advancedForm.validateField("email")}
        error={advancedForm.errors.email}
      />
      <Input
        label="Password"
        type="password"
        placeholder="Enter your password..."
        bind:value={advancedForm.form.password}
        onblur={() => advancedForm.validateField("password")}
        error={advancedForm.errors.password}
      />
      <button type="submit" class="submit-btn" disabled={advancedForm.submitting}>
        {advancedForm.submitting 
          ? (advancedForm.delayed ? "Submitting..." : "Processing...") 
          : "Register"}
      </button>

      {#if advancedForm.message}
        <div class="message-success">{advancedForm.message}</div>
      {/if}
    </form>
  {/snippet}
  {@render demo(
    "Async Submit & Errors",
    "Use onSubmit to call an API. Handles submitting, delayed states, and server-returned errors.",
    advancedBody,
    `<script lang="ts">
  import { z } from 'zod';
  import { createForm } from './form.svelte';
  import Input from '../input/Input.svelte';

  const form = createForm(
    z.object({
      email: z.email(),
      password: z.string().min(8)
    }),
    { email: '', password: '' },
    {
      async onSubmit(values) {
        // Call API
        const res = await fetch('/api/register', {
          method: 'POST',
          body: JSON.stringify(values)
        });
        return res.json(); // { success, errors, message }
      }
    }
  );
<\/script>

<form use:form.enhance novalidate>
  <Input
    label="Email"
    bind:value={form.form.email}
    onblur={() => form.validateField('email')}
    error={form.errors.email}
  />
  <Input
    label="Password"
    type="password"
    bind:value={form.form.password}
    onblur={() => form.validateField('password')}
    error={form.errors.password}
  />
  
  <button type="submit" disabled={form.submitting}>
    {form.submitting ? 'Submitting...' : 'Register'}
  </button>

  {#if form.message}
    <p>{form.message}</p>
  {/if}
</form>`,
    "f2"
  )}

  <!-- 3. SERVER ACTION (SVELTEKIT) -->
  {#snippet serverBody()}
    <form use:serverForm.enhance action="?/create" novalidate class="form-demo">
      <Input
        label="Post Title"
        placeholder="Enter post title..."
        bind:value={serverForm.form.title}
        onblur={() => serverForm.validateField("title")}
        error={serverForm.errors.title}
      />
      <button type="submit" class="submit-btn" disabled={serverForm.submitting}>
        Create Post
      </button>
    </form>
    <div class="output">
      * This form uses action="?/create". If onSubmit is not provided, it automatically sends a POST request and parses the SvelteKit response.
    </div>
  {/snippet}
  {@render demo(
    "SvelteKit Server Action",
    "Automatically works with SvelteKit's use:enhance. Just declare the action on the form tag.",
    serverBody,
    `<script lang="ts">
  import { z } from 'zod';
  import { createForm } from './form.svelte';
  import Input from '../input/Input.svelte';

  const form = createForm(
    z.object({ title: z.string().min(1) }),
    { title: '' }
  );
<\/script>

<!-- Submit directly to SvelteKit Server Action -->
<form use:form.enhance action="?/create" novalidate>
  <Input
    label="Post Title"
    bind:value={form.form.title}
    onblur={() => form.validateField('title')}
    error={form.errors.title}
  />
  <button type="submit" disabled={form.submitting}>
    Create Post
  </button>
</form>

<!-- +page.server.ts -->
// import { validate, formDataToObject } from '$lib/form.server';
// const schema = z.object({ title: z.string().min(1) });
// export const actions = {
//   create: async ({ request }) => {
//     const fd = await request.formData();
//     const result = await validate(schema, formDataToObject(schema, fd));
//     if (!result.success) return fail(400, { errors: result.errors });
//     return { success: true, message: "Created successfully" };
//   }
// };`,
    "f3"
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

  /* Form specific styles */
  .form-demo {
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .submit-btn {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    background: var(--color-primary);
    color: var(--color-primary-content);
    border: none;
    border-radius: var(--radius-field);
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .submit-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .message-success {
    padding: 10px 12px;
    font-size: 13px;
    color: var(--color-success-content, #065f46);
    background: var(--color-success, #d1fae5);
    border-radius: var(--radius-field);
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
</style>
