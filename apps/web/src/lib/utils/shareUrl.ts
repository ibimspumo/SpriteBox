// Share URL Encoding/Decoding Utilities
// Format: {pixels}.{base64Username}.{timestamp}

export interface ShareData {
	pixels: string; // 64-char hex string (8x8 grid)
	username: string; // e.g., "Alice#0042"
	timestamp: number; // Unix timestamp in milliseconds
}

/**
 * Encodes share data into a URL-safe string.
 * Uses Base64-URL encoding for username to handle special characters like #
 */
export function encodeShareData(data: ShareData): string {
	const { pixels, username, timestamp } = data;

	// Base64-URL encode the username (handles #, unicode, etc.)
	const encodedUsername = btoa(encodeURIComponent(username))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

	return `${pixels}.${encodedUsername}.${timestamp}`;
}

/**
 * Decodes a URL parameter back into share data.
 * Returns null if the data is invalid or malformed.
 */
export function decodeShareData(encoded: string): ShareData | null {
	try {
		const parts = encoded.split('.');
		if (parts.length !== 3) return null;

		const [pixels, encodedUsername, timestampStr] = parts;

		// Validate pixels (must be exactly 64 hex characters)
		if (!/^[0-9A-Fa-f]{64}$/.test(pixels)) return null;

		// Decode username from Base64-URL
		let padded = encodedUsername.replace(/-/g, '+').replace(/_/g, '/');
		while (padded.length % 4) padded += '=';
		const username = decodeURIComponent(atob(padded));

		// Validate username has discriminator format (Name#0000)
		if (!username.includes('#')) return null;

		// Validate timestamp
		const timestamp = parseInt(timestampStr, 10);
		if (isNaN(timestamp) || timestamp < 0) return null;

		return { pixels: pixels.toUpperCase(), username, timestamp };
	} catch {
		return null;
	}
}

/**
 * Generates a full share URL for the given data.
 */
export function generateShareUrl(data: ShareData): string {
	const origin = typeof window !== 'undefined' ? window.location.origin : '';
	return `${origin}/share/${encodeShareData(data)}`;
}
