/**
 * Element Interactions
 *
 * Rock-Paper-Scissors style interaction system.
 * Defines which elements are strong/weak against each other.
 *
 * Interaction Chain (Primary Elements):
 *   Fire → Earth → Air → Water → Fire
 *   (Fire beats Earth, Earth beats Air, Air beats Water, Water beats Fire)
 *
 * Mystic Elements:
 *   Light ↔ Dark (mutual super effective)
 *
 * Neutral:
 *   No strengths or weaknesses
 *
 * @module engine/core/elements/interactions
 */

import type {
	ElementType,
	InteractionType,
	ElementInteraction,
	ElementAffinity,
	ElementContext
} from './types.js';
import { INTERACTION_MULTIPLIERS, DEFAULT_ELEMENT } from './types.js';

// ============================================
// INTERACTION MATRIX
// ============================================

/**
 * Element interaction matrix.
 *
 * Format: ATTACKER → DEFENDER = InteractionType
 *
 * To add a new element:
 * 1. Add a new row for the element as attacker
 * 2. Add the element as a column in all other rows
 *
 * Interaction types:
 * - super_effective: 2x damage
 * - effective: 1.5x damage
 * - normal: 1x damage
 * - resisted: 0.5x damage
 * - immune: 0x damage
 * - absorbed: heals target
 */
export const INTERACTION_MATRIX: Record<ElementType, Partial<Record<ElementType, InteractionType>>> = {
	// ==========================================
	// FIRE attacks...
	// ==========================================
	fire: {
		fire: 'resisted',       // Fire vs Fire = not very effective
		water: 'resisted',      // Fire vs Water = weak
		earth: 'effective',     // Fire vs Earth = burns through
		air: 'normal',          // Fire vs Air = neutral (air feeds fire but also disperses)
		light: 'normal',        // Fire vs Light = neutral
		dark: 'normal',         // Fire vs Dark = neutral
		neutral: 'normal'       // Fire vs Neutral = normal
	},

	// ==========================================
	// WATER attacks...
	// ==========================================
	water: {
		fire: 'super_effective', // Water vs Fire = super effective!
		water: 'resisted',       // Water vs Water = not very effective
		earth: 'resisted',       // Water vs Earth = absorbed by earth
		air: 'effective',        // Water vs Air = rain/storms
		light: 'normal',         // Water vs Light = neutral
		dark: 'normal',          // Water vs Dark = neutral
		neutral: 'normal'        // Water vs Neutral = normal
	},

	// ==========================================
	// EARTH attacks...
	// ==========================================
	earth: {
		fire: 'resisted',        // Earth vs Fire = melted
		water: 'effective',      // Earth vs Water = absorbs/redirects
		earth: 'resisted',       // Earth vs Earth = not very effective
		air: 'super_effective',  // Earth vs Air = grounds it
		light: 'normal',         // Earth vs Light = neutral
		dark: 'normal',          // Earth vs Dark = neutral
		neutral: 'normal'        // Earth vs Neutral = normal
	},

	// ==========================================
	// AIR attacks...
	// ==========================================
	air: {
		fire: 'effective',       // Air vs Fire = fans flames but also extinguishes
		water: 'resisted',       // Air vs Water = evaporates
		earth: 'resisted',       // Air vs Earth = blocked
		air: 'resisted',         // Air vs Air = not very effective
		light: 'normal',         // Air vs Light = neutral
		dark: 'normal',          // Air vs Dark = neutral
		neutral: 'normal'        // Air vs Neutral = normal
	},

	// ==========================================
	// LIGHT attacks...
	// ==========================================
	light: {
		fire: 'normal',          // Light vs Fire = neutral
		water: 'normal',         // Light vs Water = neutral
		earth: 'normal',         // Light vs Earth = neutral
		air: 'normal',           // Light vs Air = neutral
		light: 'resisted',       // Light vs Light = not very effective
		dark: 'super_effective', // Light vs Dark = super effective!
		neutral: 'normal'        // Light vs Neutral = normal
	},

	// ==========================================
	// DARK attacks...
	// ==========================================
	dark: {
		fire: 'normal',          // Dark vs Fire = neutral
		water: 'normal',         // Dark vs Water = neutral
		earth: 'normal',         // Dark vs Earth = neutral
		air: 'normal',           // Dark vs Air = neutral
		light: 'super_effective', // Dark vs Light = super effective!
		dark: 'resisted',        // Dark vs Dark = not very effective
		neutral: 'normal'        // Dark vs Neutral = normal
	},

	// ==========================================
	// NEUTRAL attacks...
	// ==========================================
	neutral: {
		fire: 'normal',
		water: 'normal',
		earth: 'normal',
		air: 'normal',
		light: 'normal',
		dark: 'normal',
		neutral: 'normal'
	}
};

