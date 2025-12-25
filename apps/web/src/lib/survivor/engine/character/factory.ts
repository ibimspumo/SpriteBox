/**
 * Character Factory
 *
 * Creates game characters from pixel art drawings.
 * Integrates all character systems:
 * - Pixel analysis
 * - Element detection
 * - Trait detection
 * - Stats calculation
 * - Engine integration (StatManager, modifiers)
 *
 * @module engine/character/factory
 */

import { analyzeCharacterPixels, type CharacterAnalysis } from './analyzer/index.js';
import { detectElement, type ElementDetectionResult } from './element-detector.js';
import { detectTrait, getTraitDefinition, type TraitDetectionResult } from './traits/index.js';
import { calculateBaseStats, type StatCalculationResult } from './stats-calculator.js';
import { getElementDefinition, createElementAffinity, type ElementType, type ElementAffinity } from '../core/elements/index.js';
import { StatManager } from '../stats/manager.js';
import type { ModifierSource } from '../modifiers/types.js';
import type { TraitType, TraitDefinition } from './traits/types.js';
import type { ElementDefinition } from '../core/elements/types.js';

// ============================================
// GAME CHARACTER TYPE
// ============================================

/**
 * A fully created game character.
 * Includes all derived properties and engine integration.
 */
export interface GameCharacter {
	/** Unique character ID */
	id: string;

	/** Character name (player-given or generated) */
	name: string;

	/** Original pixel art (64-char hex string) */
	pixels: string;

	/** Timestamp of creation */
	createdAt: number;

	// === Element ===

	/** Element affinity */
	elementAffinity: ElementAffinity;

	/** Element definition (cached for convenience) */
	elementDefinition: ElementDefinition;

	/** Element detection details */
	elementDetection: ElementDetectionResult;

	// === Trait ===

	/** Character trait */
	trait: TraitType;

	/** Trait definition (cached for convenience) */
	traitDefinition: TraitDefinition;

	/** Trait detection details */
	traitDetection: TraitDetectionResult;

	// === Stats ===

	/** Base stats before element/trait modifiers */
	baseStats: StatCalculationResult;

	/** StatManager with all modifiers applied */
	statManager: StatManager;

	// === Analysis ===

	/** Original pixel analysis */
	analysis: CharacterAnalysis;

	// === Synergies ===

	/** Whether element and trait have synergy */
	hasSynergy: boolean;

	/** Synergy bonuses applied (if any) */
	synergyBonuses?: {
		description: string;
		modifiersApplied: number;
	};
}

// ============================================
// CHARACTER PREVIEW (for UI)
// ============================================

/**
 * Lightweight character preview for real-time UI updates.
 * Contains the essential info without full engine setup.
 */
export interface CharacterPreview {
	/** Whether the character has enough pixels to be valid */
	isValid: boolean;

	/** Detected element type */
	element: ElementType;

	/** Detected trait type */
	trait: TraitType;

	/** Base stats (without element/trait modifiers) */
	stats: {
		maxHp: number;
		attack: number;
		defense: number;
		speed: number;
		luck: number;
	};

	/** Full analysis for advanced usage */
	analysis: CharacterAnalysis;

	/** Full element detection result */
	elementResult: ElementDetectionResult;

	/** Full trait detection result */
	traitResult: TraitDetectionResult;

	/** Full stats calculation result */
	statsResult: StatCalculationResult;
}

// ============================================
// CREATION OPTIONS
// ============================================

/**
 * Options for character creation.
 */
export interface CharacterCreationOptions {
	/** Custom character name (optional) */
	name?: string;

	/** Custom character ID (optional, auto-generated if not provided) */
	id?: string;

	/** Apply element modifiers to StatManager */
	applyElementModifiers?: boolean;

	/** Apply trait modifiers to StatManager */
	applyTraitModifiers?: boolean;

	/** Apply synergy bonuses if element+trait match */
	applySynergyBonuses?: boolean;
}

const DEFAULT_OPTIONS: Required<CharacterCreationOptions> = {
	name: '',
	id: '',
	applyElementModifiers: true,
	applyTraitModifiers: true,
	applySynergyBonuses: true
};

// ============================================
// CHARACTER FACTORY
// ============================================

/**
 * Factory for creating game characters from pixel art.
 */
