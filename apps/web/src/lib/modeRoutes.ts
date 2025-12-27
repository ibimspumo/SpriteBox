// apps/web/src/lib/modeRoutes.ts
// URL routing utilities for game modes - derives from central metadata

import { GAME_MODE_METADATA, type GameModeId } from './modeMetadata';

/**
 * Build MODE_SLUGS dynamically from central metadata
 * Maps URL-friendly slugs to internal game mode IDs
 */
export const MODE_SLUGS: Record<string, string> = Object.fromEntries(
	Object.values(GAME_MODE_METADATA).map((meta) => [meta.slug, meta.id])
);

/**
 * Build SLUG_FROM_MODE dynamically from central metadata
 * Maps internal game mode IDs to URL-friendly slugs
 */
export const SLUG_FROM_MODE: Record<string, string> = Object.fromEntries(
	Object.values(GAME_MODE_METADATA).map((meta) => [meta.id, meta.slug])
);

/**
 * Get the internal game mode ID from a URL slug
 */
export function getModeFromSlug(slug: string): string | null {
	return MODE_SLUGS[slug.toLowerCase()] ?? null;
}

/**
 * Get the URL slug for a game mode ID
 */
export function getSlugFromMode(modeId: string): string | null {
	return SLUG_FROM_MODE[modeId] ?? null;
}

/**
 * Check if a slug is valid
 */
export function isValidSlug(slug: string): boolean {
	return slug.toLowerCase() in MODE_SLUGS;
}

/**
 * Get the game mode page URL
 */
export function getModeUrl(modeId: string): string {
	const slug = getSlugFromMode(modeId);
	return slug ? `/play/${slug}` : '/play';
}

/**
 * Get the private room URL
 */
export function getPrivateRoomUrl(modeId: string, roomCode: string): string {
	const slug = getSlugFromMode(modeId);
	return slug ? `/play/${slug}/${roomCode.toUpperCase()}` : `/play`;
}
