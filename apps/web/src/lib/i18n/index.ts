// i18n - Internationalization Module
import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { en } from './translations/en';
import { de } from './translations/de';
import type { Language, Translations } from './translations/types';

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
