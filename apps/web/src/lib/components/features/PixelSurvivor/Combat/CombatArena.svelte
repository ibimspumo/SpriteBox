<!-- CombatArena.svelte - Combat Arena with Player and Monster Sprites -->
<script lang="ts">
	import { Badge } from '../../../atoms';
	import { PixelCanvas, DamageNumber } from '../../../utility';
	import { t } from '$lib/i18n';
	import type { MonsterInstance, CombatState } from '$lib/survivor/engine';
	import type { GameCharacter } from '$lib/survivor';

	interface DamageNumberEntry {
		id: number;
		value: number;
		type: 'damage' | 'heal' | 'crit' | 'miss';
	}

	interface Props {
		character: GameCharacter | null;
		monster: MonsterInstance | null;
		combatState: CombatState | null;
		currentHp: number;
		maxHp: number;
		playerHit: boolean;
		monsterHit: boolean;
		playerAttacking: boolean;
		monsterAttacking: boolean;
		playerDamageNumbers: DamageNumberEntry[];
		monsterDamageNumbers: DamageNumberEntry[];
		onRemoveDamageNumber: (target: 'player' | 'monster', id: number) => void;
		getMonsterName: () => string;
	}

	let {
		character,
		monster,
		combatState,
		currentHp,
		maxHp,
		playerHit,
		monsterHit,
		playerAttacking,
		monsterAttacking,
		playerDamageNumbers,
		monsterDamageNumbers,
		onRemoveDamageNumber,
		getMonsterName
	}: Props = $props();

	// Calculate HP percentages
	const playerHpPercent = $derived(
		combatState ? Math.floor((combatState.player.currentHp / combatState.player.maxHp) * 100) : 100
	);

	const monsterHpPercent = $derived(
		monster ? Math.floor((monster.currentHp / monster.maxHp) * 100) : 100
	);
</script>

