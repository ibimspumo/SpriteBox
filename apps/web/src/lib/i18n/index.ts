// i18n - Internationalization Module
import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { en } from './translations/en';
import { de } from './translations/de';
import type { Language, Translations } from './translations/types';
import { BALANCE } from '@spritebox/types';

// Storage key (follows existing pattern: spritebox-*)
const LANGUAGE_STORAGE_KEY = 'spritebox-language';

// Available translations
const translations: Record<Language, Translations> = { en, de };

// Detect browser language or load from storage
function getInitialLanguage(): Language {
	if (!browser) return 'en';

	// Check localStorage first
	const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
	if (stored === 'en' || stored === 'de') {
		return stored;
	}

	// Fall back to browser language
	const browserLang = navigator.language.split('-')[0];
	return browserLang === 'de' ? 'de' : 'en';
}

// Current language store
export const currentLanguage = writable<Language>(getInitialLanguage());

// Subscribe to persist changes
if (browser) {
	currentLanguage.subscribe((lang) => {
		localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
	});
}

// Derived store for current translations
export const t = derived(currentLanguage, ($lang) => translations[$lang]);

// Toggle language between en and de
export function toggleLanguage(): void {
	currentLanguage.update((lang) => (lang === 'en' ? 'de' : 'en'));
}

// Set specific language
export function setLanguage(lang: Language): void {
	currentLanguage.set(lang);
}

// Get current language (for socket auth, non-reactive contexts)
export function getLanguage(): Language {
	return get(currentLanguage);
}

// Re-export types
export type { Language, Translations };

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC BALANCE VALUES FOR TRANSLATIONS
// These values are computed from BALANCE and can be used in UI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Dynamic values computed from BALANCE constants
 * Use these in components to display current balance values
 */
export const balanceValues = {
	// Base Upgrades
	prodMultiplierPercent: Math.round((BALANCE.UPGRADES.prod_multiplier.effectValue - 1) * 100),
	cheaperPixelsPercent: Math.round((1 - BALANCE.UPGRADES.cheaper_pixels.effectValue) * 100),
	energyCapacityPercent: Math.round((BALANCE.UPGRADES.energy_capacity.effectValue - 1) * 100),
	goldenFrequencyPercent: Math.round((1 - BALANCE.UPGRADES.golden_frequency.effectValue) * 100),

	// Prestige Upgrades
	prestigeProductionMultiplier: BALANCE.PRESTIGE_PRODUCTION_BASE,
	prestigeStartCurrency: BALANCE.PRESTIGE_START_CURRENCY_PER_LEVEL,
	prestigeSlotsPerLevel: BALANCE.PRESTIGE_SLOTS_PER_LEVEL,
	prestigeGoldenBonusPercent: Math.round((BALANCE.PRESTIGE_GOLDEN_BASE - 1) * 100),

	// Offline
	offlineEfficiencyPercent: Math.round(BALANCE.OFFLINE_EFFICIENCY * 100),

	// Energy
	energyFillRatePercent: Math.round(BALANCE.ENERGY_FILL_RATE_PERCENT * 100),

	// Golden Pixel
	goldenMultiplier: BALANCE.GOLDEN_BASE_MULTIPLIER,
} as const;

/**
 * Helper to replace placeholders in translation strings
 * @example interpolate($t.some.text, { value: 25 }) // "Boost of 25%"
 */
export function interpolate(
	template: string,
	values: Record<string, string | number>
): string {
	return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
