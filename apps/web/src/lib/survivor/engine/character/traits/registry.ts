/**
 * Trait Registry
 *
 * Contains all trait definitions with their modifiers,
 * abilities, and synergies.
 *
 * @module engine/character/traits/registry
 */

import type { TraitType, TraitDefinition } from './types.js';

// ============================================
// TRAIT DEFINITIONS
// ============================================

/**
 * All trait definitions.
 */
export const TRAIT_DEFINITIONS: Record<TraitType, TraitDefinition> = {
	// ==========================================
	// PERFECTIONIST - High symmetry
	// ==========================================
	perfectionist: {
		id: 'perfectionist',
		nameKey: 'pixelSurvivor.traits.perfectionist.name',
		descriptionKey: 'pixelSurvivor.traits.perfectionist.description',
		flavorKey: 'pixelSurvivor.traits.perfectionist.flavor',
		icon: '✨',
		color: 'var(--color-trait-perfectionist, #88ccff)',
		category: 'defensive',
		modifiers: [
			// Perfectionists get crit bonuses and defense
			{ stat: 'critChance', operation: 'flat', value: 5 },
			{ stat: 'critDamage', operation: 'flat', value: 10 },
			{ stat: 'defense', operation: 'percent_base', value: 5 }
		],
		conditionalModifiers: [
			{
				stat: 'attack',
				operation: 'percent_base',
				value: 15,
				condition: { type: 'hp_above_percent', threshold: 90 },
				conditionDescriptionKey: 'pixelSurvivor.traits.perfectionist.condition'
			}
		],
		specialAbility: {
			id: 'precision_strike',
			nameKey: 'pixelSurvivor.traits.perfectionist.ability.name',
			descriptionKey: 'pixelSurvivor.traits.perfectionist.ability.description',
			trigger: 'on_crit',
			triggerChance: 30,
			cooldown: 3,
			effect: {
				type: 'buff_attack',
				value: 20,
				duration: 2,
				target: 'self'
			}
		},
		elementSynergies: [
			{
				element: 'light',
				bonusModifiers: [
					{ stat: 'critDamage', operation: 'flat', value: 10 }
				],
				descriptionKey: 'pixelSurvivor.traits.perfectionist.synergy.light'
			}
		],
		tags: ['symmetry', 'precision', 'defensive']
	},

	// ==========================================
	// CHAOTIC - Low symmetry
	// ==========================================
	chaotic: {
		id: 'chaotic',
		nameKey: 'pixelSurvivor.traits.chaotic.name',
		descriptionKey: 'pixelSurvivor.traits.chaotic.description',
		flavorKey: 'pixelSurvivor.traits.chaotic.flavor',
		icon: '🌀',
		color: 'var(--color-trait-chaotic, #ff44aa)',
		category: 'offensive',
		modifiers: [
			// Chaotic characters deal unpredictable damage
			{ stat: 'luck', operation: 'flat', value: 10 },
			{ stat: 'critDamage', operation: 'flat', value: 25 },
			{ stat: 'critChance', operation: 'flat', value: 8 },
			// But are less stable
			{ stat: 'defense', operation: 'percent_base', value: -10 }
		],
		conditionalModifiers: [
			{
				stat: 'attack',
				operation: 'percent_base',
				value: 25,
				condition: { type: 'hp_below_percent', threshold: 30 },
				conditionDescriptionKey: 'pixelSurvivor.traits.chaotic.condition'
			}
		],
		specialAbility: {
			id: 'wild_surge',
			nameKey: 'pixelSurvivor.traits.chaotic.ability.name',
			descriptionKey: 'pixelSurvivor.traits.chaotic.ability.description',
			trigger: 'on_attack',
			triggerChance: 15,
			cooldown: 0,
			effect: {
				type: 'damage_percent',
				value: 50,
				target: 'enemy'
			}
		},
		elementSynergies: [
			{
				element: 'fire',
				bonusModifiers: [
					{ stat: 'critChance', operation: 'flat', value: 5 }
				],
				descriptionKey: 'pixelSurvivor.traits.chaotic.synergy.fire'
			},
			{
				element: 'dark',
				bonusModifiers: [
					{ stat: 'critDamage', operation: 'flat', value: 15 }
				],
				descriptionKey: 'pixelSurvivor.traits.chaotic.synergy.dark'
			}
		],
		tags: ['asymmetry', 'luck', 'offensive', 'risky']
	},

	// ==========================================
	// BULKY - Many pixels
	// ==========================================
	bulky: {
		id: 'bulky',
		nameKey: 'pixelSurvivor.traits.bulky.name',
		descriptionKey: 'pixelSurvivor.traits.bulky.description',
		flavorKey: 'pixelSurvivor.traits.bulky.flavor',
		icon: '🛡️',
		color: 'var(--color-trait-bulky, #88aa66)',
		category: 'defensive',
		modifiers: [
			// Bulky characters are tanks
			{ stat: 'maxHp', operation: 'percent_base', value: 20 },
			{ stat: 'defense', operation: 'percent_base', value: 10 },
			// But slower
			{ stat: 'speed', operation: 'percent_base', value: -10 },
			{ stat: 'dodgeChance', operation: 'flat', value: -5 }
		],
		conditionalModifiers: [
			{
				stat: 'defense',
				operation: 'percent_base',
				value: 20,
				condition: { type: 'hp_below_percent', threshold: 50 },
				conditionDescriptionKey: 'pixelSurvivor.traits.bulky.condition'
			}
		],
		specialAbility: {
			id: 'fortify',
			nameKey: 'pixelSurvivor.traits.bulky.ability.name',
			descriptionKey: 'pixelSurvivor.traits.bulky.ability.description',
			trigger: 'on_low_hp',
			triggerChance: 100,
			cooldown: 5,
			effect: {
				type: 'gain_shield',
				value: 25, // 25% of max HP as shield
				target: 'self'
			}
		},
		elementSynergies: [
			{
				element: 'earth',
				bonusModifiers: [
					{ stat: 'defense', operation: 'percent_base', value: 10 }
				],
				descriptionKey: 'pixelSurvivor.traits.bulky.synergy.earth'
			}
		],
		tags: ['size', 'tank', 'defensive', 'slow']
	},

	// ==========================================
	// MINIMALIST - Few pixels
	// ==========================================
	minimalist: {
		id: 'minimalist',
		nameKey: 'pixelSurvivor.traits.minimalist.name',
		descriptionKey: 'pixelSurvivor.traits.minimalist.description',
		flavorKey: 'pixelSurvivor.traits.minimalist.flavor',
		icon: '💫',
		color: 'var(--color-trait-minimalist, #aaaaff)',
		category: 'utility',
		modifiers: [
			// Minimalists are fast and evasive
			{ stat: 'speed', operation: 'percent_base', value: 20 },
			{ stat: 'dodgeChance', operation: 'flat', value: 10 },
			{ stat: 'xpRate', operation: 'flat', value: 15 },
			// But fragile
			{ stat: 'maxHp', operation: 'percent_base', value: -15 }
		],
		conditionalModifiers: [
			{
				stat: 'speed',
				operation: 'percent_base',
				value: 15,
				condition: { type: 'in_combat' },
				conditionDescriptionKey: 'pixelSurvivor.traits.minimalist.condition'
			}
		],
		specialAbility: {
			id: 'quick_learner',
			nameKey: 'pixelSurvivor.traits.minimalist.ability.name',
			descriptionKey: 'pixelSurvivor.traits.minimalist.ability.description',
			trigger: 'on_kill',
			triggerChance: 50,
			cooldown: 0,
			effect: {
				type: 'gain_xp',
				value: 10, // Bonus XP
				target: 'self'
			}
		},
		elementSynergies: [
			{
				element: 'air',
				bonusModifiers: [
					{ stat: 'dodgeChance', operation: 'flat', value: 5 }
				],
				descriptionKey: 'pixelSurvivor.traits.minimalist.synergy.air'
			}
		],
		tags: ['size', 'speed', 'utility', 'fragile']
	},

	// ==========================================
	// CREATIVE - Many colors
	// ==========================================
	creative: {
		id: 'creative',
		nameKey: 'pixelSurvivor.traits.creative.name',
		descriptionKey: 'pixelSurvivor.traits.creative.description',
		flavorKey: 'pixelSurvivor.traits.creative.flavor',
		icon: '🎨',
		color: 'var(--color-trait-creative, #ff88cc)',
		category: 'utility',
		modifiers: [
			// Creative characters get luck and mana
			{ stat: 'luck', operation: 'flat', value: 15 },
			{ stat: 'maxMana', operation: 'percent_base', value: 20 },
			{ stat: 'dropChance', operation: 'flat', value: 10 }
		],
		conditionalModifiers: [],
		specialAbility: {
			id: 'inspiration',
			nameKey: 'pixelSurvivor.traits.creative.ability.name',
			descriptionKey: 'pixelSurvivor.traits.creative.ability.description',
			trigger: 'on_level_up',
			triggerChance: 100,
			cooldown: 0,
			effect: {
				type: 'restore_mana',
				value: 100, // Full mana restore on level up
				target: 'self'
			}
		},
		elementSynergies: [
			{
				element: 'light',
				bonusModifiers: [
					{ stat: 'luck', operation: 'flat', value: 10 }
				],
				descriptionKey: 'pixelSurvivor.traits.creative.synergy.light'
			}
		],
		tags: ['color', 'luck', 'utility', 'mana']
	},

	// ==========================================
	// FOCUSED - Single color
	// ==========================================
	focused: {
		id: 'focused',
		nameKey: 'pixelSurvivor.traits.focused.name',
		descriptionKey: 'pixelSurvivor.traits.focused.description',
		flavorKey: 'pixelSurvivor.traits.focused.flavor',
		icon: '🎯',
		color: 'var(--color-trait-focused, #ff6644)',
		category: 'offensive',
		modifiers: [
			// Focused characters deal consistent damage
			{ stat: 'attack', operation: 'percent_base', value: 15 },
			{ stat: 'armorPenetration', operation: 'flat', value: 10 }
		],
		conditionalModifiers: [
			{
				stat: 'critChance',
				operation: 'flat',
				value: 20,
				condition: { type: 'hp_above_percent', threshold: 80 },
				conditionDescriptionKey: 'pixelSurvivor.traits.focused.condition'
			}
		],
		specialAbility: {
			id: 'marked_target',
			nameKey: 'pixelSurvivor.traits.focused.ability.name',
			descriptionKey: 'pixelSurvivor.traits.focused.ability.description',
			trigger: 'on_combat_start',
			triggerChance: 100,
			cooldown: 0,
			effect: {
				type: 'debuff_defense',
				value: 15,
				duration: 3,
				target: 'enemy'
			}
		},
		elementSynergies: [
			{
				element: 'fire',
				bonusModifiers: [
					{ stat: 'attack', operation: 'percent_base', value: 5 }
				],
				descriptionKey: 'pixelSurvivor.traits.focused.synergy.fire'
			}
		],
		tags: ['color', 'damage', 'offensive', 'penetration']
	},

	// ==========================================
	// INTELLECTUAL - Large head
	// ==========================================
	intellectual: {
		id: 'intellectual',
		nameKey: 'pixelSurvivor.traits.intellectual.name',
		descriptionKey: 'pixelSurvivor.traits.intellectual.description',
		flavorKey: 'pixelSurvivor.traits.intellectual.flavor',
		icon: '🧠',
		color: 'var(--color-trait-intellectual, #aa88ff)',
		category: 'offensive',
		modifiers: [
			// Intellectuals excel at magic and XP
			{ stat: 'maxMana', operation: 'percent_base', value: 25 },
			{ stat: 'xpRate', operation: 'flat', value: 20 },
			{ stat: 'critDamage', operation: 'flat', value: 15 }
		],
		conditionalModifiers: [
			{
				stat: 'attack',
				operation: 'percent_base',
				value: 10,
				condition: { type: 'mana_above_percent', threshold: 50 },
				conditionDescriptionKey: 'pixelSurvivor.traits.intellectual.condition'
			}
		],
		specialAbility: {
			id: 'eureka',
			nameKey: 'pixelSurvivor.traits.intellectual.ability.name',
			descriptionKey: 'pixelSurvivor.traits.intellectual.ability.description',
			trigger: 'on_level_up',
			triggerChance: 100,
			cooldown: 0,
			effect: {
				type: 'buff_attack',
				value: 25,
				duration: 5,
				target: 'self'
			}
		},
		elementSynergies: [
			{
				element: 'dark',
				bonusModifiers: [
					{ stat: 'maxMana', operation: 'percent_base', value: 10 }
				],
				descriptionKey: 'pixelSurvivor.traits.intellectual.synergy.dark'
			}
		],
		tags: ['proportion', 'mana', 'xp', 'offensive']
	},

	// ==========================================
	// GROUNDED - Large legs
	// ==========================================
	grounded: {
		id: 'grounded',
		nameKey: 'pixelSurvivor.traits.grounded.name',
		descriptionKey: 'pixelSurvivor.traits.grounded.description',
		flavorKey: 'pixelSurvivor.traits.grounded.flavor',
		icon: '🦶',
		color: 'var(--color-trait-grounded, #886644)',
		category: 'defensive',
		modifiers: [
			// Grounded characters are stable and resistant
			{ stat: 'defense', operation: 'percent_base', value: 12 },
			{ stat: 'maxHp', operation: 'percent_base', value: 8 }
		],
		conditionalModifiers: [
			{
				stat: 'defense',
				operation: 'percent_base',
				value: 25,
				condition: { type: 'out_of_combat' },
				conditionDescriptionKey: 'pixelSurvivor.traits.grounded.condition'
			}
		],
		specialAbility: {
			id: 'stand_firm',
			nameKey: 'pixelSurvivor.traits.grounded.ability.name',
			descriptionKey: 'pixelSurvivor.traits.grounded.ability.description',
			trigger: 'on_damage_taken',
			triggerChance: 25,
			cooldown: 4,
			effect: {
				type: 'heal_percent',
				value: 15,
				target: 'self'
			}
		},
		elementSynergies: [
			{
				element: 'earth',
				bonusModifiers: [
					{ stat: 'maxHp', operation: 'percent_base', value: 10 }
				],
				descriptionKey: 'pixelSurvivor.traits.grounded.synergy.earth'
			}
		],
		tags: ['proportion', 'defense', 'stability', 'defensive']
	},

	// ==========================================
	// BALANCED - Default/no strong characteristics
	// ==========================================
	balanced: {
		id: 'balanced',
		nameKey: 'pixelSurvivor.traits.balanced.name',
		descriptionKey: 'pixelSurvivor.traits.balanced.description',
		flavorKey: 'pixelSurvivor.traits.balanced.flavor',
		icon: '⚖️',
		color: 'var(--color-trait-balanced, #88aa88)',
		category: 'balanced',
		modifiers: [
			// Balanced characters get small bonuses to everything
			{ stat: 'attack', operation: 'percent_base', value: 5 },
			{ stat: 'defense', operation: 'percent_base', value: 5 },
			{ stat: 'speed', operation: 'percent_base', value: 5 },
			{ stat: 'maxHp', operation: 'percent_base', value: 5 },
			{ stat: 'luck', operation: 'flat', value: 5 }
		],
		conditionalModifiers: [],
		specialAbility: {
			id: 'adaptability',
			nameKey: 'pixelSurvivor.traits.balanced.ability.name',
			descriptionKey: 'pixelSurvivor.traits.balanced.ability.description',
			trigger: 'on_turn_start',
			triggerChance: 20,
			cooldown: 5,
			effect: {
				type: 'heal_percent',
				value: 5,
				target: 'self'
			}
		},
		elementSynergies: [
			{
				element: 'neutral',
				bonusModifiers: [
					{ stat: 'luck', operation: 'flat', value: 5 }
				],
				descriptionKey: 'pixelSurvivor.traits.balanced.synergy.neutral'
			}
		],
		tags: ['default', 'versatile', 'balanced']
	}
};