// ============================================
// INTERACTION FUNCTIONS
// ============================================

/**
 * Get the interaction type between two elements.
 */
export function getInteractionType(
	attacker: ElementType,
	defender: ElementType
): InteractionType {
	const attackerInteractions = INTERACTION_MATRIX[attacker];
	if (!attackerInteractions) {
		return 'normal';
	}

	return attackerInteractions[defender] ?? 'normal';
}

/**
 * Get the damage multiplier for an interaction.
 */
export function getInteractionMultiplier(
	attacker: ElementType,
	defender: ElementType
): number {
	const interactionType = getInteractionType(attacker, defender);
	return INTERACTION_MULTIPLIERS[interactionType];
}

/**
 * Get full interaction details between two elements.
 */
export function getElementInteraction(
	attacker: ElementType,
	defender: ElementType
): ElementInteraction {
	const type = getInteractionType(attacker, defender);
	const multiplier = INTERACTION_MULTIPLIERS[type];

	// Generate message key based on interaction
	let messageKey: string | undefined;
	if (type === 'super_effective') {
		messageKey = 'pixelSurvivor.combat.superEffective';
	} else if (type === 'effective') {
		messageKey = 'pixelSurvivor.combat.effective';
	} else if (type === 'resisted') {
		messageKey = 'pixelSurvivor.combat.resisted';
	} else if (type === 'immune') {
		messageKey = 'pixelSurvivor.combat.immune';
	}

	return {
		attacker,
		defender,
		type,
		multiplier,
		messageKey
	};
}

// ============================================
// AFFINITY-BASED CALCULATIONS
// ============================================

/**
 * Calculate damage multiplier considering element affinities.
 *
 * Supports dual-element entities:
 * - Primary element at full strength
 * - Secondary element at reduced strength (50%)
 *
 * Against dual-element defenders:
 * - Uses the most favorable interaction for the attacker
 */
export function calculateElementMultiplier(
	attackerAffinity: ElementAffinity,
	defenderAffinity: ElementAffinity
): {
	multiplier: number;
	primaryInteraction: ElementInteraction;
	secondaryInteraction?: ElementInteraction;
	effectiveInteraction: InteractionType;
} {
	// Primary element attack vs primary defense
	const primaryVsPrimary = getElementInteraction(
		attackerAffinity.primary,
		defenderAffinity.primary
	);

	let multiplier = primaryVsPrimary.multiplier;
	let effectiveInteraction = primaryVsPrimary.type;
	let secondaryInteraction: ElementInteraction | undefined;

	// If defender has secondary element, check against that too
	if (defenderAffinity.secondary) {
		const primaryVsSecondary = getElementInteraction(
			attackerAffinity.primary,
			defenderAffinity.secondary
		);

		// Use the interaction that's worse for defender (better for attacker)
		if (primaryVsSecondary.multiplier > primaryVsPrimary.multiplier) {
			// Attack is more effective against secondary element
			// Blend the multipliers based on secondary strength
			const secondaryWeight = defenderAffinity.secondaryStrength;
			multiplier = primaryVsPrimary.multiplier * (1 - secondaryWeight * 0.5) +
				primaryVsSecondary.multiplier * (secondaryWeight * 0.5);

			if (primaryVsSecondary.multiplier > multiplier) {
				effectiveInteraction = primaryVsSecondary.type;
			}
		}
	}

	// If attacker has secondary element, consider that too
	if (attackerAffinity.secondary) {
		secondaryInteraction = getElementInteraction(
			attackerAffinity.secondary,
			defenderAffinity.primary
		);

		// Secondary element contributes at reduced effectiveness
		const secondaryContribution =
			(secondaryInteraction.multiplier - 1) * attackerAffinity.secondaryStrength * 0.3;
		multiplier += secondaryContribution;
	}

	return {
		multiplier: Math.max(0, multiplier),
		primaryInteraction: primaryVsPrimary,
		secondaryInteraction,
		effectiveInteraction
	};
}

/**
 * Calculate element multiplier from context.
 */
export function calculateContextMultiplier(context: ElementContext): number {
	const result = calculateElementMultiplier(
		context.sourceElement,
		context.targetElement
	);

	let multiplier = result.multiplier;

	// Apply environmental modifiers
	if (context.environmentElement) {
		// Environment matching source element = 10% bonus
		if (context.environmentElement === context.sourceElement.primary) {
			multiplier *= 1.1;
		}
		// Environment matching target element = 10% reduction
		if (context.environmentElement === context.targetElement.primary) {
			multiplier *= 0.9;
		}
	}

	// Apply condition modifiers
	if (context.conditions) {
		multiplier *= getConditionModifier(context);
	}

	return multiplier;
}

