<!-- Icon Atom - Pixel Art Icons from pixelarticons -->
<script lang="ts">
  interface Props {
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    color?: string;
    class?: string;
  }

  let {
    name,
    size = 'md',
    color = 'currentColor',
    class: className = ''
  }: Props = $props();

  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48
  };

  const pixelSize = $derived(sizeMap[size]);
</script>

<span
  class="pixel-icon {size} {className}"
  style="--icon-color: {color}; --icon-size: {pixelSize}px;"
  aria-hidden="true"
>
  <img
    src="/icons/{name}.svg"
    alt=""
    width={pixelSize}
    height={pixelSize}
    class="icon-img"
  />
</span>

<style>
  .pixel-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--icon-size);
    height: var(--icon-size);
  }

  .icon-img {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    filter: var(--icon-filter, none);
  }

  /* Apply color filter for SVGs - white icons that can be tinted */
  .pixel-icon {
    filter: brightness(0) invert(1);
  }
</style>
