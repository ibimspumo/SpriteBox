<!-- PixelEditor - Dev-only tool for creating CopyCat reference images -->
<script lang="ts">
  import { PixelCanvas } from '../utility';
  import { ColorPalette } from '../utility';
  import { Button, Input } from '../atoms';
  import { browser } from '$app/environment';
  import { dev } from '$app/environment';

  interface Props {
    show?: boolean;
    onclose?: () => void;
  }

  let { show = false, onclose }: Props = $props();

  let localPixels = $state('1'.repeat(64)); // White background
  let importText = $state('');
  let imageName = $state('');
  let copySuccess = $state(false);

  // Export the current drawing as hex string
  function exportAsString(): string {
    return localPixels;
  }

  // Copy to clipboard
  function copyToClipboard(): void {
    if (!browser) return;
    const text = exportAsString();
    navigator.clipboard.writeText(text).then(() => {
      copySuccess = true;
      setTimeout(() => copySuccess = false, 2000);
    });
  }

  // Import from string
  function handleImport(): void {
    const cleaned = importText.trim().replace(/[^0-9A-Fa-f]/g, '');
    if (cleaned.length === 64) {
      localPixels = cleaned.toUpperCase();
      importText = '';
    }
  }

  // Clear the canvas
  function clearCanvas(): void {
    localPixels = '1'.repeat(64); // White
  }

  // Fill with black
  function fillBlack(): void {
    localPixels = '0'.repeat(64);
  }

  // Generate JSON entry for copycat_images.json
  function generateJsonEntry(): string {
    const id = imageName.toLowerCase().replace(/\s+/g, '-') || 'unnamed';
    const name = imageName || 'Unnamed';
    return JSON.stringify({
      id,
      name,
      pixels: localPixels
    }, null, 2);
  }

  function copyJsonEntry(): void {
    if (!browser) return;
    const json = generateJsonEntry();
    navigator.clipboard.writeText(json).then(() => {
      copySuccess = true;
      setTimeout(() => copySuccess = false, 2000);
    });
  }

  function handlePixelChange(newPixels: string): void {
    localPixels = newPixels;
  }

  // Handle keyboard shortcuts
  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      onclose?.();
    }
  }
</script>

{#if show && dev}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="editor-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Pixel Editor"
    tabindex="-1"
    onkeydown={handleKeyDown}
  >
    <div class="editor-panel">
      <header class="editor-header">
        <h2>Pixel Editor (Dev Only)</h2>
        <button class="close-btn" onclick={() => onclose?.()} aria-label="Close">
          &times;
        </button>
      </header>

      <div class="editor-content">
        <div class="canvas-section">
          <PixelCanvas
            pixelData={localPixels}
            size={256}
            editable={true}
            onchange={handlePixelChange}
          />
          <ColorPalette />
        </div>

        <div class="tools-section">
          <div class="tool-group">
            <h3>Canvas Actions</h3>
            <div class="button-row">
              <Button variant="secondary" onclick={clearCanvas}>Clear (White)</Button>
              <Button variant="secondary" onclick={fillBlack}>Fill Black</Button>
            </div>
          </div>

          <div class="tool-group">
            <h3>Image Name</h3>
            <Input
              bind:value={imageName}
              placeholder="e.g., Heart, Star, Cat Face"
              fullWidth
            />
          </div>

          <div class="tool-group">
            <h3>Export</h3>
            <div class="export-preview">
              <code>{localPixels}</code>
            </div>
            <div class="button-row">
              <Button variant="primary" onclick={copyToClipboard}>
                {copySuccess ? 'Copied!' : 'Copy Pixel String'}
              </Button>
              <Button variant="action" onclick={copyJsonEntry}>
                Copy JSON Entry
              </Button>
            </div>
          </div>

          <div class="tool-group">
            <h3>Import</h3>
            <Input
              bind:value={importText}
              placeholder="Paste 64-char hex string..."
              fullWidth
            />
            <Button
              variant="secondary"
              onclick={handleImport}
              disabled={importText.replace(/[^0-9A-Fa-f]/g, '').length !== 64}
              fullWidth
            >
              Import
            </Button>
          </div>

          <div class="tool-group">
            <h3>JSON Preview</h3>
            <pre class="json-preview">{generateJsonEntry()}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .editor-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: var(--space-4);
  }

  .editor-panel {
    display: flex;
    flex-direction: column;
    max-width: 800px;
    max-height: 90vh;
    width: 100%;
    background: var(--color-bg-primary);
    border: 3px solid var(--color-accent);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border-bottom: 2px solid var(--color-bg-tertiary);
  }

  .editor-header h2 {
    margin: 0;
    font-size: var(--font-size-lg);
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 2px solid var(--color-text-muted);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-size: var(--font-size-xl);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .close-btn:hover {
    border-color: var(--color-error);
    color: var(--color-error);
  }

  .editor-content {
    display: flex;
    gap: var(--space-6);
    padding: var(--space-6);
    overflow-y: auto;
  }

  .canvas-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    flex-shrink: 0;
  }

  .tools-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
  }

  .tool-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
  }

  .tool-group h3 {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .button-row {
    display: flex;
    gap: var(--space-2);
  }

  .export-preview {
    padding: var(--space-2);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    overflow-x: auto;
  }

  .export-preview code {
    font-family: monospace;
    font-size: var(--font-size-xs);
    color: var(--color-success);
    word-break: break-all;
  }

  .json-preview {
    margin: 0;
    padding: var(--space-2);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    font-family: monospace;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 150px;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    .editor-content {
      flex-direction: column;
    }

    .canvas-section {
      order: 1;
    }

    .tools-section {
      order: 2;
    }
  }
</style>
