<!-- PixelCanvas Utility Component -->
<script lang="ts">
  import { pixels, selectedColor } from '$lib/stores';
  import { PALETTE, indexToHexChar, hexCharToIndex } from '$lib/palette';

  interface Props {
    readonly?: boolean;
    pixelData?: string | null;
    size?: number;
  }

  let { readonly = false, pixelData = null, size = 256 }: Props = $props();

  const GRID_SIZE = 8;
  let cellSize = $derived(size / GRID_SIZE);

  // Use either passed data or store
  let displayPixels = $derived(pixelData ?? $pixels);

  let isDrawing = $state(false);
  let canvasElement: HTMLDivElement;

  function getPixelIndex(x: number, y: number): number {
    return y * GRID_SIZE + x;
  }

  function setPixel(x: number, y: number): void {
    if (readonly || pixelData) return;

    const index = getPixelIndex(x, y);
    const newPixels = displayPixels.split('');
    newPixels[index] = indexToHexChar($selectedColor);
    pixels.set(newPixels.join(''));
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
    if (readonly || pixelData) return;
    e.preventDefault();
    isDrawing = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const coords = getCoordsFromEvent(e);
    if (coords) {
      setPixel(coords.x, coords.y);
    }
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!isDrawing || readonly || pixelData) return;

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
    const hexChar = displayPixels[index] || '1';
    const colorIndex = hexCharToIndex(hexChar);
    return PALETTE[colorIndex]?.hex ?? '#FFFFFF';
  }
</script>

<div
  class="canvas"
  class:readonly
  style="--size: {size}px; --cell-size: {cellSize}px"
  bind:this={canvasElement}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointerleave={handlePointerUp}
  role="img"
  aria-label="Pixel Canvas"
>
  {#each Array(GRID_SIZE * GRID_SIZE) as _, i}
    <div
      class="pixel"
      style="background-color: {getPixelColor(i)}"
    ></div>
  {/each}
</div>

<style>
  .canvas {
    width: var(--size);
    height: var(--size);
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(8, 1fr);
    background: var(--color-bg-primary);
    border: 3px solid var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.05),
      var(--shadow-pixel-sm);
    touch-action: none;
    user-select: none;
    cursor: crosshair;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .canvas.readonly {
    cursor: default;
    opacity: 0.8;
  }

  .pixel {
    width: var(--cell-size);
    height: var(--cell-size);
    /* Medium gray border visible on both light and dark colors */
    border: 1px solid rgba(128, 128, 128, 0.4);
    transition: opacity var(--transition-fast);
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .pixel:hover {
    opacity: 0.9;
  }

  /* Pixel art rendering */
  .canvas,
  .pixel {
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
</style>
