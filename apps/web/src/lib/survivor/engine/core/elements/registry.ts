/**
 * Element Registry
 *
 * Contains all element definitions with their properties,
 * passive modifiers, and visual styling.
 *
 * To add a new element:
 * 1. Add type to types.ts
 * 2. Add definition here
 * 3. Update INTERACTION_MATRIX in interactions.ts
 * 4. Add translations in i18n files
 *
 * @module engine/core/elements/registry
 */

import type { ElementType, ElementDefinition } from './types.js';

// ============================================
// ELEMENT DEFINITIONS
// ============================================

/**
 * All element definitions.
 */
export const ELEMENT_DEFINITIONS: Record<ElementType, ElementDefinition> = {
	// ==========================================
	// FIRE - Offensive powerhouse
	// ==========================================
	fire: {
		id: 'fire',
		nameKey: 'pixelSurvivor.elements.fire.name',
		descriptionKey: 'pixelSurvivor.elements.fire.description',
		icon: '🔥',
		color: 'var(--color-fire, #ff4444)',
		colorSecondary: 'var(--color-fire-secondary, #ff8800)',
		colorBackground: 'var(--color-fire-bg, #441111)',
		passiveModifiers: [
			// Fire characters deal more damage but are less tanky
			{ stat: 'attack', operation: 'percent_base', value: 10 },
			{ stat: 'critChance', operation: 'flat', value: 5 }
		],
		damageType: 'burn',
		associatedStatuses: ['burning', 'ignited', 'scorched'],
		tags: ['primary', 'offensive']
	},

	// ==========================================
	// WATER - Balanced and adaptive
	// ==========================================
	water: {
		id: 'water',
		nameKey: 'pixelSurvivor.elements.water.name',
		descriptionKey: 'pixelSurvivor.elements.water.description',
		icon: '💧',
		color: 'var(--color-water, #4488ff)',
		colorSecondary: 'var(--color-water-secondary, #88ccff)',
		colorBackground: 'var(--color-water-bg, #112244)',
		passiveModifiers: [
			// Water characters are balanced with slight defensive edge
			{ stat: 'defense', operation: 'percent_base', value: 5 },
			{ stat: 'maxHp', operation: 'percent_base', value: 5 }
		],
		damageType: 'freeze',
		associatedStatuses: ['wet', 'frozen', 'chilled'],
		tags: ['primary', 'defensive']
	},

	// ==========================================
	// EARTH - Defensive tank
	// ==========================================
	earth: {
		id: 'earth',
		nameKey: 'pixelSurvivor.elements.earth.name',
		descriptionKey: 'pixelSurvivor.elements.earth.description',
		icon: '🪨',
		color: 'var(--color-earth, #88664d)',
		colorSecondary: 'var(--color-earth-secondary, #44aa44)',
		colorBackground: 'var(--color-earth-bg, #332211)',
		passiveModifiers: [
			// Earth characters are very tanky but slower
			{ stat: 'defense', operation: 'percent_base', value: 15 },
			{ stat: 'maxHp', operation: 'percent_base', value: 10 },
			{ stat: 'speed', operation: 'percent_base', value: -5 }
		],
		damageType: 'crush',
		associatedStatuses: ['rooted', 'petrified', 'grounded'],
		tags: ['primary', 'defensive']
	},

	// ==========================================
	// AIR - Fast and evasive
	// ==========================================
	air: {
		id: 'air',
		nameKey: 'pixelSurvivor.elements.air.name',
		descriptionKey: 'pixelSurvivor.elements.air.description',
		icon: '💨',
		color: 'var(--color-air, #aaddff)',
		colorSecondary: 'var(--color-air-secondary, #ffffff)',
		colorBackground: 'var(--color-air-bg, #223344)',
		passiveModifiers: [
			// Air characters are fast and evasive
			{ stat: 'speed', operation: 'percent_base', value: 15 },
			{ stat: 'dodgeChance', operation: 'flat', value: 5 },
			{ stat: 'defense', operation: 'percent_base', value: -5 }
		],
		damageType: 'shock',
		associatedStatuses: ['stunned', 'electrified', 'airborne'],
		tags: ['primary', 'utility']
	},

	// ==========================================
	// LIGHT - Holy support
	// ==========================================
	light: {
		id: 'light',
		nameKey: 'pixelSurvivor.elements.light.name',
		descriptionKey: 'pixelSurvivor.elements.light.description',
		icon: '✨',
		color: 'var(--color-light, #ffee88)',
		colorSecondary: 'var(--color-light-secondary, #ffffff)',
		colorBackground: 'var(--color-light-bg, #444422)',
		passiveModifiers: [
			// Light characters have luck and resist debuffs
			{ stat: 'luck', operation: 'percent_base', value: 15 },
			{ stat: 'critDamage', operation: 'flat', value: 10 }
		],
		damageType: 'holy',
		associatedStatuses: ['blessed', 'illuminated', 'purified'],
		tags: ['mystic', 'utility']
	},

	// ==========================================
	// DARK - Sinister damage dealer
	// ==========================================
	dark: {
		id: 'dark',
		nameKey: 'pixelSurvivor.elements.dark.name',
		descriptionKey: 'pixelSurvivor.elements.dark.description',
		icon: '🌑',
		color: 'var(--color-dark, #6644aa)',
		colorSecondary: 'var(--color-dark-secondary, #000000)',
		colorBackground: 'var(--color-dark-bg, #110022)',
		passiveModifiers: [
			// Dark characters deal heavy damage and steal life
			{ stat: 'attack', operation: 'percent_base', value: 12 },
			{ stat: 'critDamage', operation: 'flat', value: 15 },
			{ stat: 'luck', operation: 'percent_base', value: -10 }
		],
		damageType: 'shadow',
		associatedStatuses: ['cursed', 'blinded', 'drained'],
		tags: ['mystic', 'offensive']
	},

	// ==========================================
	// NEUTRAL - Jack of all trades
	// ==========================================
	neutral: {
		id: 'neutral',
		nameKey: 'pixelSurvivor.elements.neutral.name',
		descriptionKey: 'pixelSurvivor.elements.neutral.description',
		icon: '⚪',
		color: 'var(--color-neutral, #888888)',
		colorSecondary: 'var(--color-neutral-secondary, #aaaaaa)',
		colorBackground: 'var(--color-neutral-bg, #333333)',
		passiveModifiers: [
			// Neutral characters get small bonuses to everything
			{ stat: 'attack', operation: 'percent_base', value: 3 },
			{ stat: 'defense', operation: 'percent_base', value: 3 },
			{ stat: 'speed', operation: 'percent_base', value: 3 }
		],
		damageType: 'physical',
		associatedStatuses: [],
		tags: ['neutral', 'utility']
	}
};

