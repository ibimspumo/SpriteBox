<!-- Input Atom - Pixel Art Style -->
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
  class="pixel-input {size}"
  class:full-width={fullWidth}
  class:uppercase
  class:centered
  {onchange}
  {oninput}
  {onkeydown}
/>

<style>
  .pixel-input {
    font-family: var(--font-family);
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    border: 3px solid;
    border-color: #374151 #6b7280 #6b7280 #374151;
    border-radius: var(--radius-sm);
    box-shadow:
      inset 2px 2px 0 rgba(0, 0, 0, 0.3),
      inset -1px -1px 0 rgba(255, 255, 255, 0.05);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .pixel-input:focus {
    outline: none;
    border-color: var(--color-accent) #0d9488 #0d9488 var(--color-accent);
    box-shadow:
      inset 2px 2px 0 rgba(0, 0, 0, 0.3),
      inset -1px -1px 0 rgba(255, 255, 255, 0.05),
      0 0 0 2px rgba(78, 205, 196, 0.2);
  }

  .pixel-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pixel-input::placeholder {
    color: var(--color-text-muted);
    font-family: var(--font-family);
  }

  /* Sizes - minimum 16px to prevent iOS zoom on focus */
  .pixel-input.sm {
    padding: var(--space-2);
    font-size: max(16px, var(--font-size-sm));
  }

  .pixel-input.md {
    padding: var(--space-3);
    font-size: max(16px, var(--font-size-md));
  }

  .pixel-input.lg {
    padding: var(--space-4);
    font-size: max(16px, var(--font-size-lg));
  }

  /* Modifiers */
  .full-width {
    width: 100%;
  }

  .uppercase {
    text-transform: uppercase;
    letter-spacing: 4px;
    font-weight: var(--font-weight-bold);
  }

  .centered {
    text-align: center;
  }
</style>
