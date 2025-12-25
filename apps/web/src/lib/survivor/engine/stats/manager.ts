/**
 * Stat Manager
 *
 * The main class for managing character stats.
 * Coordinates between base stats, modifiers, and effects.
 *
 * @module engine/stats/manager
 */

import type {
	StatType,
	StatValue,
	StatBreakdown,
	StatModifierBreakdown,
	BaseStats,
	SerializedStats
} from './types.js';
import { DEFAULT_BASE_STATS } from './types.js';
import { getStatDefinition, STAT_DEFINITIONS, RESOURCE_STATS } from './registry.js';
import { ModifierStackManager, type ConditionContext } from '../modifiers/stack.js';
import type {
	StatModifier,
	ModifierSource,
	ModifierSourceType,
	ModifierTemplate,
	SerializedModifier
} from '../modifiers/types.js';
import { createModifier, serializeModifier, deserializeModifier } from '../modifiers/types.js';

// ============================================
// SERIALIZATION TYPES
// ============================================

/**
 * Serialized state of the StatManager.
 */
export interface SerializedStatManager {
	version: number;
	baseStats: BaseStats;
	resourceValues: Partial<Record<StatType, number>>;
	modifiers: SerializedModifier[];
	level: number;
	xp: number;
}

// ============================================
// STAT MANAGER
// ============================================

/**
 * Main class for managing character stats.
 *
 * Usage:
 * ```typescript
 * const manager = new StatManager(baseStats);
 *
 * // Get stats
 * const attack = manager.getStat('attack');
 * const hp = manager.getCurrentResource('hp');
 *
 * // Add modifiers
 * manager.addModifier(modifier);
 * manager.applyCard(card);
 * manager.equipItem(item);
 *
 * // Track changes
 * manager.onChange(() => updateUI());
 * ```
 */
export class StatManager {
	/** Base stats from character creation */
	private baseStats: BaseStats;

	/** Modifier stack manager */
	private modifierStack: ModifierStackManager;

	/** Current resource values (HP, Mana, Shield) */
	private resourceValues: Map<StatType, number> = new Map();

	/** Current level */
	private _level: number = 1;

	/** Current XP */
	private _xp: number = 0;

	/** Change callbacks */
	private changeCallbacks: Set<() => void> = new Set();

	/** Version for serialization */
	private static readonly VERSION = 1;

	constructor(baseStats?: Partial<BaseStats>) {
		this.baseStats = { ...DEFAULT_BASE_STATS, ...baseStats };
		this.modifierStack = new ModifierStackManager();

		// Initialize resource values to max
		this.initializeResources();

		// Wire up modifier changes
		this.modifierStack.onChange(() => this.notifyChange());
	}

	// ============================================
	// INITIALIZATION
	// ============================================

	/**
	 * Initialize resource values to their max values.
	 */
	private initializeResources(): void {
		// HP starts at max
		this.resourceValues.set('hp', this.baseStats.maxHp);
		// Mana starts at max
		this.resourceValues.set('mana', this.baseStats.maxMana);
		// Shield starts at 0
		this.resourceValues.set('shield', 0);
	}

	// ============================================
	// STAT GETTERS
	// ============================================

	/**
	 * Get the final calculated value of a stat.
	 */
	getStat(stat: StatType): number {
		const baseValue = this.getBaseValue(stat);
		return this.modifierStack.calculateStat(stat, baseValue);
	}

	/**
	 * Get the base value of a stat (before modifiers).
	 */
	getBaseValue(stat: StatType): number {
		switch (stat) {
			case 'hp':
			case 'maxHp':
				return this.baseStats.maxHp;
			case 'mana':
			case 'maxMana':
				return this.baseStats.maxMana;
			case 'attack':
				return this.baseStats.attack;
			case 'defense':
				return this.baseStats.defense;
			case 'speed':
				return this.baseStats.speed;
			case 'luck':
				return this.baseStats.luck;
			default:
				// Use default from stat definition
				return getStatDefinition(stat).defaultValue;
		}
	}

	/**
	 * Get current resource value (HP, Mana, Shield).
	 */
	getCurrentResource(stat: StatType): number {
		if (!RESOURCE_STATS.includes(stat)) {
			throw new Error(`[StatManager] ${stat} is not a resource stat`);
		}
		return this.resourceValues.get(stat) ?? 0;
	}

