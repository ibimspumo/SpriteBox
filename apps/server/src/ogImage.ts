// apps/server/src/ogImage.ts
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile, existsSync, mkdirSync, writeFile } from 'fs';
import { promisify } from 'util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

// OG Image dimensions (standard for social media)
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Brand colors from design tokens
const COLORS = {
  bgPrimary: '#0f0f23',
  bgSecondary: '#1a1a3e',
  bgTertiary: '#252552',
  accent: '#4ecdc4',
  brand: '#f5a623',
  brandLight: '#ffc857',
  textPrimary: '#ffffff',
  textSecondary: '#b8b8d0',
};

// Generate SVG template for OG image
function generateOgSvg(logoBase64: string): string {
  // Logo dimensions (will be scaled up for OG image)
  const logoScale = 4;
  const logoWidth = 128 * logoScale; // 512px
  const logoHeight = 24 * logoScale; // 96px

  return `
<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background gradient -->
    <radialGradient id="bgGradient" cx="50%" cy="0%" r="70%">
      <stop offset="0%" style="stop-color:${COLORS.bgTertiary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.bgPrimary};stop-opacity:1" />
    </radialGradient>

    <!-- Accent glow -->
    <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${COLORS.accent};stop-opacity:0.15" />
      <stop offset="100%" style="stop-color:${COLORS.accent};stop-opacity:0" />
    </radialGradient>

    <!-- Grid pattern for pixel art feel -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bgGradient)"/>

  <!-- Grid overlay -->
  <rect width="100%" height="100%" fill="url(#grid)"/>

  <!-- Accent glow behind logo -->
  <ellipse cx="600" cy="260" rx="400" ry="200" fill="url(#glowGradient)"/>

  <!-- Logo (centered) -->
  <image
    href="data:image/png;base64,${logoBase64}"
    x="${(OG_WIDTH - logoWidth) / 2}"
    y="${(OG_HEIGHT - logoHeight) / 2 - 60}"
    width="${logoWidth}"
    height="${logoHeight}"
    style="image-rendering: pixelated;"
  />

  <!-- Tagline -->
  <text
    x="600"
    y="400"
    text-anchor="middle"
    font-family="'NF-Pixels', 'Press Start 2P', monospace"
    font-size="32"
    font-weight="600"
    fill="${COLORS.textSecondary}"
  >Multiplayer Pixel Art Game</text>

  <!-- Feature badges - 3D Pixel Button Style matching website -->
  <g transform="translate(600, 480)">
    <!-- Draw badge (Accent/Cyan) -->
    <g transform="translate(-200, 0)">
      <!-- Button shadow (pixel-style offset) -->
      <rect x="-56" y="-16" width="120" height="40" rx="4" fill="rgba(0, 0, 0, 0.4)"/>
      <!-- Main button background -->
      <rect x="-60" y="-20" width="120" height="40" rx="4" fill="${COLORS.accent}"/>
      <!-- 3D highlight (top/left lighter) -->
      <rect x="-60" y="-20" width="120" height="4" fill="rgba(255, 255, 255, 0.25)"/>
      <rect x="-60" y="-20" width="4" height="40" fill="rgba(255, 255, 255, 0.2)"/>
      <!-- 3D shadow (bottom/right darker) -->
      <rect x="-60" y="16" width="120" height="4" fill="rgba(0, 0, 0, 0.25)"/>
      <rect x="56" y="-20" width="4" height="40" fill="rgba(0, 0, 0, 0.2)"/>
      <text x="0" y="8" text-anchor="middle" font-family="'NF-Pixels', monospace" font-size="20" font-weight="700" fill="#0f0f23">DRAW</text>
    </g>

    <!-- Vote badge (Brand/Orange) -->
    <g transform="translate(0, 0)">
      <rect x="-56" y="-16" width="120" height="40" rx="4" fill="rgba(0, 0, 0, 0.4)"/>
      <rect x="-60" y="-20" width="120" height="40" rx="4" fill="${COLORS.brand}"/>
      <rect x="-60" y="-20" width="120" height="4" fill="rgba(255, 255, 255, 0.25)"/>
      <rect x="-60" y="-20" width="4" height="40" fill="rgba(255, 255, 255, 0.2)"/>
      <rect x="-60" y="16" width="120" height="4" fill="rgba(0, 0, 0, 0.25)"/>
      <rect x="56" y="-20" width="4" height="40" fill="rgba(0, 0, 0, 0.2)"/>
      <text x="0" y="8" text-anchor="middle" font-family="'NF-Pixels', monospace" font-size="20" font-weight="700" fill="#0f0f23">VOTE</text>
    </g>

    <!-- Compete badge (Brand Light/Yellow) -->
    <g transform="translate(200, 0)">
      <rect x="-56" y="-16" width="120" height="40" rx="4" fill="rgba(0, 0, 0, 0.4)"/>
      <rect x="-60" y="-20" width="120" height="40" rx="4" fill="${COLORS.brandLight}"/>
      <rect x="-60" y="-20" width="120" height="4" fill="rgba(255, 255, 255, 0.25)"/>
      <rect x="-60" y="-20" width="4" height="40" fill="rgba(255, 255, 255, 0.2)"/>
      <rect x="-60" y="16" width="120" height="4" fill="rgba(0, 0, 0, 0.25)"/>
      <rect x="56" y="-20" width="4" height="40" fill="rgba(0, 0, 0, 0.2)"/>
      <text x="0" y="8" text-anchor="middle" font-family="'NF-Pixels', monospace" font-size="20" font-weight="700" fill="#0f0f23">WIN</text>
    </g>
  </g>

  <!-- Decorative pixel art corners -->
  <g fill="${COLORS.accent}" opacity="0.3">
    <!-- Top left -->
    <rect x="40" y="40" width="8" height="8"/>
    <rect x="52" y="40" width="8" height="8"/>
    <rect x="40" y="52" width="8" height="8"/>

    <!-- Top right -->
    <rect x="${OG_WIDTH - 48}" y="40" width="8" height="8"/>
    <rect x="${OG_WIDTH - 60}" y="40" width="8" height="8"/>
    <rect x="${OG_WIDTH - 48}" y="52" width="8" height="8"/>

    <!-- Bottom left -->
    <rect x="40" y="${OG_HEIGHT - 48}" width="8" height="8"/>
    <rect x="52" y="${OG_HEIGHT - 48}" width="8" height="8"/>
    <rect x="40" y="${OG_HEIGHT - 60}" width="8" height="8"/>

    <!-- Bottom right -->
    <rect x="${OG_WIDTH - 48}" y="${OG_HEIGHT - 48}" width="8" height="8"/>
    <rect x="${OG_WIDTH - 60}" y="${OG_HEIGHT - 48}" width="8" height="8"/>
    <rect x="${OG_WIDTH - 48}" y="${OG_HEIGHT - 60}" width="8" height="8"/>
  </g>

  <!-- Subtle pixel art decorations -->
  <g fill="${COLORS.brand}" opacity="0.2">
    <rect x="100" y="200" width="4" height="4"/>
    <rect x="100" y="208" width="4" height="4"/>
    <rect x="108" y="204" width="4" height="4"/>

    <rect x="${OG_WIDTH - 104}" y="200" width="4" height="4"/>
    <rect x="${OG_WIDTH - 104}" y="208" width="4" height="4"/>
    <rect x="${OG_WIDTH - 112}" y="204" width="4" height="4"/>
  </g>

  <!-- Website URL at bottom -->
  <text
    x="600"
    y="580"
    text-anchor="middle"
    font-family="'NF-Pixels', monospace"
    font-size="26"
    font-weight="600"
    fill="${COLORS.accent}"
  >spritebox.de</text>
</svg>`;
}

