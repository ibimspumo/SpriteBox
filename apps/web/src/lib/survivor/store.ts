// apps/web/src/lib/survivor/store.ts
// Svelte stores for Pixel Survivor mode
// Includes StatManager integration for RPG stats system

import { writable, derived, get } from 'svelte/store';
import type {
	PixelSurvivorRun,
	PixelSurvivorStats,
	PixelSurvivorSettings,
	PixelSurvivorPhase,
	SurvivorCharacter,
	GameCharacter,
	ElementType,
	TraitType
} from './types.js';
import {
	loadRun,
	loadStats,
	loadSettings,
	saveRun,
	saveStats,
	saveSettings,
	deleteRun
} from './storage.js';
import { DEFAULT_STATS, DEFAULT_SETTINGS } from './types.js';
import {
	StatManager,
	DiceRoller,
	EffectProcessor,
	CharacterFactory,
	serializeCharacter
} from './engine/index.js';
import type {
	StatType,
	CardDefinition,
	ItemDefinition,
	ModifierSource,
	CharacterPreview
} from './engine/index.js';

// ============================================
// CURRENT RUN STORE
// ============================================

export const survivorRun = writable<PixelSurvivorRun | null>(null);

// Character Creation State (separate from run, since run doesn't exist yet)
export const isCreatingCharacter = writable<boolean>(false);

// Current GameCharacter (for active run)
export const currentGameCharacter = writable<GameCharacter | null>(null);

// Derived: Current Phase (accounts for character creation state)
export const survivorPhase = derived(
	[survivorRun, isCreatingCharacter],
	([$run, $isCreating]): PixelSurvivorPhase => {
		if ($isCreating) return 'survivor-character';
		return $run?.phase ?? 'survivor-menu';
	}
);

// Derived: Is a run active?
export const hasActiveRun = derived(survivorRun, ($run) => $run !== null);

// Derived: Current element
export const currentElement = derived(
	currentGameCharacter,
	($char) => $char?.elementAffinity.primary ?? 'neutral'
);

// Derived: Current trait
export const currentTrait = derived(currentGameCharacter, ($char) => $char?.trait ?? 'balanced');

// ============================================
// STATISTICS STORE
// ============================================

export const survivorStats = writable<PixelSurvivorStats>(DEFAULT_STATS);

// ============================================
// SETTINGS STORE
// ============================================

export const survivorSettings = writable<PixelSurvivorSettings>(DEFAULT_SETTINGS);

// ============================================
// UI STATE
// ============================================

// Drawing Phase State
export const currentDrawing = writable<string>('1'.repeat(64));
export const survivorSelectedColor = writable<number>(0);

// UI Modal States
export const showStatsScreen = writable<boolean>(false);
export const showTutorial = writable<boolean>(false);

// ============================================
// ENGINE STORES
// ============================================

/** StatManager instance for current run */
export const statManager = writable<StatManager | null>(null);

/** DiceRoller instance */
export const diceRoller = writable<DiceRoller>(new DiceRoller());

/** EffectProcessor instance for current run */
export const effectProcessor = writable<EffectProcessor | null>(null);

// Derived stores for easy access to common stats
export const currentHp = derived(statManager, ($m) => $m?.getCurrentResource('hp') ?? 0);
export const maxHp = derived(statManager, ($m) => $m?.getStat('maxHp') ?? 100);
export const currentMana = derived(statManager, ($m) => $m?.getCurrentResource('mana') ?? 0);
export const maxMana = derived(statManager, ($m) => $m?.getStat('maxMana') ?? 50);
export const currentShield = derived(statManager, ($m) => $m?.getCurrentResource('shield') ?? 0);

export const playerAttack = derived(statManager, ($m) => $m?.getStat('attack') ?? 0);
export const playerDefense = derived(statManager, ($m) => $m?.getStat('defense') ?? 0);
export const playerSpeed = derived(statManager, ($m) => $m?.getStat('speed') ?? 0);
export const playerLuck = derived(statManager, ($m) => $m?.getStat('luck') ?? 0);

export const playerLevel = derived(statManager, ($m) => $m?.level ?? 1);
export const playerXp = derived(statManager, ($m) => $m?.xp ?? 0);
export const playerXpToNext = derived(statManager, ($m) => $m?.xpToNextLevel ?? 100);

export const activeBuffs = derived(effectProcessor, ($e) => $e?.getBuffs() ?? []);
export const activeDebuffs = derived(effectProcessor, ($e) => $e?.getDebuffs() ?? []);

// ============================================
// ENGINE ACTIONS
// ============================================

/**
 * Get a stat value from the current run.
 */
export function getStat(stat: StatType): number {
	const manager = get(statManager);
	return manager?.getStat(stat) ?? 0;
}

/**
 * Apply a card to the current run.
 */
export function applyCard(card: CardDefinition): void {
	const manager = get(statManager);
	manager?.applyCard(card);
	statManager.set(manager);
}