	/**
	 * Get max resource value.
	 */
	getMaxResource(stat: StatType): number {
		switch (stat) {
			case 'hp':
				return this.getStat('maxHp');
			case 'mana':
				return this.getStat('maxMana');
			case 'shield':
				// Shield has no max by default, use a large number
				return 9999;
			default:
				throw new Error(`[StatManager] ${stat} is not a resource stat`);
		}
	}

	/**
	 * Get resource percentage (0-100).
	 */
	getResourcePercent(stat: StatType): number {
		const current = this.getCurrentResource(stat);
		const max = this.getMaxResource(stat);
		if (max === 0) return 0;
		return Math.round((current / max) * 100);
	}

	/**
	 * Get all stats as a map.
	 */
	getAllStats(): Map<StatType, number> {
		const stats = new Map<StatType, number>();
		for (const statType of STAT_DEFINITIONS.keys()) {
			stats.set(statType, this.getStat(statType));
		}
		return stats;
	}

	/**
	 * Get a detailed breakdown of how a stat was calculated.
	 */
	getStatBreakdown(stat: StatType): StatBreakdown {
		const baseValue = this.getBaseValue(stat);
		const finalValue = this.getStat(stat);
		const modifiers = this.modifierStack.getModifiersForStat(stat);

		const modifierBreakdowns: StatModifierBreakdown[] = modifiers.map((m) => ({
			sourceName: m.source.name,
			sourceType: m.source.type,
			operation: m.operation,
			value: m.value * (m.currentStacks ?? 1),
			contribution: this.calculateContribution(m, baseValue, finalValue)
		}));

		return {
			stat,
			baseValue,
			finalValue,
			modifiers: modifierBreakdowns
		};
	}

	/**
	 * Calculate how much a modifier contributed to the final value.
	 */
	private calculateContribution(
		modifier: StatModifier,
		baseValue: number,
		_finalValue: number
	): number {
		const value = modifier.value * (modifier.currentStacks ?? 1);

		switch (modifier.operation) {
			case 'flat':
				return value;
			case 'percent_base':
				return baseValue * (value / 100);
			case 'percent_total':
				// Approximate - would need full recalculation for exact value
				return value;
			case 'multiply':
				// Approximate
				return value;
			case 'override':
				return value;
			default:
				return 0;
		}
	}

	// ============================================
	// RESOURCE MODIFICATION
	// ============================================

	/**
	 * Set a resource to a specific value.
	 */
	setResource(stat: StatType, value: number): void {
		if (!RESOURCE_STATS.includes(stat)) {
			throw new Error(`[StatManager] ${stat} is not a resource stat`);
		}

		const max = this.getMaxResource(stat);
		const clamped = Math.max(0, Math.min(max, Math.round(value)));
		this.resourceValues.set(stat, clamped);
		this.notifyChange();
	}

	/**
	 * Modify a resource by a delta.
	 * Returns the actual change applied.
	 */
	modifyResource(stat: StatType, delta: number): number {
		const current = this.getCurrentResource(stat);
		const max = this.getMaxResource(stat);
		const newValue = Math.max(0, Math.min(max, current + delta));
		const actualDelta = newValue - current;

		this.resourceValues.set(stat, newValue);
		this.notifyChange();

		return actualDelta;
	}

	/**
	 * Heal HP by an amount.
	 * Returns the actual healing done.
	 */
	heal(amount: number): number {
		return this.modifyResource('hp', Math.abs(amount));
	}

	/**
	 * Heal HP by a percentage of max HP.
	 */
	healPercent(percent: number): number {
		const max = this.getMaxResource('hp');
		const amount = Math.round((max * percent) / 100);
		return this.heal(amount);
	}

	/**
	 * Take damage.
	 * Damage is first applied to shield, then to HP.
	 * Returns { shieldDamage, hpDamage, remainingHp }
	 */
	takeDamage(amount: number): { shieldDamage: number; hpDamage: number; remainingHp: number } {
		const damage = Math.abs(amount);
		const currentShield = this.getCurrentResource('shield');

		let shieldDamage = 0;
		let hpDamage = 0;

		if (currentShield > 0) {
			// Shield absorbs damage first
			shieldDamage = Math.min(currentShield, damage);
			this.modifyResource('shield', -shieldDamage);

			// Remaining damage goes to HP
			hpDamage = damage - shieldDamage;
		} else {
			hpDamage = damage;
		}

		if (hpDamage > 0) {
			this.modifyResource('hp', -hpDamage);
		}

		return {
			shieldDamage,
			hpDamage,
			remainingHp: this.getCurrentResource('hp')
		};
	}