// Cache for generated image
let cachedOgImage: Buffer | null = null;

/**
 * Generate OG image as PNG buffer
 */
export async function generateOgImage(): Promise<Buffer> {
  if (cachedOgImage) {
    return cachedOgImage;
  }

  try {
    // Try to load logo from various possible locations
    const possibleLogoPaths = [
      join(__dirname, 'public', 'logo.png'),           // Production: dist/public/logo.png
      join(__dirname, '..', 'public', 'logo.png'),     // Alternative production path
      join(__dirname, '../../web/static/logo.png'),    // Development: relative to src
      join(__dirname, '../../../web/static/logo.png'), // Alternative dev path
    ];

    let logoBuffer: Buffer | null = null;
    for (const logoPath of possibleLogoPaths) {
      try {
        if (existsSync(logoPath)) {
          logoBuffer = await readFileAsync(logoPath);
          console.log(`📸 Loaded logo from: ${logoPath}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (!logoBuffer) {
      console.warn('⚠️ Logo not found, generating OG image without logo');
      // Generate simple fallback without logo
      const fallbackSvg = `
        <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${COLORS.bgPrimary}"/>
          <text x="600" y="280" text-anchor="middle" font-family="'NF-Pixels', monospace" font-size="72" font-weight="bold" fill="${COLORS.brand}">SpriteBox</text>
          <text x="600" y="360" text-anchor="middle" font-family="'NF-Pixels', monospace" font-size="32" fill="${COLORS.textSecondary}">Multiplayer Pixel Art Game</text>
          <text x="600" y="450" text-anchor="middle" font-family="'NF-Pixels', monospace" font-size="26" font-weight="600" fill="${COLORS.accent}">spritebox.de</text>
        </svg>`;
      cachedOgImage = await sharp(Buffer.from(fallbackSvg)).png().toBuffer();
      return cachedOgImage;
    }

    // Convert logo to base64
    const logoBase64 = logoBuffer.toString('base64');

    // Generate SVG
    const svg = generateOgSvg(logoBase64);

    // Convert SVG to PNG using sharp
    cachedOgImage = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    console.log(`✅ OG image generated: ${cachedOgImage.length} bytes`);
    return cachedOgImage;
  } catch (error) {
    console.error('❌ Failed to generate OG image:', error);
    throw error;
  }
}

/**
 * Pre-generate and save OG image to static folder (for build process)
 */
export async function saveStaticOgImage(outputPath: string): Promise<void> {
  const buffer = await generateOgImage();

  // Ensure directory exists
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  await writeFileAsync(outputPath, buffer);
  console.log(`📁 Saved static OG image to: ${outputPath}`);
}

/**
 * Clear cached OG image (useful for development)
 */
export function clearOgImageCache(): void {
  cachedOgImage = null;
}