// ============================================
// REGISTRY FUNCTIONS
// ============================================

/**
 * Get an element definition by type.
 */
export function getElementDefinition(element: ElementType): ElementDefinition {
	const definition = ELEMENT_DEFINITIONS[element];
	if (!definition) {
		console.warn(`[ElementRegistry] Unknown element: ${element}, falling back to neutral`);
		return ELEMENT_DEFINITIONS.neutral;
	}
	return definition;
}

/**
 * Get all element definitions.
 */
export function getAllElementDefinitions(): ElementDefinition[] {
	return Object.values(ELEMENT_DEFINITIONS);
}

/**
 * Get elements by tag.
 */
export function getElementsByTag(tag: string): ElementDefinition[] {
	return Object.values(ELEMENT_DEFINITIONS).filter((def) =>
		def.tags.includes(tag as never)
	);
}

/**
 * Get elements by damage type.
 */
export function getElementsByDamageType(damageType: string): ElementDefinition[] {
	return Object.values(ELEMENT_DEFINITIONS).filter(
		(def) => def.damageType === damageType
	);
}

/**
 * Check if an element type is valid.
 */
export function isValidElement(element: string): element is ElementType {
	return element in ELEMENT_DEFINITIONS;
}

/**
 * Get the icon for an element.
 */
export function getElementIcon(element: ElementType): string {
	return getElementDefinition(element).icon;
}

/**
 * Get the color for an element.
 */
export function getElementColor(element: ElementType): string {
	return getElementDefinition(element).color;
}