	/**
	 * Add shield.
	 */
	addShield(amount: number): number {
		return this.modifyResource('shield', Math.abs(amount));
	}

	/**
	 * Restore mana.
	 */
	restoreMana(amount: number): number {
		return this.modifyResource('mana', Math.abs(amount));
	}

	/**
	 * Spend mana.
	 * Returns true if successful, false if not enough mana.
	 */
	spendMana(amount: number): boolean {
		const current = this.getCurrentResource('mana');
		if (current < amount) return false;

		this.modifyResource('mana', -amount);
		return true;
	}

	/**
	 * Check if player is dead (HP <= 0).
	 */
	isDead(): boolean {
		return this.getCurrentResource('hp') <= 0;
	}

	/**
	 * Restore all resources to max.
	 */
	fullRestore(): void {
		this.setResource('hp', this.getMaxResource('hp'));
		this.setResource('mana', this.getMaxResource('mana'));
		this.setResource('shield', 0); // Shield resets to 0
	}

	// ============================================
	// MODIFIER MANAGEMENT
	// ============================================

	/**
	 * Add a modifier directly.
	 */
	addModifier(modifier: StatModifier): void {
		this.modifierStack.addModifier(modifier);
	}

	/**
	 * Add a modifier from a template.
	 */
	addModifierFromTemplate(template: ModifierTemplate, source: ModifierSource): StatModifier {
		const modifier = createModifier(template, source);
		this.addModifier(modifier);
		return modifier;
	}

	/**
	 * Remove a modifier by ID.
	 */
	removeModifier(modifierId: string): boolean {
		return this.modifierStack.removeModifier(modifierId);
	}

	/**
	 * Remove all modifiers from a source.
	 */
	removeModifiersBySource(sourceId: string, sourceType?: ModifierSourceType): number {
		return this.modifierStack.removeBySource(sourceId, sourceType);
	}

	/**
	 * Remove all modifiers of a source type.
	 */
	removeModifiersBySourceType(sourceType: ModifierSourceType): number {
		return this.modifierStack.removeAllBySourceType(sourceType);
	}

	/**
	 * Get all active modifiers.
	 */
	getModifiers(): StatModifier[] {
		return this.modifierStack.getAllModifiers();
	}

	/**
	 * Get modifiers for a specific stat.
	 */
	getModifiersForStat(stat: StatType): StatModifier[] {
		return this.modifierStack.getModifiersForStat(stat);
	}

	/**
	 * Get modifiers by source type.
	 */
	getModifiersBySourceType(sourceType: ModifierSourceType): StatModifier[] {
		return this.modifierStack.getModifiersBySourceType(sourceType);
	}

	// ============================================
	// CARD SYSTEM
	// ============================================

	/**
	 * Apply a card's effects.
	 * Cards have buffs and debuffs that last until run end.
	 */
	applyCard(card: CardDefinition): void {
		const source: ModifierSource = {
			type: 'card',
			id: card.id,
			name: card.name,
			icon: card.icon,
			appliedAt: Date.now()
			// No expiresAt = permanent until run end
		};

		// Apply buffs
		for (const buff of card.buffs) {
			this.addModifierFromTemplate(buff, source);
		}

		// Apply debuffs
		for (const debuff of card.debuffs) {
			this.addModifierFromTemplate(debuff, source);
		}
	}

	/**
	 * Get all active cards.
	 */
	getActiveCards(): string[] {
		const cardModifiers = this.modifierStack.getModifiersBySourceType('card');
		const cardIds = new Set(cardModifiers.map((m) => m.source.id));
		return Array.from(cardIds);
	}

	/**
	 * Remove a card and its effects.
	 */
	removeCard(cardId: string): void {
		this.modifierStack.removeBySource(cardId, 'card');
	}

	// ============================================
	// ITEM SYSTEM
	// ============================================

	/**
	 * Equip an item.
	 */
	equipItem(item: ItemDefinition): void {
		const source: ModifierSource = {
			type: 'item',
			id: item.id,
			name: item.name,
			icon: item.icon,
			appliedAt: Date.now()
		};

		for (const mod of item.modifiers) {
			this.addModifierFromTemplate(mod, source);
		}
	}

