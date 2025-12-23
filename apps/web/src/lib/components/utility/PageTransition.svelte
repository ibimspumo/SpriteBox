<!-- PageTransition Utility - Wrapper for route transitions -->
<script lang="ts">
  import { page } from '$app/stores';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

{#key $page.url.pathname}
  <div class="page-transition">
    {@render children()}
  </div>
{/key}

<style>
  .page-transition {
    animation: fadeSlideUp 0.3s ease-out;
    width: 100%;
    height: 100%;
  }
</style>
