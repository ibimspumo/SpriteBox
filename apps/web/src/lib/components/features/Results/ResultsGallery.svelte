<!-- ResultsGallery Component - Remaining participants display -->
<script lang="ts">
  import type { User } from '$lib/socket';
  import { t } from '$lib/i18n';
  import { GalleryGrid } from '../../organisms';
  import GalleryItemCard from './GalleryItemCard.svelte';

  interface RankingEntry {
    place: number;
    playerId: string;
    user: User;
    pixels: string;
    finalVotes: number;
    elo: number;
  }

  interface Props {
    rankings: RankingEntry[];
    totalParticipants: number;
    currentUserFullName: string | undefined;
    mounted: boolean;
  }

  let { rankings, totalParticipants, currentUserFullName, mounted }: Props = $props();

  // Get rankings beyond the top 3
  let galleryRankings = $derived(rankings.slice(3));
</script>

{#if galleryRankings.length > 0}
  <div class="gallery-section" class:mounted>
    <h3 class="gallery-title">
      <span class="gallery-icon">🎨</span>
      {$t.results.allSubmissions} ({totalParticipants})
    </h3>
    <div class="gallery-container">
      <GalleryGrid gap="sm">
        {#each galleryRankings as entry, index}
          {@const isOwn = entry.user.fullName === currentUserFullName}
          <GalleryItemCard {entry} {index} {isOwn} {mounted} />
        {/each}
      </GalleryGrid>
    </div>
  </div>
{/if}

<style>
  .gallery-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease 0.4s;
  }

  .gallery-section.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .gallery-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin: 0;
    padding: var(--space-3);
    background: rgba(26, 26, 62, 0.9);
    border-radius: var(--radius-lg);
    border: 2px solid var(--color-border-strong);
  }

  .gallery-icon {
    font-size: 1.2rem;
  }

  .gallery-container {
    padding: var(--space-4);
    background: rgba(26, 26, 62, 0.8);
    border-radius: var(--radius-lg);
    border: 2px solid var(--color-border);
    backdrop-filter: blur(10px);
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .gallery-section {
      transition: opacity 0.2s ease;
      transform: none;
    }

    .gallery-section.mounted {
      transform: none;
    }
  }
</style>
