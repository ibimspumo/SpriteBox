<!-- PromptDisplay Molecule -->
<script lang="ts">
  interface Prompt {
    prefix: string;
    subject: string;
    suffix: string;
  }

  interface Props {
    prompt: Prompt | null | undefined;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    centered?: boolean;
  }

  let {
    prompt,
    label,
    size = 'md',
    centered = false
  }: Props = $props();
</script>

{#if prompt}
  <div class="prompt-display {size}" class:centered>
    {#if label}
      <span class="label">{label}</span>
    {/if}
    <span class="text">
      <span class="prefix">{prompt.prefix}</span>
      <span class="subject">{prompt.subject}</span>
      <span class="suffix">{prompt.suffix}</span>
    </span>
  </div>
{/if}

<style>
  .prompt-display {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .prompt-display.centered {
    align-items: center;
    text-align: center;
  }

  .label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .text {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.35em;
  }

  .centered .text {
    justify-content: center;
  }

  .prefix {
    color: var(--color-text-muted);
    font-weight: var(--font-weight-normal);
  }

  .subject {
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .suffix {
    color: var(--color-text-muted);
    font-weight: var(--font-weight-normal);
    font-style: italic;
  }

  /* Sizes */
  .prompt-display.sm .prefix,
  .prompt-display.sm .suffix {
    font-size: var(--font-size-sm);
  }

  .prompt-display.sm .subject {
    font-size: var(--font-size-md);
  }

  .prompt-display.md .prefix,
  .prompt-display.md .suffix {
    font-size: var(--font-size-md);
  }

  .prompt-display.md .subject {
    font-size: var(--font-size-xl);
  }

  .prompt-display.lg .prefix,
  .prompt-display.lg .suffix {
    font-size: var(--font-size-lg);
  }

  .prompt-display.lg .subject {
    font-size: var(--font-size-2xl);
  }
</style>
