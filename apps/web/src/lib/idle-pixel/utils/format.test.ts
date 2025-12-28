// apps/web/src/lib/idle-pixel/utils/format.test.ts
// Unit tests for number formatting utilities

import { describe, it, expect } from 'vitest';
import {
	formatBigNumber,
	formatRate,
	formatCost,
	formatPercent,
	formatMultiplier,
	formatTime,
} from './format.js';

describe('formatBigNumber', () => {
	it('should format small numbers without suffix', () => {
		expect(formatBigNumber(0)).toBe('0.0');
		expect(formatBigNumber(5)).toBe('5.0');
		expect(formatBigNumber(9.5)).toBe('9.5');
		expect(formatBigNumber(10)).toBe('10');
		expect(formatBigNumber(100)).toBe('100');
		expect(formatBigNumber(999)).toBe('999');
	});

	it('should format thousands (K)', () => {
		expect(formatBigNumber(1000)).toBe('1.00K');
		expect(formatBigNumber(1234)).toBe('1.23K');
		expect(formatBigNumber(12345)).toBe('12.35K');
		expect(formatBigNumber(123456)).toBe('123.46K');
		expect(formatBigNumber(999999)).toBe('1000.00K');
	});

	it('should format millions (M)', () => {
		expect(formatBigNumber(1_000_000)).toBe('1.00M');
		expect(formatBigNumber(1_234_567)).toBe('1.23M');
		expect(formatBigNumber(12_345_678)).toBe('12.35M');
		expect(formatBigNumber(999_999_999)).toBe('1000.00M');
	});

	it('should format billions (B)', () => {
		expect(formatBigNumber(1_000_000_000)).toBe('1.00B');
		expect(formatBigNumber(1_234_567_890)).toBe('1.23B');
	});

	it('should format trillions (T)', () => {
		expect(formatBigNumber(1_000_000_000_000)).toBe('1.00T');
		expect(formatBigNumber(1.5e12)).toBe('1.50T');
	});

	it('should format quadrillions and beyond with short suffixes', () => {
		expect(formatBigNumber(1e15)).toBe('1.00Qa');
		expect(formatBigNumber(1e18)).toBe('1.00Qi');
		expect(formatBigNumber(1e21)).toBe('1.00Sx');
		expect(formatBigNumber(1e24)).toBe('1.00Sp');
		expect(formatBigNumber(1e27)).toBe('1.00Oc');
		expect(formatBigNumber(1e30)).toBe('1.00No');
		expect(formatBigNumber(1e33)).toBe('1.00Dc');
	});

	it('should format very large numbers up to centillion', () => {
		expect(formatBigNumber(1e63)).toBe('1.00Vg'); // Vigintillion
		expect(formatBigNumber(1e93)).toBe('1.00Tg'); // Trigintillion
		expect(formatBigNumber(1e123)).toBe('1.00Qag'); // Quadragintillion
		expect(formatBigNumber(1e153)).toBe('1.00Qig'); // Quinquagintillion
		expect(formatBigNumber(1e183)).toBe('1.00Sxg'); // Sexagintillion
		expect(formatBigNumber(1e213)).toBe('1.00Spg'); // Septuagintillion
		expect(formatBigNumber(1e243)).toBe('1.00Ocg'); // Octogintillion
		expect(formatBigNumber(1e273)).toBe('1.00Nog'); // Nonagintillion
		expect(formatBigNumber(1e303)).toBe('1.00Ce'); // Centillion
	});

	it('should fall back to exponential for numbers beyond centillion', () => {
		// Note: 1e400 becomes Infinity in JavaScript, so we test with 1e307
		// which is within JS number range but beyond our suffix list (10^303)
		const result = formatBigNumber(1e307);
		expect(result).toMatch(/e\+?307/);
	});
});

describe('formatRate', () => {
	it('should append /s to formatted number', () => {
		expect(formatRate(100)).toBe('100/s');
		expect(formatRate(1234)).toBe('1.23K/s');
		expect(formatRate(1_000_000)).toBe('1.00M/s');
	});
});

describe('formatCost', () => {
	it('should indicate affordability', () => {
		const affordable = formatCost(100, 200);
		expect(affordable.text).toBe('100');
		expect(affordable.affordable).toBe(true);

		const notAffordable = formatCost(100, 50);
		expect(notAffordable.text).toBe('100');
		expect(notAffordable.affordable).toBe(false);

		const exact = formatCost(100, 100);
		expect(exact.affordable).toBe(true);
	});

	it('should format large costs', () => {
		const result = formatCost(1_000_000, 2_000_000);
		expect(result.text).toBe('1.00M');
		expect(result.affordable).toBe(true);
	});
});

describe('formatPercent', () => {
	it('should convert decimal to percentage', () => {
		expect(formatPercent(0.1234)).toBe('12.34%');
		expect(formatPercent(0.5)).toBe('50.00%');
		expect(formatPercent(1)).toBe('100.00%');
		expect(formatPercent(0)).toBe('0.00%');
	});

	it('should respect decimal places parameter', () => {
		expect(formatPercent(0.12345, 1)).toBe('12.3%');
		expect(formatPercent(0.12345, 0)).toBe('12%');
		expect(formatPercent(0.12345, 3)).toBe('12.345%');
	});
});

describe('formatMultiplier', () => {
	it('should format whole number multipliers', () => {
		expect(formatMultiplier(2)).toBe('2x');
		expect(formatMultiplier(10)).toBe('10x');
	});

	it('should format decimal multipliers', () => {
		expect(formatMultiplier(1.5)).toBe('1.50x');
		expect(formatMultiplier(2.25)).toBe('2.25x');
	});
});

describe('formatTime', () => {
	it('should format seconds', () => {
		expect(formatTime(0)).toBe('0s');
		expect(formatTime(30)).toBe('30s');
		expect(formatTime(59)).toBe('59s');
	});

	it('should format minutes', () => {
		expect(formatTime(60)).toBe('1m');
		expect(formatTime(90)).toBe('1m 30s');
		expect(formatTime(120)).toBe('2m');
		expect(formatTime(3599)).toBe('59m 59s');
	});

	it('should format hours', () => {
		expect(formatTime(3600)).toBe('1h');
		expect(formatTime(3660)).toBe('1h 1m');
		expect(formatTime(7200)).toBe('2h');
		expect(formatTime(7320)).toBe('2h 2m');
	});
});