// ============================================
// REGISTRY FUNCTIONS
// ============================================

/**
 * Get a trait definition by type.
 */
export function getTraitDefinition(trait: TraitType): TraitDefinition {
	const definition = TRAIT_DEFINITIONS[trait];
	if (!definition) {
		console.warn(`[TraitRegistry] Unknown trait: ${trait}, falling back to balanced`);
		return TRAIT_DEFINITIONS.balanced;
	}
	return definition;
}

/**
 * Get all trait definitions.
 */
export function getAllTraitDefinitions(): TraitDefinition[] {
	return Object.values(TRAIT_DEFINITIONS);
}

/**
 * Get traits by category.
 */
export function getTraitsByCategory(category: string): TraitDefinition[] {
	return Object.values(TRAIT_DEFINITIONS).filter(
		(def) => def.category === category
	);
}

/**
 * Get traits by tag.
 */
export function getTraitsByTag(tag: string): TraitDefinition[] {
	return Object.values(TRAIT_DEFINITIONS).filter((def) =>
		def.tags.includes(tag)
	);
}

/**
 * Check if a trait type is valid.
 */
export function isValidTrait(trait: string): trait is TraitType {
	return trait in TRAIT_DEFINITIONS;
}

/**
 * Get the icon for a trait.
 */
export function getTraitIcon(trait: TraitType): string {
	return getTraitDefinition(trait).icon;
}

/**
 * Get the color for a trait.
 */
export function getTraitColor(trait: TraitType): string {
	return getTraitDefinition(trait).color;
}

/**
 * Get traits that synergize with a given element.
 */
export function getTraitsForElement(element: string): TraitDefinition[] {
	return Object.values(TRAIT_DEFINITIONS).filter((def) =>
		def.elementSynergies?.some((syn) => syn.element === element)
	);
}
