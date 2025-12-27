// apps/web/src/lib/phaseRouter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all Svelte component imports before importing the module
vi.mock('$lib/components/features/Lobby/index.svelte', () => ({ default: { name: 'Lobby' } }));
vi.mock('$lib/components/features/Countdown.svelte', () => ({ default: { name: 'Countdown' } }));
vi.mock('$lib/components/features/Drawing.svelte', () => ({ default: { name: 'Drawing' } }));
vi.mock('$lib/components/features/Voting.svelte', () => ({ default: { name: 'Voting' } }));
vi.mock('$lib/components/features/Finale.svelte', () => ({ default: { name: 'Finale' } }));
vi.mock('$lib/components/features/Results.svelte', () => ({ default: { name: 'Results' } }));
vi.mock('$lib/components/features/CopyCat/Memorize.svelte', () => ({ default: { name: 'Memorize' } }));
vi.mock('$lib/components/features/CopyCat/CopyCatResult.svelte', () => ({
	default: { name: 'CopyCatResult' },
}));
vi.mock('$lib/components/features/CopyCat/CopyCatRematch.svelte', () => ({
	default: { name: 'CopyCatRematch' },
}));
vi.mock('$lib/components/features/PixelGuesser/Guessing.svelte', () => ({
	default: { name: 'Guessing' },
}));
vi.mock('$lib/components/features/PixelGuesser/Reveal.svelte', () => ({ default: { name: 'Reveal' } }));
vi.mock('$lib/components/features/PixelGuesser/FinalResults.svelte', () => ({
	default: { name: 'FinalResults' },
}));
vi.mock('$lib/components/features/ZombiePixel/index.svelte', () => ({
	default: { name: 'ZombiePixelGame' },
}));
vi.mock('$lib/components/features/CopyCatRoyale/index.svelte', () => ({
	default: { name: 'CopyCatRoyaleGame' },
}));

// Import after mocking
import { getPhaseComponent, isValidPhase, getPhasesForContainer, PHASE_COMPONENTS } from './phaseRouter';
import type { GamePhase } from './stores';

describe('phaseRouter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('PHASE_COMPONENTS', () => {
		it('should have mappings for all standard phases', () => {
			const standardPhases: GamePhase[] = [
				'idle',
				'lobby',
				'countdown',
				'drawing',
				'voting',
				'finale',
				'results',
			];

			for (const phase of standardPhases) {
				expect(PHASE_COMPONENTS[phase]).toBeDefined();
			}
		});

		it('should have mappings for CopyCat phases', () => {
			const copyCatPhases: GamePhase[] = ['memorize', 'copycat-result', 'copycat-rematch'];

			for (const phase of copyCatPhases) {
				expect(PHASE_COMPONENTS[phase]).toBeDefined();
			}
		});

		it('should have mappings for PixelGuesser phases', () => {
			const guesserPhases: GamePhase[] = ['guessing', 'reveal', 'pixelguesser-results'];

			for (const phase of guesserPhases) {
				expect(PHASE_COMPONENTS[phase]).toBeDefined();
			}
		});

		it('should have mappings for ZombiePixel phases', () => {
			expect(PHASE_COMPONENTS['active']).toBeDefined();
		});

		it('should have mappings for CopyCatRoyale phases', () => {
			const royalePhases: GamePhase[] = [
				'royale-initial-drawing',
				'royale-show-reference',
				'royale-drawing',
				'royale-results',
				'royale-winner',
			];

			for (const phase of royalePhases) {
				expect(PHASE_COMPONENTS[phase]).toBeDefined();
			}
		});

		it('should map idle and lobby to the same component', () => {
			expect(PHASE_COMPONENTS['idle']).toBe(PHASE_COMPONENTS['lobby']);
		});

		it('should map all royale phases to the same component', () => {
			const royalePhases: GamePhase[] = [
				'royale-initial-drawing',
				'royale-show-reference',
				'royale-drawing',
				'royale-results',
				'royale-winner',
			];

			const firstComponent = PHASE_COMPONENTS['royale-initial-drawing'];
			for (const phase of royalePhases) {
				expect(PHASE_COMPONENTS[phase]).toBe(firstComponent);
			}
		});
	});

	describe('getPhaseComponent', () => {
		it('should return component for valid phase', () => {
			const component = getPhaseComponent('drawing');
			expect(component).toBeDefined();
			expect((component as { name: string }).name).toBe('Drawing');
		});

		it('should return Lobby for idle phase', () => {
			const component = getPhaseComponent('idle');
			expect(component).toBeDefined();
			expect((component as { name: string }).name).toBe('Lobby');
		});

		it('should return Lobby for lobby phase', () => {
			const component = getPhaseComponent('lobby');
			expect(component).toBeDefined();
			expect((component as { name: string }).name).toBe('Lobby');
		});

		it('should return null for unknown phase', () => {
			const component = getPhaseComponent('unknown-phase' as GamePhase);
			expect(component).toBeNull();
		});

		it('should return ZombiePixelGame for results phase when gameMode is zombie-pixel', () => {
			const component = getPhaseComponent('results', 'zombie-pixel');
			expect(component).toBeDefined();
			expect((component as { name: string }).name).toBe('ZombiePixelGame');
		});

		it('should return Results for results phase when gameMode is not zombie-pixel', () => {
			const component = getPhaseComponent('results', 'pixel-battle');
			expect(component).toBeDefined();
			expect((component as { name: string }).name).toBe('Results');
		});

		it('should return Results for results phase when no gameMode provided', () => {
			const component = getPhaseComponent('results');
			expect(component).toBeDefined();
			expect((component as { name: string }).name).toBe('Results');
		});

		it('should return CopyCatRoyaleGame for all royale phases', () => {
			const royalePhases: GamePhase[] = [
				'royale-initial-drawing',
				'royale-show-reference',
				'royale-drawing',
				'royale-results',
				'royale-winner',
			];

			for (const phase of royalePhases) {
				const component = getPhaseComponent(phase);
				expect(component).toBeDefined();
				expect((component as { name: string }).name).toBe('CopyCatRoyaleGame');
			}
		});
	});

	describe('isValidPhase', () => {
		it('should return true for valid phases', () => {
			expect(isValidPhase('lobby')).toBe(true);
			expect(isValidPhase('drawing')).toBe(true);
			expect(isValidPhase('voting')).toBe(true);
			expect(isValidPhase('active')).toBe(true);
			expect(isValidPhase('royale-drawing')).toBe(true);
		});

		it('should return false for invalid phases', () => {
			expect(isValidPhase('unknown')).toBe(false);
			expect(isValidPhase('')).toBe(false);
			expect(isValidPhase('foo-bar')).toBe(false);
		});
	});

	describe('getPhasesForContainer', () => {
		it('should return phases for ZombiePixelGame', () => {
			const phases = getPhasesForContainer('ZombiePixelGame');
			expect(phases).toContain('active');
			expect(phases.length).toBe(1);
		});

		it('should return phases for CopyCatRoyaleGame', () => {
			const phases = getPhasesForContainer('CopyCatRoyaleGame');
			expect(phases).toContain('royale-initial-drawing');
			expect(phases).toContain('royale-show-reference');
			expect(phases).toContain('royale-drawing');
			expect(phases).toContain('royale-results');
			expect(phases).toContain('royale-winner');
			expect(phases.length).toBe(5);
		});

		it('should return empty array for unknown container', () => {
			const phases = getPhasesForContainer('UnknownContainer');
			expect(phases).toEqual([]);
		});
	});
});