/**
 * Equip an item.
 */
export function equipItem(item: ItemDefinition): void {
	const manager = get(statManager);
	manager?.equipItem(item);
	statManager.set(manager);
}

/**
 * Unequip an item.
 */
export function unequipItem(itemId: string): void {
	const manager = get(statManager);
	manager?.unequipItem(itemId);
	statManager.set(manager);
}

/**
 * Apply an effect by ID.
 */
export function applyEffect(effectId: string, source: ModifierSource): void {
	const processor = get(effectProcessor);
	processor?.applyEffect(effectId, source);
	effectProcessor.set(processor);
}

/**
 * Heal the player.
 */
export function heal(amount: number): number {
	const manager = get(statManager);
	const healed = manager?.heal(amount) ?? 0;
	statManager.set(manager);
	return healed;
}

/**
 * Deal damage to the player.
 */
export function takeDamage(amount: number): {
	shieldDamage: number;
	hpDamage: number;
	remainingHp: number;
} {
	const manager = get(statManager);
	const result = manager?.takeDamage(amount) ?? { shieldDamage: 0, hpDamage: 0, remainingHp: 0 };
	statManager.set(manager);
	return result;
}

/**
 * Add XP to the player.
 */
export function addXp(baseXp: number): { xpGained: number; levelsGained: number } {
	const manager = get(statManager);
	const result = manager?.addXp(baseXp) ?? { xpGained: 0, levelsGained: 0 };
	statManager.set(manager);
	return result;
}

/**
 * Process a game tick (for time-based effects).
 */
export function processTick(): void {
	const processor = get(effectProcessor);
	processor?.processTick();
	effectProcessor.set(processor);

	// Remove expired modifiers
	const manager = get(statManager);
	manager?.removeExpired();
	statManager.set(manager);
}

// ============================================
// ACTIONS
// ============================================

/**
 * Initialize Pixel Survivor - load saved data
 */
export function initializeSurvivor(): void {
	// Load saved run if exists
	const savedRun = loadRun();
	if (savedRun) {
		survivorRun.set(savedRun);

		// Recreate GameCharacter from saved data
		if (savedRun.character) {
			const gameCharacter = CharacterFactory.create(savedRun.character.pixels, {
				name: savedRun.character.name
			});
			currentGameCharacter.set(gameCharacter);
			statManager.set(gameCharacter.statManager);

			const processor = new EffectProcessor(gameCharacter.statManager);
			effectProcessor.set(processor);
		}
	}

	// Load stats
	const stats = loadStats();
	survivorStats.set(stats);

	// Load settings
	const settings = loadSettings();
	survivorSettings.set(settings);
}

/**
 * Reset to menu phase
 */
export function resetToMenu(): void {
	survivorRun.update((run) => {
		if (run) {
			return { ...run, phase: 'survivor-menu' as PixelSurvivorPhase };
		}
		return null;
	});
}

/**
 * Set the current phase
 */
export function setPhase(phase: PixelSurvivorPhase): void {
	survivorRun.update((run) => {
		if (run) {
			const updated = { ...run, phase };
			saveRun(updated);
			return updated;
		}
		return run;
	});
}

/**
 * Update run and auto-save
 */
export function updateRun(updater: (run: PixelSurvivorRun) => PixelSurvivorRun): void {
	survivorRun.update((run) => {
		if (run) {
			const updated = updater(run);
			saveRun(updated);
			return updated;
		}
		return run;
	});
}

/**
 * End the current run
 */
export function endRun(_won: boolean): void {
	// Clear engine state
	const manager = get(statManager);
	manager?.endRun();
	statManager.set(null);

	const processor = get(effectProcessor);
	processor?.clear();
	effectProcessor.set(null);

	currentGameCharacter.set(null);

	// Clear run data
	deleteRun();
	survivorRun.set(null);
}

/**
 * Clear run without ending (abandon)
 */
export function abandonRun(): void {
	// Clear engine state
	statManager.set(null);
	effectProcessor.set(null);
	currentGameCharacter.set(null);

	// Clear run data
	deleteRun();
	survivorRun.set(null);
}

/**
 * Generate a unique run ID
 */
function generateRunId(): string {
	const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(5)))
		.map((b) => b.toString(36))
		.join('')
		.substring(0, 7);
	return `run_${Date.now()}_${randomPart}`;
}

/**
 * Create a character from pixel art using CharacterFactory
 */
export function createCharacterFromPixels(pixels: string, name?: string): GameCharacter {
	return CharacterFactory.create(pixels, { name });
}

/**
 * Get character preview without creating full character
 */
export function previewCharacter(pixels: string): CharacterPreview {
	return CharacterFactory.preview(pixels);
}

/**
 * Start a new run with pixel art
 * Uses CharacterFactory to create the character
 */
