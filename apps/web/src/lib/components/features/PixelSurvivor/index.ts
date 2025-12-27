// PixelSurvivor Mode Components - Barrel Export
// Simplified: Only character creation system remains
export { default as SurvivorMenu } from './Menu.svelte';
export { default as CharacterCreation } from './CharacterCreation.svelte';
export { default as CharacterView } from './CharacterView.svelte';
export { default as SurvivorStatistics } from './Statistics.svelte';
export { default as HowToPlay } from './HowToPlay.svelte';
export { default as StatLegendModal } from './StatLegendModal.svelte';
export { default as GameplayDemo } from './GameplayDemo.svelte';
export { default as Gameplay } from './Gameplay.svelte';
export { default as Combat } from './Combat/index.svelte';

// Combat sub-components (for direct imports if needed)
export { default as CombatArena } from './Combat/CombatArena.svelte';
export { default as CombatDiceRoll } from './Combat/CombatDiceRoll.svelte';
export { default as CombatActions } from './Combat/CombatActions.svelte';
export { default as CombatLog } from './Combat/CombatLog.svelte';
export { default as CombatResult } from './Combat/CombatResult.svelte';
