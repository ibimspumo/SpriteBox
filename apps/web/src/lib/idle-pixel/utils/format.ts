// apps/web/src/lib/idle-pixel/utils/format.ts
// Large number formatting utilities using break_eternity.js

import Decimal from 'break_eternity.js';

/**
 * Short suffixes for number tiers (powers of 1000)
 * Tier 0 = 1, Tier 1 = K (Thousand), Tier 2 = M (Million), etc.
 *
 * Standard abbreviations used in incremental games:
 * - Basic: K, M, B, T
 * - -illions: Qa, Qi, Sx, Sp, Oc, No, Dc
 * - Teens: UDc, DDc, TDc, QaDc, QiDc, SxDc, SpDc, OcDc, NoDc
 * - Twenties: Vg, UVg, DVg, TVg, QaVg, QiVg, SxVg, SpVg, OcVg, NoVg
 * - Thirties: Tg, UTg, DTg, TTg, QaTg, QiTg, SxTg, SpTg, OcTg, NoTg
 * - And so on...
 *
 * This covers numbers up to 10^303 (Centillion) and beyond
 */
const SUFFIXES = [
	'', // 10^0
	'K', // 10^3 - Thousand
	'M', // 10^6 - Million
	'B', // 10^9 - Billion
	'T', // 10^12 - Trillion
	'Qa', // 10^15 - Quadrillion
	'Qi', // 10^18 - Quintillion
	'Sx', // 10^21 - Sextillion
	'Sp', // 10^24 - Septillion
	'Oc', // 10^27 - Octillion
	'No', // 10^30 - Nonillion
	'Dc', // 10^33 - Decillion
	'UDc', // 10^36 - Undecillion
	'DDc', // 10^39 - Duodecillion
	'TDc', // 10^42 - Tredecillion
	'QaDc', // 10^45 - Quattuordecillion
	'QiDc', // 10^48 - Quindecillion
	'SxDc', // 10^51 - Sexdecillion
	'SpDc', // 10^54 - Septendecillion
	'OcDc', // 10^57 - Octodecillion
	'NoDc', // 10^60 - Novemdecillion
	'Vg', // 10^63 - Vigintillion
	'UVg', // 10^66 - Unvigintillion
	'DVg', // 10^69 - Duovigintillion
	'TVg', // 10^72 - Trevigintillion
	'QaVg', // 10^75 - Quattuorvigintillion
	'QiVg', // 10^78 - Quinvigintillion
	'SxVg', // 10^81 - Sexvigintillion
	'SpVg', // 10^84 - Septenvigintillion
	'OcVg', // 10^87 - Octovigintillion
	'NoVg', // 10^90 - Novemvigintillion
	'Tg', // 10^93 - Trigintillion
	'UTg', // 10^96 - Untrigintillion
	'DTg', // 10^99 - Duotrigintillion
	'TTg', // 10^102 - Tretrigintillion
	'QaTg', // 10^105 - Quattuortrigintillion
	'QiTg', // 10^108 - Quintrigintillion
	'SxTg', // 10^111 - Sextrigintillion
	'SpTg', // 10^114 - Septentrigintillion
	'OcTg', // 10^117 - Octotrigintillion
	'NoTg', // 10^120 - Novemtrigintillion
	'Qag', // 10^123 - Quadragintillion
	'UQag', // 10^126 - Unquadragintillion
	'DQag', // 10^129 - Duoquadragintillion
	'TQag', // 10^132 - Trequadragintillion
	'QaQag', // 10^135 - Quattuorquadragintillion
	'QiQag', // 10^138 - Quinquadragintillion
	'SxQag', // 10^141 - Sexquadragintillion
	'SpQag', // 10^144 - Septenquadragintillion
	'OcQag', // 10^147 - Octoquadragintillion
	'NoQag', // 10^150 - Novemquadragintillion
	'Qig', // 10^153 - Quinquagintillion
	'UQig', // 10^156 - Unquinquagintillion
	'DQig', // 10^159 - Duoquinquagintillion
	'TQig', // 10^162 - Trequinquagintillion
	'QaQig', // 10^165 - Quattuorquinquagintillion
	'QiQig', // 10^168 - Quinquinquagintillion
	'SxQig', // 10^171 - Sexquinquagintillion
	'SpQig', // 10^174 - Septenquinquagintillion
	'OcQig', // 10^177 - Octoquinquagintillion
	'NoQig', // 10^180 - Novemquinquagintillion
	'Sxg', // 10^183 - Sexagintillion
	'USxg', // 10^186 - Unsexagintillion
	'DSxg', // 10^189 - Duosexagintillion
	'TSxg', // 10^192 - Tresexagintillion
	'QaSxg', // 10^195 - Quattuorsexagintillion
	'QiSxg', // 10^198 - Quinsexagintillion
	'SxSxg', // 10^201 - Sexsexagintillion
	'SpSxg', // 10^204 - Septensexagintillion
	'OcSxg', // 10^207 - Octosexagintillion
	'NoSxg', // 10^210 - Novemsexagintillion
	'Spg', // 10^213 - Septuagintillion
	'USpg', // 10^216 - Unseptuagintillion
	'DSpg', // 10^219 - Duoseptuagintillion
	'TSpg', // 10^222 - Treseptuagintillion
	'QaSpg', // 10^225 - Quattuorseptuagintillion
	'QiSpg', // 10^228 - Quinseptuagintillion
	'SxSpg', // 10^231 - Sexseptuagintillion
	'SpSpg', // 10^234 - Septenseptuagintillion
	'OcSpg', // 10^237 - Octoseptuagintillion
	'NoSpg', // 10^240 - Novemseptuagintillion
	'Ocg', // 10^243 - Octogintillion
	'UOcg', // 10^246 - Unoctogintillion
	'DOcg', // 10^249 - Duooctogintillion
	'TOcg', // 10^252 - Treoctogintillion
	'QaOcg', // 10^255 - Quattuoroctogintillion
	'QiOcg', // 10^258 - Quinoctogintillion
	'SxOcg', // 10^261 - Sexoctogintillion
	'SpOcg', // 10^264 - Septenoctogintillion
	'OcOcg', // 10^267 - Octooctogintillion
	'NoOcg', // 10^270 - Novemoctogintillion
	'Nog', // 10^273 - Nonagintillion
	'UNog', // 10^276 - Unnonagintillion
	'DNog', // 10^279 - Duononagintillion
	'TNog', // 10^282 - Trenonagintillion
	'QaNog', // 10^285 - Quattuornonagintillion
	'QiNog', // 10^288 - Quinnonagintillion
	'SxNog', // 10^291 - Sexnonagintillion
	'SpNog', // 10^294 - Septennonagintillion
	'OcNog', // 10^297 - Octononagintillion
	'NoNog', // 10^300 - Novemnonagintillion
	'Ce', // 10^303 - Centillion
];

