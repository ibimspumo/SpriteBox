<!-- PasswordInput Molecule -->
<script lang="ts">
  import { Input, Button } from '../atoms';
  import { t } from '$lib/i18n';

  interface Props {
    value?: string;
    placeholder?: string;
    submitLabel?: string;
    cancelLabel?: string;
    minLength?: number;
    maxLength?: number;
    error?: string | null;
    onsubmit?: () => void;
    oncancel?: () => void;
  }

  let {
    value = $bindable(''),
    placeholder,
    submitLabel,
    cancelLabel,
    minLength = 4,
    maxLength = 64,
    error = null,
    onsubmit,
    oncancel
  }: Props = $props();

  // Use reactive assignments for default values that need translations
  let actualPlaceholder = $derived(placeholder || $t.passwordInput.enterPassword);
  let actualSubmitLabel = $derived(submitLabel || $t.common.submit);
  let actualCancelLabel = $derived(cancelLabel || $t.common.cancel);

  let isValid = $derived(value.length >= minLength);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && isValid && onsubmit) {
      onsubmit();
    }
  }
</script>

<div class="password-input">
  <Input
    type="password"
    bind:value
    placeholder={actualPlaceholder}
    minlength={minLength}
    maxlength={maxLength}
    fullWidth
    onkeydown={handleKeydown}
  />

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <div class="actions">
    <Button
      variant="primary"
      disabled={!isValid}
      onclick={onsubmit}
      fullWidth
    >
      {actualSubmitLabel}
    </Button>

    {#if oncancel}
      <Button
        variant="ghost"
        onclick={oncancel}
      >
        {actualCancelLabel}
      </Button>
    {/if}
  </div>
</div>

<style>
  .password-input {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .error {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-error);
    text-align: center;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
</style>