<div class="combat-arena">
	<!-- Player Side -->
	<div class="combatant player-side">
		<div class="combatant-sprite" class:attacking={playerAttacking} class:hit={playerHit}>
			{#if character}
				<PixelCanvas
					pixelData={character.pixels}
					size={80}
					editable={false}
				/>
			{/if}
			{#if playerHit}
				<div class="hit-effect"></div>
			{/if}
			<!-- Floating damage numbers -->
			<div class="damage-numbers-wrapper">
				{#each playerDamageNumbers as dmg (dmg.id)}
					<DamageNumber
						value={dmg.value}
						type={dmg.type}
						onComplete={() => onRemoveDamageNumber('player', dmg.id)}
					/>
				{/each}
			</div>
		</div>
		<div class="combatant-info">
			<span class="combatant-name">{character?.name ?? 'Hero'}</span>
			<div class="hp-bar-container">
				<div class="hp-bar" style:width="{playerHpPercent}%" class:low={playerHpPercent < 25}></div>
			</div>
			<span class="hp-text">{combatState?.player.currentHp ?? currentHp} / {combatState?.player.maxHp ?? maxHp}</span>
		</div>
	</div>

	<!-- VS Indicator -->
	<div class="vs-indicator">
		<span class="vs-text">VS</span>
	</div>

	<!-- Monster Side -->
	<div class="combatant monster-side">
		<div class="combatant-sprite monster-sprite" class:attacking={monsterAttacking} class:hit={monsterHit}>
			{#if monster}
				<PixelCanvas
					pixelData={monster.pixels}
					size={80}
					editable={false}
				/>
			{/if}
			{#if monsterHit}
				<div class="hit-effect"></div>
			{/if}
			<!-- Floating damage numbers -->
			<div class="damage-numbers-wrapper">
				{#each monsterDamageNumbers as dmg (dmg.id)}
					<DamageNumber
						value={dmg.value}
						type={dmg.type}
						onComplete={() => onRemoveDamageNumber('monster', dmg.id)}
					/>
				{/each}
			</div>
		</div>
		<div class="combatant-info">
			<div class="monster-header">
				<span class="combatant-name">{getMonsterName()}</span>
				<Badge variant="warning" text={$t.pixelSurvivor.levelFormat.replace('{level}', String(monster?.level ?? 1))} />
			</div>
			<div class="hp-bar-container">
				<div class="hp-bar monster-hp" style:width="{monsterHpPercent}%" class:low={monsterHpPercent < 25}></div>
			</div>
			<span class="hp-text">{monster?.currentHp ?? 0} / {monster?.maxHp ?? 0}</span>
		</div>
	</div>
</div>

<style>
	/* Combat Arena */
	.combat-arena {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-lg);
	}

	.combatant {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		flex: 1;
	}

	.combatant-sprite {
		padding: var(--space-2);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-md);
		border: 2px solid var(--color-bg-elevated);
	}

	.monster-sprite {
		transform: scaleX(-1); /* Face the player */
	}

	/* Counter-flip damage numbers container on monster so they're readable */
	.damage-numbers-wrapper {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.monster-sprite .damage-numbers-wrapper {
		transform: scaleX(-1);
	}

	/* Attack Animations */
	.combatant-sprite {
		position: relative;
		transition: transform 0.1s ease-out;
	}

	.combatant-sprite.attacking {
		animation: attack-lunge 0.2s ease-out;
	}

	.player-side .combatant-sprite.attacking {
		animation: attack-lunge-right 0.2s ease-out;
	}

	.monster-side .combatant-sprite.attacking {
		animation: attack-lunge-left 0.2s ease-out;
	}

	.combatant-sprite.hit {
		animation: hit-shake 0.3s ease-out;
	}

	.hit-effect {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle, rgba(255, 100, 100, 0.8) 0%, transparent 70%);
		border-radius: var(--radius-md);
		animation: hit-flash 0.3s ease-out forwards;
		pointer-events: none;
	}

	@keyframes attack-lunge-right {
		0% { transform: translateX(0); }
		50% { transform: translateX(20px) scale(1.1); }
		100% { transform: translateX(0); }
	}

	@keyframes attack-lunge-left {
		0% { transform: scaleX(-1) translateX(0); }
		50% { transform: scaleX(-1) translateX(20px) scale(1.1); }
		100% { transform: scaleX(-1) translateX(0); }
	}

	@keyframes hit-shake {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-8px); }
		40% { transform: translateX(8px); }
		60% { transform: translateX(-6px); }
		80% { transform: translateX(4px); }
	}

	.monster-side .combatant-sprite.hit {
		animation: hit-shake-monster 0.3s ease-out;
	}

	@keyframes hit-shake-monster {
		0%, 100% { transform: scaleX(-1) translateX(0); }
		20% { transform: scaleX(-1) translateX(-8px); }
		40% { transform: scaleX(-1) translateX(8px); }
		60% { transform: scaleX(-1) translateX(-6px); }
		80% { transform: scaleX(-1) translateX(4px); }
	}

	@keyframes hit-flash {
		0% { opacity: 1; }
		100% { opacity: 0; }
	}

	.combatant-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		width: 100%;
	}

	.monster-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.combatant-name {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		text-transform: uppercase;
	}

	.hp-bar-container {
		width: 100%;
		height: 8px;
		background: var(--color-bg-primary);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.hp-bar {
		height: 100%;
		background: var(--color-success);
		transition: width 0.3s ease-out;
	}

	.hp-bar.low {
		background: var(--color-error);
	}

	.hp-bar.monster-hp {
		background: var(--color-danger);
	}

	.hp-text {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	/* VS Indicator */
	.vs-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2);
	}

	.vs-text {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-black);
		color: var(--color-warning);
		text-shadow: 2px 2px 0 var(--color-bg-primary);
	}

	/* Mobile */
	@media (max-width: 400px) {
		.combat-arena {
			flex-direction: column;
			gap: var(--space-2);
		}

		.vs-indicator {
			transform: rotate(90deg);
		}

		.combatant {
			flex-direction: row;
			width: 100%;
		}

		.combatant-info {
			align-items: flex-start;
		}
	}
</style>