export function startNewRunFromPixels(pixels: string, name?: string): void {
	// Create character using CharacterFactory
	const gameCharacter = CharacterFactory.create(pixels, { name });

	// Create SurvivorCharacter wrapper
	const character: SurvivorCharacter = {
		pixels,
		name: gameCharacter.name,
		gameCharacter
	};

	const now = Date.now();

	const newRun: PixelSurvivorRun = {
		// Meta
		version: 2,
		runId: generateRunId(),
		startedAt: now,
		lastSavedAt: now,
		seed: crypto.getRandomValues(new Uint32Array(1))[0] % 1000000,

		// Character
		character,

		// Serialized for persistence
		serializedCharacter: serializeCharacter(gameCharacter),

		// Current State
		phase: 'survivor-menu'
	};

	// Save and set
	saveRun(newRun);
	survivorRun.set(newRun);

	// Set engine state (StatManager is already configured by CharacterFactory)
	currentGameCharacter.set(gameCharacter);
	statManager.set(gameCharacter.statManager);

	// Initialize EffectProcessor
	const processor = new EffectProcessor(gameCharacter.statManager);
	effectProcessor.set(processor);

	// Update stats with element/trait tracking
	survivorStats.update((stats) => {
		const element = gameCharacter.elementAffinity.primary;
		const trait = gameCharacter.trait;

		const elementCounts = { ...stats.elementCounts };
		elementCounts[element] = (elementCounts[element] ?? 0) + 1;

		const traitCounts = { ...stats.traitCounts };
		traitCounts[trait] = (traitCounts[trait] ?? 0) + 1;

		// Find favorites
		let favoriteElement = stats.favoriteElement;
		let maxElementCount = 0;
		for (const [el, count] of Object.entries(elementCounts)) {
			if ((count ?? 0) > maxElementCount) {
				maxElementCount = count ?? 0;
				favoriteElement = el;
			}
		}

		let favoriteTrait = stats.favoriteTrait;
		let maxTraitCount = 0;
		for (const [tr, count] of Object.entries(traitCounts)) {
			if ((count ?? 0) > maxTraitCount) {
				maxTraitCount = count ?? 0;
				favoriteTrait = tr;
			}
		}

		const updated: PixelSurvivorStats = {
			...stats,
			totalCharactersCreated: stats.totalCharactersCreated + 1,
			elementCounts,
			traitCounts,
			favoriteElement,
			favoriteTrait
		};
		saveStats(updated);
		return updated;
	});

	// Exit character creation mode
	isCreatingCharacter.set(false);

	// Reset drawing state
	currentDrawing.set('1'.repeat(64));
	survivorSelectedColor.set(0);
}

/**
 * @deprecated Use startNewRunFromPixels instead
 * Start a new run with a character (legacy compatibility)
 */
export function startNewRun(character: SurvivorCharacter): void {
	// If gameCharacter is already set, use it
	if (character.gameCharacter) {
		const now = Date.now();

		const newRun: PixelSurvivorRun = {
			version: 2,
			runId: generateRunId(),
			startedAt: now,
			lastSavedAt: now,
			seed: crypto.getRandomValues(new Uint32Array(1))[0] % 1000000,
			character,
			serializedCharacter: serializeCharacter(character.gameCharacter),
			phase: 'survivor-menu'
		};

		saveRun(newRun);
		survivorRun.set(newRun);
		currentGameCharacter.set(character.gameCharacter);
		statManager.set(character.gameCharacter.statManager);

		const processor = new EffectProcessor(character.gameCharacter.statManager);
		effectProcessor.set(processor);

		isCreatingCharacter.set(false);
		currentDrawing.set('1'.repeat(64));
		survivorSelectedColor.set(0);
		return;
	}

	// Otherwise create from pixels
	startNewRunFromPixels(character.pixels, character.name);
}

/**
 * Enter character creation phase (for new run)
 */
export function enterCharacterCreation(): void {
	// Clear any existing run data
	deleteRun();
	survivorRun.set(null);
	currentGameCharacter.set(null);

	// Enter character creation mode
	isCreatingCharacter.set(true);

	// Reset drawing state for character creation
	currentDrawing.set('1'.repeat(64));
	survivorSelectedColor.set(0);
}

/**
 * Exit character creation without starting a run
 */
export function cancelCharacterCreation(): void {
	isCreatingCharacter.set(false);
	currentDrawing.set('1'.repeat(64));
}

/**
 * Enter gameplay mode (requires active run with character)
 */
export function enterGameplay(): void {
	const run = get(survivorRun);
	if (!run || !run.character) {
		console.error('Cannot enter gameplay: no active run or character');
		return;
	}
	setPhase('survivor-gameplay');
}

/**
 * Exit gameplay and return to menu
 */
export function exitGameplay(): void {
	setPhase('survivor-menu');
}

// ============================================
// SUBSCRIPTIONS FOR AUTO-SAVE
// ============================================

// Auto-save settings when changed
survivorSettings.subscribe((settings) => {
	if (settings.version > 0) {
		saveSettings(settings);
	}
});