	/**
	 * Unequip an item.
	 */
	unequipItem(itemId: string): void {
		this.modifierStack.removeBySource(itemId, 'item');
	}

	/**
	 * Get all equipped items.
	 */
	getEquippedItems(): string[] {
		const itemModifiers = this.modifierStack.getModifiersBySourceType('item');
		const itemIds = new Set(itemModifiers.map((m) => m.source.id));
		return Array.from(itemIds);
	}

	// ============================================
	// BUFF/DEBUFF SYSTEM
	// ============================================

	/**
	 * Apply a temporary buff.
	 */
	applyBuff(
		id: string,
		name: string,
		modifiers: ModifierTemplate[],
		duration?: number,
		icon?: string
	): void {
		const now = Date.now();
		const source: ModifierSource = {
			type: 'buff',
			id,
			name,
			icon,
			appliedAt: now,
			expiresAt: duration ? now + duration : undefined,
			duration
		};

		for (const mod of modifiers) {
			this.addModifierFromTemplate(mod, source);
		}
	}

	/**
	 * Apply a temporary debuff.
	 */
	applyDebuff(
		id: string,
		name: string,
		modifiers: ModifierTemplate[],
		duration?: number,
		icon?: string
	): void {
		const now = Date.now();
		const source: ModifierSource = {
			type: 'debuff',
			id,
			name,
			icon,
			appliedAt: now,
			expiresAt: duration ? now + duration : undefined,
			duration
		};

		for (const mod of modifiers) {
			this.addModifierFromTemplate(mod, source);
		}
	}

	/**
	 * Remove a buff/debuff.
	 */
	removeBuff(buffId: string): void {
		this.modifierStack.removeBySource(buffId, 'buff');
	}

	/**
	 * Remove a debuff.
	 */
	removeDebuff(debuffId: string): void {
		this.modifierStack.removeBySource(debuffId, 'debuff');
	}

	/**
	 * Get active buffs.
	 */
	getActiveBuffs(): ModifierSource[] {
		const buffModifiers = this.modifierStack.getModifiersBySourceType('buff');
		const sources = new Map<string, ModifierSource>();
		for (const m of buffModifiers) {
			sources.set(m.source.id, m.source);
		}
		return Array.from(sources.values());
	}

	/**
	 * Get active debuffs.
	 */
	getActiveDebuffs(): ModifierSource[] {
		const debuffModifiers = this.modifierStack.getModifiersBySourceType('debuff');
		const sources = new Map<string, ModifierSource>();
		for (const m of debuffModifiers) {
			sources.set(m.source.id, m.source);
		}
		return Array.from(sources.values());
	}

	/**
	 * Remove expired buffs/debuffs.
	 */
	removeExpired(): number {
		return this.modifierStack.removeExpired();
	}

	// ============================================
	// LEVEL SYSTEM
	// ============================================

	/**
	 * Get current level.
	 */
	get level(): number {
		return this._level;
	}

	/**
	 * Get current XP.
	 */
	get xp(): number {
		return this._xp;
	}

	/**
	 * Get XP required for next level.
	 */
	get xpToNextLevel(): number {
		return this.calculateXpForLevel(this._level + 1);
	}

	/**
	 * Get XP progress percentage (0-100).
	 */
	get xpProgress(): number {
		const currentLevelXp = this.calculateXpForLevel(this._level);
		const nextLevelXp = this.calculateXpForLevel(this._level + 1);
		const levelXpRange = nextLevelXp - currentLevelXp;
		const xpIntoLevel = this._xp - currentLevelXp;
		return Math.round((xpIntoLevel / levelXpRange) * 100);
	}

	/**
	 * Calculate XP required for a level.
	 * Level 1->2: 100 XP, then each level requires 1.33x more.
	 * Formula: 100 * (1.33^(level-1) - 1) / 0.33 (geometric series)
	 * Level 1: 0, Level 2: 100, Level 3: 233, Level 4: 410, etc.
	 */
	private calculateXpForLevel(level: number): number {
		if (level <= 1) return 0;
		const multiplier = 1.33;
		const base = 100;
		return Math.round(base * (Math.pow(multiplier, level - 1) - 1) / (multiplier - 1));
	}