/**
 * Get modifier from environmental conditions.
 */
function getConditionModifier(context: ElementContext): number {
	const { conditions, sourceElement } = context;
	if (!conditions) return 1;

	let modifier = 1;

	// Weather effects
	if (conditions.weather) {
		switch (conditions.weather) {
			case 'sunny':
				if (sourceElement.primary === 'fire') modifier *= 1.1;
				if (sourceElement.primary === 'water') modifier *= 0.9;
				break;
			case 'rainy':
				if (sourceElement.primary === 'water') modifier *= 1.15;
				if (sourceElement.primary === 'fire') modifier *= 0.85;
				if (sourceElement.primary === 'air') modifier *= 1.05;
				break;
			case 'stormy':
				if (sourceElement.primary === 'air') modifier *= 1.2;
				if (sourceElement.primary === 'earth') modifier *= 0.9;
				break;
			case 'snowy':
				if (sourceElement.primary === 'water') modifier *= 1.1;
				if (sourceElement.primary === 'fire') modifier *= 0.95;
				break;
		}
	}

	// Time of day effects
	if (conditions.timeOfDay) {
		switch (conditions.timeOfDay) {
			case 'day':
				if (sourceElement.primary === 'light') modifier *= 1.15;
				if (sourceElement.primary === 'dark') modifier *= 0.85;
				break;
			case 'night':
				if (sourceElement.primary === 'dark') modifier *= 1.15;
				if (sourceElement.primary === 'light') modifier *= 0.85;
				break;
			case 'dawn':
			case 'dusk':
				// Transitional - slight boost to both
				if (sourceElement.primary === 'light') modifier *= 1.05;
				if (sourceElement.primary === 'dark') modifier *= 1.05;
				break;
		}
	}

	return modifier;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all elements that the given element is strong against.
 */
export function getStrongAgainst(element: ElementType): ElementType[] {
	const interactions = INTERACTION_MATRIX[element];
	if (!interactions) return [];

	return Object.entries(interactions)
		.filter(([_, type]) => type === 'super_effective' || type === 'effective')
		.map(([elem]) => elem as ElementType);
}

/**
 * Get all elements that the given element is weak against.
 */
export function getWeakAgainst(element: ElementType): ElementType[] {
	const weaknesses: ElementType[] = [];

	for (const [attacker, interactions] of Object.entries(INTERACTION_MATRIX)) {
		const interaction = interactions[element];
		if (interaction === 'super_effective' || interaction === 'effective') {
			weaknesses.push(attacker as ElementType);
		}
	}

	return weaknesses;
}

/**
 * Get elements that resist attacks from the given element.
 */
export function getResistedBy(element: ElementType): ElementType[] {
	const interactions = INTERACTION_MATRIX[element];
	if (!interactions) return [];

	return Object.entries(interactions)
		.filter(([_, type]) => type === 'resisted' || type === 'immune')
		.map(([elem]) => elem as ElementType);
}

/**
 * Check if attacker has advantage over defender.
 */
export function hasAdvantage(attacker: ElementType, defender: ElementType): boolean {
	const type = getInteractionType(attacker, defender);
	return type === 'super_effective' || type === 'effective';
}

/**
 * Check if attacker has disadvantage against defender.
 */
export function hasDisadvantage(attacker: ElementType, defender: ElementType): boolean {
	const type = getInteractionType(attacker, defender);
	return type === 'resisted' || type === 'immune';
}

/**
 * Get a summary of element matchups for UI display.
 */
export function getElementMatchupSummary(element: ElementType): {
	strongAgainst: ElementType[];
	weakAgainst: ElementType[];
	resistedBy: ElementType[];
	neutral: ElementType[];
} {
	const strongAgainst = getStrongAgainst(element);
	const weakAgainst = getWeakAgainst(element);
	const resistedBy = getResistedBy(element);

	const allElements: ElementType[] = ['fire', 'water', 'earth', 'air', 'light', 'dark', 'neutral'];
	const neutral = allElements.filter(
		(e) =>
			e !== element &&
			!strongAgainst.includes(e) &&
			!weakAgainst.includes(e) &&
			!resistedBy.includes(e)
	);

	return {
		strongAgainst,
		weakAgainst,
		resistedBy,
		neutral
	};
}