export class CharacterFactory {
	/**
	 * Create a game character from pixel art.
	 *
	 * @param pixels - 64-character hex string representing the pixel art
	 * @param options - Creation options
	 * @returns Fully configured GameCharacter
	 */
	static create(pixels: string, options?: CharacterCreationOptions): GameCharacter {
		const opts = { ...DEFAULT_OPTIONS, ...options };
		const now = Date.now();

		// Generate ID if not provided
		const id = opts.id || generateCharacterId();

		// 1. Analyze the pixel art
		const analysis = analyzeCharacterPixels(pixels);

		// 2. Detect element from colors
		const elementDetection = detectElement(analysis);
		const elementAffinity = createElementAffinity(
			elementDetection.element,
			elementDetection.secondaryElement
		);
		const elementDefinition = getElementDefinition(elementDetection.element);

		// 3. Detect trait from drawing characteristics
		const traitDetection = detectTrait(analysis);
		const trait = traitDetection.trait;
		const traitDefinition = getTraitDefinition(trait);

		// 4. Calculate base stats from analysis
		const baseStats = calculateBaseStats(analysis);

		// 5. Create StatManager with base stats
		const statManager = new StatManager(baseStats.stats);

		// 6. Apply element modifiers
		if (opts.applyElementModifiers) {
			applyElementModifiers(statManager, elementDefinition, elementDetection.element);
		}

		// 7. Apply trait modifiers
		if (opts.applyTraitModifiers) {
			applyTraitModifiers(statManager, traitDefinition, trait);
		}

		// 8. Check and apply synergy bonuses
		let hasSynergy = false;
		let synergyBonuses: GameCharacter['synergyBonuses'];

		if (opts.applySynergyBonuses) {
			const synergy = checkSynergy(elementDetection.element, traitDefinition);
			if (synergy) {
				hasSynergy = true;
				const modifiersApplied = applySynergyModifiers(
					statManager,
					synergy,
					elementDetection.element,
					trait
				);
				synergyBonuses = {
					description: synergy.descriptionKey || 'Element-Trait Synergy',
					modifiersApplied
				};
			}
		}

		// 9. After all modifiers applied, sync HP to the new maxHp value
		// This ensures HP starts at 100% of the MODIFIED maxHp, not the base maxHp
		statManager.fullRestore();

		// 10. Generate name if not provided
		const name = opts.name || generateCharacterName(elementDetection.element, trait);

		return {
			id,
			name,
			pixels,
			createdAt: now,
			elementAffinity,
			elementDefinition,
			elementDetection,
			trait,
			traitDefinition,
			traitDetection,
			baseStats,
			statManager,
			analysis,
			hasSynergy,
			synergyBonuses
		};
	}

	/**
	 * Create a character with minimal processing (for previews).
	 * Returns a flattened structure for easy UI consumption.
	 */
	static preview(pixels: string): CharacterPreview {
		const analysis = analyzeCharacterPixels(pixels);
		const elementResult = detectElement(analysis);
		const traitResult = detectTrait(analysis);
		const statsResult = calculateBaseStats(analysis);

		return {
			isValid: analysis.isValid,
			element: elementResult.element,
			trait: traitResult.trait,
			stats: statsResult.stats,
			// Full results for advanced usage
			analysis,
			elementResult,
			traitResult,
			statsResult
		};
	}

