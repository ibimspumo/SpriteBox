<!-- Input Atom -->
<script lang="ts">
  interface Props {
    type?: 'text' | 'password' | 'number' | 'email';
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    maxlength?: number;
    minlength?: number;
    uppercase?: boolean;
    centered?: boolean;
    onchange?: (e: Event) => void;
    oninput?: (e: Event) => void;
    onkeydown?: (e: KeyboardEvent) => void;
  }

  let {
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    disabled = false,
    size = 'md',
    fullWidth = false,
    maxlength,
    minlength,
    uppercase = false,
    centered = false,
    onchange,
    oninput,
    onkeydown
  }: Props = $props();
</script>

<input
  {type}
  bind:value
  {placeholder}
  {disabled}
  {maxlength}
  {minlength}
  class="input {size}"
  class:full-width={fullWidth}
  class:uppercase
  class:centered
  {onchange}
  {oninput}
  {onkeydown}
/>

<style>
  .input {
    border: 2px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-family: var(--font-family);
    transition: border-color var(--transition-fast);
  }

  .input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input::placeholder {
    color: var(--color-text-muted);
  }

  /* Sizes */
  .input.sm {
    padding: var(--space-2);
    font-size: var(--font-size-sm);
  }

  .input.md {
    padding: var(--space-3);
    font-size: var(--font-size-md);
  }

  .input.lg {
    padding: var(--space-4);
    font-size: var(--font-size-lg);
  }

  /* Modifiers */
  .full-width {
    width: 100%;
  }

  .uppercase {
    text-transform: uppercase;
    letter-spacing: 4px;
  }

  .centered {
    text-align: center;
  }
</style>
