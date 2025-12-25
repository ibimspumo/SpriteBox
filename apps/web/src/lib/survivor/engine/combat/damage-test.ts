/**
 * Debug script for damage calculation
 * Run with: npx tsx apps/web/src/lib/survivor/engine/combat/damage-test.ts
 */

import { getCombatD20Result, DEFAULT_COMBAT_CONFIG, type DamageCalculationInput, type CombatD20Roll } from './types.js';
import { createElementAffinity } from '../core/elements/index.js';

// Simulate the damage calculation from engine.ts
function calculateDamage(input: DamageCalculationInput): void {
	const config = DEFAULT_COMBAT_CONFIG;

	console.log('\n=== DAMAGE CALCULATION DEBUG ===\n');
	console.log('INPUT:');
	console.log('  baseDamage:', input.baseDamage);
	console.log('  attackStat:', input.attackStat);
	console.log('  defenseStat:', input.defenseStat);
	console.log('  d20Roll:', input.d20Roll.value, '(multiplier:', input.d20Roll.damageMultiplier + ')');
	console.log('  defenseReductionCap:', config.defenseReductionCap);
	console.log('');

	// Step 1: Base damage (default 5)
	const baseDamage = input.baseDamage ?? 5;
	console.log('Step 1 - Base damage:', baseDamage);

	// Step 2: Apply D20 modifier (Math.round)
	const d20ModifiedDamage = Math.round(baseDamage * input.d20Roll.damageMultiplier);
	console.log('Step 2 - After D20 (', baseDamage, '*', input.d20Roll.damageMultiplier, '):', d20ModifiedDamage);

	// Step 3: Apply ability multiplier (Math.round)
	const abilityMod = input.abilityMultiplier ?? 1.0;
	const afterAbility = Math.round(d20ModifiedDamage * abilityMod);
	console.log('Step 3 - After ability (', d20ModifiedDamage, '*', abilityMod, '):', afterAbility);

	// Step 4: Apply attack stat multiplier (Math.round)
	const attackMultiplier = 1 + input.attackStat / 100;
	const afterAttack = Math.round(afterAbility * attackMultiplier);
	console.log('Step 4 - After attack (', afterAbility, '*', attackMultiplier.toFixed(2), '):', afterAttack);

	// Step 5: Apply defense multiplier (Math.round)
	const defenseCap = input.defenseCapOverride ?? config.defenseReductionCap;
	const effectiveDefense = Math.min(input.defenseStat, defenseCap);
	const defenseMultiplier = Math.max(0.1, 1 - effectiveDefense / 100);
	const afterDefense = Math.max(config.minimumDamage, Math.round(afterAttack * defenseMultiplier));
	console.log('Step 5 - Defense cap:', defenseCap, ', effective defense:', effectiveDefense);
	console.log('Step 5 - Defense multiplier:', defenseMultiplier.toFixed(2));
	console.log('Step 5 - After defense (', afterAttack, '*', defenseMultiplier.toFixed(2), '):', afterDefense);

	// Step 6: Element (assuming neutral = 1.0) (Math.round)
	const elementMultiplier = 1.0;
	const afterElement = Math.round(afterDefense * elementMultiplier);
	console.log('Step 6 - After element:', afterElement);

	// Step 7: Bonus damage
	const finalDamage = afterElement + (input.bonusDamage ?? 0);
	console.log('Step 7 - Final damage:', finalDamage);

	console.log('\n=== RESULT: ' + finalDamage + ' damage ===\n');
}

// Test scenarios
console.log('========================================');
console.log('TEST 1: Player attacks Wolf (Crit 20)');
console.log('========================================');
calculateDamage({
	baseDamage: 5, // Player base damage
	attackStat: 50, // Player attack
	defenseStat: 30, // Wolf defense
	d20Roll: getCombatD20Result(20), // Critical hit
	attackerElement: createElementAffinity('neutral'),
	defenderElement: createElementAffinity('neutral')
});

console.log('========================================');
console.log('TEST 2: Player attacks Wolf (Normal 10)');
console.log('========================================');
calculateDamage({
	baseDamage: 5,
	attackStat: 50,
	defenseStat: 30,
	d20Roll: getCombatD20Result(10),
	attackerElement: createElementAffinity('neutral'),
	defenderElement: createElementAffinity('neutral')
});

console.log('========================================');
console.log('TEST 3: Wolf attacks Player (Normal 10)');
console.log('========================================');
calculateDamage({
	baseDamage: 5, // Monster base damage
	attackStat: 45, // Wolf attack
	defenseStat: 40, // Player defense (example)
	d20Roll: getCombatD20Result(10),
	attackerElement: createElementAffinity('neutral'),
	defenderElement: createElementAffinity('neutral')
});

console.log('========================================');
console.log('TEST 4: Check if baseDamage undefined');
console.log('========================================');
calculateDamage({
	baseDamage: undefined, // Should default to 5 now
	attackStat: 50,
	defenseStat: 30,
	d20Roll: getCombatD20Result(20),
	attackerElement: createElementAffinity('neutral'),
	defenderElement: createElementAffinity('neutral')
});