	/**
	 * Update a character's StatManager with new modifiers.
	 * Useful for re-applying after deserialization.
	 */
	static refreshModifiers(character: GameCharacter): void {
		// Clear existing element/trait modifiers
		character.statManager.removeModifiersBySourceType('trait');

		// Re-apply element modifiers
		applyElementModifiers(
			character.statManager,
			character.elementDefinition,
			character.elementAffinity.primary
		);

		// Re-apply trait modifiers
		applyTraitModifiers(
			character.statManager,
			character.traitDefinition,
			character.trait
		);

		// Re-apply synergy if applicable
		if (character.hasSynergy) {
			const synergy = checkSynergy(
				character.elementAffinity.primary,
				character.traitDefinition
			);
			if (synergy) {
				applySynergyModifiers(
					character.statManager,
					synergy,
					character.elementAffinity.primary,
					character.trait
				);
			}
		}

		// Sync HP to new maxHp after modifiers
		character.statManager.fullRestore();
	}
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Secure random integer using crypto API.
 */
function secureRandomInt(max: number): number {
	const array = new Uint32Array(1);
	globalThis.crypto.getRandomValues(array);
	return array[0] % max;
}

/**
 * Generate a unique character ID.
 */
function generateCharacterId(): string {
	const timestamp = Date.now().toString(36);
	const random = Array.from(crypto.getRandomValues(new Uint8Array(4)))
		.map((b) => b.toString(36))
		.join('')
		.substring(0, 6);
	return `char_${timestamp}_${random}`;
}

/**
 * Generate a character name based on element and trait.
 */
function generateCharacterName(element: ElementType, trait: TraitType): string {
	const elementPrefixes: Record<ElementType, string[]> = {
		fire: ['Blaze', 'Ember', 'Flame', 'Pyro'],
		water: ['Aqua', 'Wave', 'Tide', 'Azure'],
		earth: ['Terra', 'Stone', 'Gaia', 'Rocky'],
		air: ['Zephyr', 'Breeze', 'Storm', 'Aero'],
		light: ['Sol', 'Lumen', 'Dawn', 'Ray'],
		dark: ['Shadow', 'Nox', 'Umbra', 'Void'],
		neutral: ['Grey', 'Nova', 'Echo', 'Flux']
	};

	const traitSuffixes: Record<TraitType, string[]> = {
		perfectionist: ['Prime', 'Apex', 'Elite'],
		chaotic: ['Wild', 'Chaos', 'Storm'],
		bulky: ['Tank', 'Wall', 'Guard'],
		minimalist: ['Swift', 'Quick', 'Flash'],
		creative: ['Artist', 'Dream', 'Spark'],
		focused: ['Sharp', 'True', 'Pure'],
		intellectual: ['Sage', 'Mind', 'Wise'],
		grounded: ['Root', 'Firm', 'Steady'],
		balanced: ['Core', 'Even', 'True']
	};

	const prefixes = elementPrefixes[element];
	const suffixes = traitSuffixes[trait];

	const prefix = prefixes[secureRandomInt(prefixes.length)];
	const suffix = suffixes[secureRandomInt(suffixes.length)];

	return `${prefix}${suffix}`;
}

/**
 * Apply element passive modifiers to StatManager.
 */
function applyElementModifiers(
	statManager: StatManager,
	elementDef: ElementDefinition,
	elementId: ElementType
): void {
	const source: ModifierSource = {
		type: 'trait', // Using 'trait' type for permanent character modifiers
		id: `element_${elementId}`,
		name: elementDef.nameKey,
		icon: elementDef.icon,
		appliedAt: Date.now()
	};

	for (const modifier of elementDef.passiveModifiers) {
		statManager.addModifierFromTemplate(modifier, source);
	}
}

/**
 * Apply trait modifiers to StatManager.
 */
function applyTraitModifiers(
	statManager: StatManager,
	traitDef: TraitDefinition,
	traitId: TraitType
): void {
	const source: ModifierSource = {
		type: 'trait',
		id: `trait_${traitId}`,
		name: traitDef.nameKey,
		icon: traitDef.icon,
		appliedAt: Date.now()
	};

	// Apply permanent modifiers
	for (const modifier of traitDef.modifiers) {
		statManager.addModifierFromTemplate(modifier, source);
	}

	// Apply conditional modifiers
	if (traitDef.conditionalModifiers) {
		for (const condMod of traitDef.conditionalModifiers) {
			statManager.addModifierFromTemplate(
				{
					...condMod,
					condition: condMod.condition
				},
				source
			);
		}
	}
}

/**
 * Check if element and trait have synergy.
 */
function checkSynergy(
	element: ElementType,
	traitDef: TraitDefinition
): NonNullable<TraitDefinition['elementSynergies']>[0] | null {
	if (!traitDef.elementSynergies) return null;

	return traitDef.elementSynergies.find((syn) => syn.element === element) || null;
}

/**
 * Apply synergy bonus modifiers.
 */
function applySynergyModifiers(
	statManager: StatManager,
	synergy: NonNullable<TraitDefinition['elementSynergies']>[0],
	elementId: ElementType,
	traitId: TraitType
): number {
	const source: ModifierSource = {
		type: 'trait',
		id: `synergy_${elementId}_${traitId}`,
		name: synergy.descriptionKey || 'Element-Trait Synergy',
		appliedAt: Date.now()
	};

	let count = 0;
	for (const modifier of synergy.bonusModifiers) {
		statManager.addModifierFromTemplate(modifier, source);
		count++;
	}

	return count;
}

// ============================================
// SERIALIZATION
// ============================================

/**
 * Serialized game character for storage.
 */
export interface SerializedGameCharacter {
	id: string;
	name: string;
	pixels: string;
	createdAt: number;
	element: ElementType;
	secondaryElement?: ElementType;
	trait: TraitType;
	hasSynergy: boolean;
}

/**
 * Serialize a game character for storage.
 */
export function serializeCharacter(character: GameCharacter): SerializedGameCharacter {
	return {
		id: character.id,
		name: character.name,
		pixels: character.pixels,
		createdAt: character.createdAt,
		element: character.elementAffinity.primary,
		secondaryElement: character.elementAffinity.secondary,
		trait: character.trait,
		hasSynergy: character.hasSynergy
	};
}

/**
 * Deserialize a game character from storage.
 * Recreates the full character with fresh analysis.
 */
export function deserializeCharacter(data: SerializedGameCharacter): GameCharacter {
	return CharacterFactory.create(data.pixels, {
		id: data.id,
		name: data.name
	});
}
