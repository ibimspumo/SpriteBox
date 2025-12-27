<!-- ResultsPodium Component - Top 3 display with medals -->
<script lang="ts">
  import type { User } from '$lib/socket';
  import PodiumSlot from './PodiumSlot.svelte';

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
    currentUserFullName: string | undefined;
    mounted: boolean;
  }

  let { rankings, currentUserFullName, mounted }: Props = $props();

  let topThree = $derived(rankings.slice(0, 3));
</script>

<div class="podium">
  {#each topThree as entry, index}
    {@const isOwn = entry.user.fullName === currentUserFullName}
    <PodiumSlot {entry} {index} {isOwn} {mounted} />
  {/each}
</div>

<style>
  .podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: var(--space-4);
    width: 100%;
    max-width: 800px;
    padding: var(--space-4) 0;
  }

  /* ===== Responsive ===== */
  @media (max-width: 768px) {
    .podium {
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
    }
  }
</style>
