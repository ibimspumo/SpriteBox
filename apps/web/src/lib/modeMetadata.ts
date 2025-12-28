// apps/web/src/lib/modeMetadata.ts
// Centralized metadata for all game modes - Single Source of Truth

/**
 * All available game mode IDs
 */
export type GameModeId =
	| 'pixel-battle'
	| 'copy-cat'
	| 'copy-cat-solo'
	| 'pixel-guesser'
	| 'pixel-survivor'
	| 'zombie-pixel'
	| 'copycat-royale'
	| 'colordle'
	| 'idle-pixel';

/**
 * Keys for modeSelection translations
 */
export type ModeSelectionKey =
	| 'classic'
	| 'copycat'
	| 'copycatsolo'
	| 'pixelguesser'
	| 'survivor'
	| 'zombiepixel'
	| 'copycatroyale'
	| 'colordle'
	| 'idlepixel';

/**
 * Metadata definition for a game mode
 */
export interface ModeMetadata {
	/** Unique identifier */
	id: GameModeId;
	/** Display icon (emoji) */
	icon: string;
	/** Accent color (CSS variable or hex) */
	accentColor: string;
	/** Key for modeSelection translations (e.g., 'classic' for $t.modeSelection.classic) */
	selectionKey: ModeSelectionKey;
	/** Legacy i18n key used by GameModeInfo (e.g., 'gameModes.pixelBattle') */
	legacyI18nKey: string;
	/** Whether the mode is in alpha/experimental state */
	isAlpha: boolean;
	/** URL slug for routing */
	slug: string;
}

/**
 * Central registry of all game mode metadata
 */
export const GAME_MODE_METADATA: Record<GameModeId, ModeMetadata> = {
	'pixel-battle': {
		id: 'pixel-battle',
		icon: '⚔️',
		accentColor: 'var(--color-success)',
		selectionKey: 'classic',
		legacyI18nKey: 'gameModes.pixelBattle',
		isAlpha: false,
		slug: 'classic',
	},
	'copy-cat': {
		id: 'copy-cat',
		icon: '🎭',
		accentColor: 'var(--color-brand)',
		selectionKey: 'copycat',
		legacyI18nKey: 'gameModes.copyCat',
		isAlpha: false,
		slug: 'copycat',
	},
	'copy-cat-solo': {
		id: 'copy-cat-solo',
		icon: '🎯',
		accentColor: 'var(--color-stat-mana)',
		selectionKey: 'copycatsolo',
		legacyI18nKey: 'gameModes.copyCatSolo',
		isAlpha: false,
		slug: 'copycat-solo',
	},
	'pixel-guesser': {
		id: 'pixel-guesser',
		icon: '🔮',
		accentColor: 'var(--color-info)',
		selectionKey: 'pixelguesser',
		legacyI18nKey: 'gameModes.pixelGuesser',
		isAlpha: false,
		slug: 'guesser',
	},
	'pixel-survivor': {
		id: 'pixel-survivor',
		icon: '💀',
		accentColor: 'var(--color-danger)',
		selectionKey: 'survivor',
		legacyI18nKey: 'gameModes.pixelSurvivor',
		isAlpha: true,
		slug: 'survivor',
	},
	'zombie-pixel': {
		id: 'zombie-pixel',
		icon: '🧟',
		accentColor: '#22c55e',
		selectionKey: 'zombiepixel',
		legacyI18nKey: 'gameModes.zombiePixel',
		isAlpha: true,
		slug: 'zombie',
	},
	'copycat-royale': {
		id: 'copycat-royale',
		icon: '👑',
		accentColor: '#f59e0b',
		selectionKey: 'copycatroyale',
		legacyI18nKey: 'gameModes.copyCatRoyale',
		isAlpha: true,
		slug: 'copycat-royale',
	},
	colordle: {
		id: 'colordle',
		icon: '🎨',
		accentColor: 'var(--color-accent)',
		selectionKey: 'colordle',
		legacyI18nKey: 'gameModes.colordle',
		isAlpha: false,
		slug: 'colordle',
	},
	'idle-pixel': {
		id: 'idle-pixel',
		icon: '⏳',
		accentColor: 'var(--color-brand)',
		selectionKey: 'idlepixel',
		legacyI18nKey: 'gameModes.idlePixel',
		isAlpha: true,
		slug: 'idle',
	},
};

// === Helper Functions ===

/**
 * Get metadata for a game mode by ID
 * Returns undefined if mode doesn't exist
 */
export function getModeMetadata(id: string): ModeMetadata | undefined {
	return GAME_MODE_METADATA[id as GameModeId];
}

/**
 * Get the icon for a game mode
 * Returns fallback icon if mode doesn't exist
 */
export function getModeIcon(id: string): string {
	return GAME_MODE_METADATA[id as GameModeId]?.icon ?? '🎮';
}

/**
 * Get the accent color for a game mode
 * Returns fallback color if mode doesn't exist
 */
export function getModeAccentColor(id: string): string {
	return GAME_MODE_METADATA[id as GameModeId]?.accentColor ?? 'var(--color-accent)';
}

/**
 * Get the selection key for a game mode (for modeSelection.xxx lookups)
 */
export function getModeSelectionKey(id: string): ModeSelectionKey | undefined {
	return GAME_MODE_METADATA[id as GameModeId]?.selectionKey;
}

/**
 * Check if a game mode is in alpha state
 */
export function isModeAlpha(id: string): boolean {
	return GAME_MODE_METADATA[id as GameModeId]?.isAlpha ?? false;
}

/**
 * Get metadata by legacy i18n key (for backwards compatibility)
 * This allows lookup by 'gameModes.pixelBattle' etc.
 */
export function getModeMetadataByLegacyKey(legacyKey: string): ModeMetadata | undefined {
	return Object.values(GAME_MODE_METADATA).find((meta) => meta.legacyI18nKey === legacyKey);
}

/**
 * Get all game mode IDs
 */
export function getAllModeIds(): GameModeId[] {
	return Object.keys(GAME_MODE_METADATA) as GameModeId[];
}

/**
 * Check if a string is a valid game mode ID
 */
export function isValidModeId(id: string): id is GameModeId {
	return id in GAME_MODE_METADATA;
}