	/**
	 * Add XP (applying XP rate modifier).
	 * Returns { xpGained, levelsGained }
	 */
	addXp(baseXp: number): { xpGained: number; levelsGained: number } {
		const xpRate = this.getStat('xpRate') / 100; // Convert from 100-based to multiplier
		const xpGained = Math.round(baseXp * xpRate);

		this._xp += xpGained;

		let levelsGained = 0;
		while (this._xp >= this.xpToNextLevel) {
			this._level++;
			levelsGained++;
		}

		if (levelsGained > 0) {
			this.notifyChange();
		}

		return { xpGained, levelsGained };
	}

	/**
	 * Set level directly (for initialization/loading).
	 */
	setLevel(level: number, xp: number): void {
		this._level = level;
		this._xp = xp;
		this.notifyChange();
	}

	// ============================================
	// CONTEXT MANAGEMENT
	// ============================================

	/**
	 * Update the condition context for conditional modifiers.
	 */
	updateContext(context: Partial<ConditionContext>): void {
		// Auto-calculate HP/Mana percentages
		const fullContext: Partial<ConditionContext> = {
			...context,
			hpPercent: this.getResourcePercent('hp'),
			manaPercent: this.getResourcePercent('mana'),
			level: this._level
		};

		this.modifierStack.setContext(fullContext);
	}

	/**
	 * Enter combat mode.
	 */
	enterCombat(): void {
		this.updateContext({ inCombat: true });
	}

	/**
	 * Exit combat mode.
	 */
	exitCombat(): void {
		this.updateContext({ inCombat: false });
	}

	// ============================================
	// RUN MANAGEMENT
	// ============================================

	/**
	 * End the current run (remove all temporary modifiers).
	 */
	endRun(): void {
		// Remove cards, buffs, debuffs, events, skills
		this.modifierStack.removeAllBySourceType('card');
		this.modifierStack.removeAllBySourceType('buff');
		this.modifierStack.removeAllBySourceType('debuff');
		this.modifierStack.removeAllBySourceType('event');
		this.modifierStack.removeAllBySourceType('skill');
		this.modifierStack.removeAllBySourceType('environment');
		this.modifierStack.removeAllBySourceType('monster');

		// Reset level and XP
		this._level = 1;
		this._xp = 0;

		// Restore resources
		this.fullRestore();
	}

	// ============================================
	// CHANGE NOTIFICATION
	// ============================================

	/**
	 * Register a callback for when stats change.
	 */
	onChange(callback: () => void): () => void {
		this.changeCallbacks.add(callback);
		return () => this.changeCallbacks.delete(callback);
	}

	/**
	 * Notify all callbacks of a change.
	 */
	private notifyChange(): void {
		for (const callback of this.changeCallbacks) {
			try {
				callback();
			} catch (error) {
				console.error('[StatManager] Change callback error:', error);
			}
		}
	}

	// ============================================
	// SERIALIZATION
	// ============================================

	/**
	 * Serialize the stat manager for storage.
	 */
	serialize(): SerializedStatManager {
		const resourceValues: Partial<Record<StatType, number>> = {};
		for (const [stat, value] of this.resourceValues) {
			resourceValues[stat] = value;
		}

		return {
			version: StatManager.VERSION,
			baseStats: { ...this.baseStats },
			resourceValues,
			modifiers: this.modifierStack.getAllModifiers().map(serializeModifier),
			level: this._level,
			xp: this._xp
		};
	}

	/**
	 * Deserialize from storage.
	 */
	static deserialize(data: SerializedStatManager): StatManager {
		const manager = new StatManager(data.baseStats);

		// Restore resource values
		for (const [stat, value] of Object.entries(data.resourceValues)) {
			if (value !== undefined) {
				manager.resourceValues.set(stat as StatType, value);
			}
		}

		// Restore modifiers
		for (const modData of data.modifiers) {
			const modifier = deserializeModifier(modData);
			manager.addModifier(modifier);
		}

		// Restore level and XP
		manager._level = data.level;
		manager._xp = data.xp;

		return manager;
	}
}

// ============================================
// TYPE DEFINITIONS FOR EXTERNAL SYSTEMS
// ============================================

/**
 * Card definition for level-up cards.
 */
export interface CardDefinition {
	id: string;
	name: string;
	description?: string;
	icon?: string;
	rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
	buffs: ModifierTemplate[];
	debuffs: ModifierTemplate[];
}

/**
 * Item definition for equipment.
 */
export interface ItemDefinition {
	id: string;
	name: string;
	description?: string;
	icon?: string;
	slot?: 'weapon' | 'armor' | 'accessory' | 'consumable';
	rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
	modifiers: ModifierTemplate[];
}
