// apps/web/src/lib/phaseRouter.ts
/**
 * Phase Router - Data-driven phase to component mapping
 *
 * Replaces if-else chains in route components with a declarative mapping.
 * Adding a new phase = adding one entry to the map.
 */

import type { Component } from 'svelte';
import type { GamePhase } from './stores';

// Import phase components
import Lobby from '$lib/components/features/Lobby/index.svelte';
import Countdown from '$lib/components/features/Countdown.svelte';
import Drawing from '$lib/components/features/Drawing.svelte';
import Voting from '$lib/components/features/Voting.svelte';
import Finale from '$lib/components/features/Finale.svelte';
import Results from '$lib/components/features/Results.svelte';

// CopyCat mode
import Memorize from '$lib/components/features/CopyCat/Memorize.svelte';
import CopyCatResult from '$lib/components/features/CopyCat/CopyCatResult.svelte';
import CopyCatRematch from '$lib/components/features/CopyCat/CopyCatRematch.svelte';

// PixelGuesser mode
import Guessing from '$lib/components/features/PixelGuesser/Guessing.svelte';
import Reveal from '$lib/components/features/PixelGuesser/Reveal.svelte';
import FinalResults from '$lib/components/features/PixelGuesser/FinalResults.svelte';

// ZombiePixel mode (single container component)
import ZombiePixelGame from '$lib/components/features/ZombiePixel/index.svelte';

// CopyCatRoyale mode (single container component)
import CopyCatRoyaleGame from '$lib/components/features/CopyCatRoyale/index.svelte';

/**
 * Mapping of game phases to their display components
 *
 * Notes:
 * - 'idle' uses Lobby (waiting in lobby state)
 * - 'active' (ZombiePixel) uses ZombiePixelGame container
 * - All 'royale-*' phases use CopyCatRoyaleGame container (handles internal routing)
 * - 'results' may need special handling for zombie-pixel mode (see getPhaseComponent)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PHASE_COMPONENTS: Partial<Record<GamePhase, Component<any>>> = {
	// Standard phases
	idle: Lobby,
	lobby: Lobby,
	countdown: Countdown,
	drawing: Drawing,
	voting: Voting,
	finale: Finale,
	results: Results,

	// CopyCat mode phases
	memorize: Memorize,
	'copycat-result': CopyCatResult,
	'copycat-rematch': CopyCatRematch,

	// PixelGuesser mode phases
	guessing: Guessing,
	reveal: Reveal,
	'pixelguesser-results': FinalResults,

	// ZombiePixel mode
	active: ZombiePixelGame,

	// CopyCatRoyale mode (all phases use the container)
	'royale-initial-drawing': CopyCatRoyaleGame,
	'royale-show-reference': CopyCatRoyaleGame,
	'royale-drawing': CopyCatRoyaleGame,
	'royale-results': CopyCatRoyaleGame,
	'royale-winner': CopyCatRoyaleGame,
};

/**
 * Get the component for a given game phase
 *
 * @param phase - The current game phase
 * @param gameMode - Optional: The current game mode (for special handling)
 * @returns The Svelte component to render, or null if phase is unknown
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPhaseComponent(phase: GamePhase, gameMode?: string): Component<any> | null {
	// Special case: ZombiePixel mode shows its game container for 'results' phase
	// (ZombiePixelGame handles the results display internally via ZombieResults)
	if (phase === 'results' && gameMode === 'zombie-pixel') {
		return ZombiePixelGame;
	}

	return PHASE_COMPONENTS[phase] ?? null;
}

/**
 * Check if a phase is valid (has a component mapping)
 *
 * @param phase - The phase to check
 * @returns true if the phase has a component mapping
 */
export function isValidPhase(phase: string): phase is GamePhase {
	return phase in PHASE_COMPONENTS;
}

/**
 * Get all phases that use a specific container component
 * Useful for debugging and documentation
 *
 * @param containerName - Name like 'ZombiePixelGame' or 'CopyCatRoyaleGame'
 * @returns Array of phases that use this container
 */
export function getPhasesForContainer(containerName: string): GamePhase[] {
	const containerMap: Record<string, GamePhase[]> = {
		ZombiePixelGame: ['active'],
		CopyCatRoyaleGame: [
			'royale-initial-drawing',
			'royale-show-reference',
			'royale-drawing',
			'royale-results',
			'royale-winner',
		],
	};

	return containerMap[containerName] ?? [];
}

// Re-export for convenience
export { PHASE_COMPONENTS };
