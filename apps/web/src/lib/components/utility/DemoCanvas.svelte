<!-- DemoCanvas - Interactive demo canvas for landing page -->
<script lang="ts">
  import { PALETTE, indexToHexChar, hexCharToIndex } from '$lib/palette';

  interface Props {
    size?: number;
  }

  let { size = 200 }: Props = $props();

  const GRID_SIZE = 8;
  let cellSize = $derived(size / GRID_SIZE);

  // Local state (not connected to game stores)
  let pixels = $state('1111111111111111111111111111111111111111111111111111111111111111');
  let selectedColor = $state(2); // Start with red
  let isDrawing = $state(false);
  let canvasElement: HTMLDivElement;

  function getPixelIndex(x: number, y: number): number {
    return y * GRID_SIZE + x;
  }

  function setPixel(x: number, y: number): void {
    const index = getPixelIndex(x, y);
    const newPixels = pixels.split('');
    newPixels[index] = indexToHexChar(selectedColor);
    pixels = newPixels.join('');
  }

  function getCoordsFromEvent(e: PointerEvent): { x: number; y: number } | null {
    const rect = canvasElement?.getBoundingClientRect();
    if (!rect) return null;

    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      return { x, y };
    }
    return null;
  }

  function handlePointerDown(e: PointerEvent): void {
    e.preventDefault();
    isDrawing = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const coords = getCoordsFromEvent(e);
    if (coords) {
      setPixel(coords.x, coords.y);
    }
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!isDrawing) return;

    const coords = getCoordsFromEvent(e);
    if (coords) {
      setPixel(coords.x, coords.y);
    }
  }

  function handlePointerUp(e: PointerEvent): void {
    isDrawing = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }

  function getPixelColor(index: number): string {
    const hexChar = pixels[index] || '1';
    const colorIndex = hexCharToIndex(hexChar);
    return PALETTE[colorIndex]?.hex ?? '#FFFFFF';
  }

  function selectColor(index: number): void {
    selectedColor = index;
  }

  function clearCanvas(): void {
    pixels = '1111111111111111111111111111111111111111111111111111111111111111';
  }
</script>

<div class="demo-container">
  <!-- Canvas -->
  <div
    class="canvas"
    style="--size: {size}px; --cell-size: {cellSize}px"
    bind:this={canvasElement}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointerleave={handlePointerUp}
    role="img"
    aria-label="Demo Pixel Canvas"
  >
    {#each Array(GRID_SIZE * GRID_SIZE) as _, i}
      <div
        class="pixel"
        style="background-color: {getPixelColor(i)}"
      ></div>
    {/each}
  </div>

  <!-- Mini Color Palette -->
  <div class="palette">
    {#each PALETTE as color, i}
      <button
        class="color-swatch"
        class:selected={selectedColor === i}
        style="background-color: {color.hex}"
        onclick={() => selectColor(i)}
        aria-label={color.name}
      ></button>
    {/each}
  </div>

  <!-- Clear button -->
  <button class="clear-btn" onclick={clearCanvas} aria-label="Clear canvas">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18"/>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  </button>
</div>

<style>
  .demo-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    position: relative;
  }

  .canvas {
    width: var(--size);
    height: var(--size);
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(8, 1fr);
    background: var(--color-bg-primary);
    border: 4px solid var(--color-accent);
    border-radius: var(--radius-md);
    box-shadow:
      0 0 30px rgba(78, 205, 196, 0.3),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05),
      8px 8px 0 rgba(0, 0, 0, 0.4);
    touch-action: none;
    user-select: none;
    cursor: crosshair;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    transition: transform var(--transition-normal), box-shadow var(--transition-normal);
  }

  .canvas:hover {
    transform: translateY(-2px);
    box-shadow:
      0 0 40px rgba(78, 205, 196, 0.4),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05),
      10px 10px 0 rgba(0, 0, 0, 0.4);
  }

  .pixel {
    width: var(--cell-size);
    height: var(--cell-size);
    border: 1px solid rgba(128, 128, 128, 0.25);
    transition: opacity var(--transition-fast);
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .pixel:hover {
    opacity: 0.85;
  }

  .palette {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 3px;
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-pixel-sm);
  }

  .color-swatch {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-radius: 2px;
    cursor: pointer;
    transition: transform var(--transition-fast), border-color var(--transition-fast);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
  }

  .color-swatch:hover {
    transform: scale(1.15);
    z-index: 1;
  }

  .color-swatch.selected {
    border-color: var(--color-text-primary);
    transform: scale(1.2);
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.2),
      0 0 8px rgba(255, 255, 255, 0.3);
  }

  .clear-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-tertiary);
    border: 2px solid var(--color-bg-elevated);
    border-radius: var(--radius-full);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-pixel-sm);
  }

  .clear-btn:hover {
    background: var(--color-error);
    border-color: var(--color-error);
    color: white;
    transform: scale(1.1);
  }

  /* Mobile adjustments */
  @media (max-width: 480px) {
    .palette {
      gap: 2px;
      padding: var(--space-1);
    }

    .color-swatch {
      width: 18px;
      height: 18px;
    }
  }
</style>