/**
 * Formats a large number using short notation
 * Examples:
 *   123 → "123"
 *   1234 → "1.23K"
 *   1234567 → "1.23M"
 *   1.23e15 → "1.23Qa"
 *   1.23e303 → "1.23Ce"
 *   1.23e400 → "1.23e400" (beyond known suffixes)
 */
export function formatBigNumber(value: number): string {
	// Handle small numbers directly
	if (value < 1000) {
		// Show 1 decimal for small numbers, none for larger
		if (value < 10) {
			return value.toFixed(1);
		}
		return Math.floor(value).toString();
	}

	const decimal = new Decimal(value);
	const exponent = decimal.exponent;
	const tier = Math.floor(exponent / 3);

	// Use short suffix if available
	if (tier < SUFFIXES.length) {
		const divisor = Decimal.pow(1000, tier);
		const scaled = decimal.div(divisor);
		const scaledNum = scaled.toNumber();

		// Format with 2 decimal places, no space before suffix
		const suffix = SUFFIXES[tier];
		return suffix ? `${scaledNum.toFixed(2)}${suffix}` : scaledNum.toFixed(2);
	}

	// Fall back to exponential notation for very large numbers
	return decimal.toExponential(2);
}

/**
 * Formats a number as a rate (per second)
 * Example: 1234567 → "1.23M/s"
 */
export function formatRate(value: number): string {
	return `${formatBigNumber(value)}/s`;
}

/**
 * Formats a cost, showing if affordable
 * Returns formatted string with optional "affordable" indicator
 */
export function formatCost(cost: number, currentCurrency: number): { text: string; affordable: boolean } {
	return {
		text: formatBigNumber(cost),
		affordable: currentCurrency >= cost,
	};
}

/**
 * Formats a percentage (0-1 range to percentage string)
 * Example: 0.1234 → "12.34%"
 */
export function formatPercent(value: number, decimals = 2): string {
	return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formats a multiplier
 * Example: 1.5 → "1.5x", 2 → "2x"
 */
export function formatMultiplier(value: number): string {
	if (value === Math.floor(value)) {
		return `${value}x`;
	}
	return `${value.toFixed(2)}x`;
}

/**
 * Formats time in seconds to human-readable string
 * Examples:
 *   45 → "45s"
 *   90 → "1m 30s"
 *   3661 → "1h 1m"
 */
export function formatTime(seconds: number): string {
	if (seconds < 60) {
		return `${Math.floor(seconds)}s`;
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60);

	if (minutes < 60) {
		if (remainingSeconds === 0) {
			return `${minutes}m`;
		}
		return `${minutes}m ${remainingSeconds}s`;
	}

	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;

	if (remainingMinutes === 0) {
		return `${hours}h`;
	}
	return `${hours}h ${remainingMinutes}m`;
}
