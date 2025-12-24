// apps/web/src/lib/survivor/types.ts
// Type definitions for Pixel Survivor mode
// Integrated with the new engine system

import type {
	ElementType,
	ElementAffinity,
	TraitType,
	GameCharacter,
	SerializedGameCharacter
} from './engine/index.js';

// Re-export engine types for convenience
export type { ElementType, ElementAffinity, TraitType, GameCharacter, SerializedGameCharacter };

// === Game Phase ===
export type PixelSurvivorPhase =
	| 'survivor-menu'
	| 'survivor-character'
	| 'survivor-gameplay';

// === Legacy Types (kept for compatibility) ===
// These map to the new engine types

/**
 * @deprecated Use ElementType from engine instead
 */
export type Element = ElementType;

/**
 * @deprecated Use TraitType from engine instead
 */
export type Trait = TraitType;

// === Character Stats (Legacy - maps to engine BaseStats) ===
/**
 * @deprecated Use BaseStats from engine or GameCharacter.statManager instead
 */
export interface CharacterStats {
	maxHp: number;
	attack: number;
	defense: number;
	speed: number;
	luck: number;
	element: ElementType;
	trait: TraitType;
}

// === Survivor Character (Updated to use engine) ===
export interface SurvivorCharacter {
	/** 64-character hex string of pixel data */
	pixels: string;

	/** Character name */
	name: string;

	/** Full game character from engine (includes stats, element, trait) */
	gameCharacter: GameCharacter;
}

// === Current Run ===
export interface PixelSurvivorRun {
	// Meta
	version: number;
	runId: string;
	startedAt: number;
	lastSavedAt: number;
	seed: number;

	// Character
	character: SurvivorCharacter;

	// Serialized character data for persistence
	serializedCharacter?: SerializedGameCharacter;

	// Current State
	phase: PixelSurvivorPhase;
}

// === Statistics ===
export interface PixelSurvivorStats {
	version: number;

	// Character Creation Stats
	totalCharactersCreated: number;
	favoriteElement: string;
	favoriteTrait: string;

	// Element usage tracking
	elementCounts: Partial<Record<ElementType, number>>;

	// Trait usage tracking
	traitCounts: Partial<Record<TraitType, number>>;

	// Timing Stats
	totalPlayTime: number;
}

// === Settings ===
export interface PixelSurvivorSettings {
	version: number;
	musicVolume: number;
	sfxVolume: number;
	musicEnabled: boolean;
	sfxEnabled: boolean;
	showHints: boolean;
	reducedMotion: boolean;
	tutorialCompleted: boolean;
	showTutorialTips: boolean;
}

// === Default Values ===
export const DEFAULT_STATS: PixelSurvivorStats = {
	version: 2,
	totalCharactersCreated: 0,
	favoriteElement: '',
	favoriteTrait: '',
	elementCounts: {},
	traitCounts: {},
	totalPlayTime: 0,
};

export const DEFAULT_SETTINGS: PixelSurvivorSettings = {
	version: 1,
	musicVolume: 70,
	sfxVolume: 80,
	musicEnabled: true,
	sfxEnabled: true,
	showHints: true,
	reducedMotion: false,
	tutorialCompleted: false,
	showTutorialTips: true,
};
