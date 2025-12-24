// apps/web/src/lib/survivor/character-generator.ts
// Template-based character generator with high variance and accessories

// Body part types for template system
type BodyPart =
  | 'hair'
  | 'skin'
  | 'eyes'
  | 'shirt'
  | 'pants'
  | 'shoes'
  | 'weapon'
  | 'shield'
  | 'hat'
  | 'cape'
  | 'empty';

// Color palette indices (hex characters)
const COLOR_GROUPS = {
  // Skin tones - natural human skin colors
  skin: ['F', 'A', '9', 'D', 'B'] as const,

  // Hair colors - natural + fantasy
  hair: ['0', 'A', '8', '9', '2', '3', '1', 'C', '7', '5'] as const,

  // Eye colors
  eyes: ['6', '4', 'A', '0', 'C', '2'] as const,

  // Clothing colors - bright and varied
  shirt: ['2', '4', '6', '8', '9', 'B', 'C', 'D', 'E', '0', '5', '7', '3'] as const,
  pants: ['7', '5', 'A', '0', '6', 'E', '3', '2'] as const,
  shoes: ['0', 'A', '7', 'E', '3', '5'] as const,

  // Accessory colors
  weapon: ['E', '8', 'A', '0', 'D'] as const, // Metallic colors
  shield: ['E', '8', '6', 'A', '2'] as const,
  hat: ['0', 'A', '8', '2', 'C', '4'] as const,
  cape: ['2', 'C', '6', '7', '3', '9'] as const,

  // Background
  empty: ['1'] as const,
} as const;

// Character template defines which body part each pixel belongs to
interface CharacterTemplate {
  name: string;
  pixels: BodyPart[];
  category: 'standard' | 'asymmetric' | 'mini' | 'creature' | 'special';
}

// Helper to create a pixel map from a visual representation
function createTemplate(
  name: string,
  visual: string[],
  category: CharacterTemplate['category'] = 'standard'
): CharacterTemplate {
  const charMap: Record<string, BodyPart> = {
    '.': 'empty',
    H: 'hair',
    K: 'skin', // Kopf/Haut
    E: 'eyes',
    A: 'skin', // Arme (same skin color)
    S: 'shirt',
    P: 'pants',
    F: 'shoes', // Füße
    W: 'weapon',
    D: 'shield', // Defense
    T: 'hat', // Top/Hat
    C: 'cape',
  };

  const pixels: BodyPart[] = [];
  for (const row of visual) {
    for (const char of row) {
      pixels.push(charMap[char] ?? 'empty');
    }
  }

  // Validate template is exactly 64 pixels
  if (pixels.length !== 64) {
    console.warn(`Template "${name}" has ${pixels.length} pixels instead of 64`);
  }

  return { name, pixels, category };
}

// =============================================================================
// STANDARD TEMPLATES (Symmetrical)
// =============================================================================

const TEMPLATE_STANDARD = createTemplate('standard', [
  '..HHHH..', // Row 0
  '.HKKKKH.', // Row 1
  '..KEEK..', // Row 2
  '..KKKK..', // Row 3
  '.ASSSSA.', // Row 4
  '.ASSSSA.', // Row 5
  '..PPPP..', // Row 6
  '..FFFF..', // Row 7
]);

const TEMPLATE_BALD = createTemplate('bald', [
  '........', // Row 0
  '..KKKK..', // Row 1
  '..KEEK..', // Row 2
  '..KKKK..', // Row 3
  '.ASSSSA.', // Row 4
  '.ASSSSA.', // Row 5
  '..PPPP..', // Row 6
  '..FFFF..', // Row 7
]);

const TEMPLATE_MOHAWK = createTemplate('mohawk', [
  '...HH...', // Row 0
  '...HH...', // Row 1
  '..KEEK..', // Row 2
  '..KKKK..', // Row 3
  '.ASSSSA.', // Row 4
  '.ASSSSA.', // Row 5
  '..PPPP..', // Row 6
  '..FFFF..', // Row 7
]);

// =============================================================================
// ASYMMETRIC TEMPLATES (Seitenscheitel, etc.)
// =============================================================================

const TEMPLATE_SIDE_PART_LEFT = createTemplate(
  'sidePartLeft',
  [
    '.HHHHH..', // Row 0: Hair sweeps left
    'HHKKKKH.', // Row 1: Long hair on left
    '..KEEK..', // Row 2
    '..KKKK..', // Row 3
    '.ASSSSA.', // Row 4
    '.ASSSSA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'asymmetric'
);

const TEMPLATE_SIDE_PART_RIGHT = createTemplate(
  'sidePartRight',
  [
    '..HHHHH.', // Row 0: Hair sweeps right
    '.HKKKKH.', // Row 1
    '..KEEK..', // Row 2
    '..KKKK..', // Row 3
    '.ASSSSA.', // Row 4
    '.ASSSSA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'asymmetric'
);

const TEMPLATE_LONG_HAIR_LEFT = createTemplate(
  'longHairLeft',
  [
    '.HHHH...', // Row 0
    'HHKKKK..', // Row 1
    'H.KEEK..', // Row 2
    'H.KKKK..', // Row 3
    'HASSSSA.', // Row 4: Hair flows down
    '.ASSSSA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'asymmetric'
);

const TEMPLATE_PONYTAIL = createTemplate(
  'ponytail',
  [
    '..HHHH..', // Row 0
    '.HKKKKH.', // Row 1
    '..KEEKH.', // Row 2: Ponytail starts
    '..KKKKH.', // Row 3
    '.ASSSSAH', // Row 4: Ponytail continues
    '.ASSSSA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'asymmetric'
);

// =============================================================================
// WEAPON TEMPLATES (Holding items)
// =============================================================================

const TEMPLATE_SWORD_RIGHT = createTemplate(
  'swordRight',
  [
    '..HHHH.W', // Row 0: Sword tip
    '.HKKKKW.', // Row 1
    '..KEEKW.', // Row 2: Sword blade
    '..KKKKW.', // Row 3
    '.ASSSSAW', // Row 4: Holding sword
    '.ASSSSA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'asymmetric'
);

const TEMPLATE_SWORD_LEFT = createTemplate(
  'swordLeft',
  [
    'W.HHHH..', // Row 0
    '.WKKKK..', // Row 1
    '.WKEEK..', // Row 2
    '.WKKKK..', // Row 3
    'WASSSSS.', // Row 4
    '.ASSSSA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'asymmetric'
);

const TEMPLATE_SHIELD_LEFT = createTemplate(
  'shieldLeft',
  [
    '..HHHH..', // Row 0
    '.HKKKK..', // Row 1
    'DDKEEK..', // Row 2: Shield
    'DDKKKK..', // Row 3
    'DDSSSSA.', // Row 4
    '.ASSSSA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'asymmetric'
);

const TEMPLATE_SWORD_AND_SHIELD = createTemplate(
  'swordAndShield',
  [
    '..HHHH.W', // Row 0
    '.HKKKKW.', // Row 1
    'DDKEEKW.', // Row 2
    'DDKKKKW.', // Row 3
    'DDSSSSAW', // Row 4
    '.ASSSSA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'asymmetric'
);

const TEMPLATE_STAFF = createTemplate(
  'staff',
  [
    'W.HHHH..', // Row 0: Staff top (magic orb)
    'W.KKKK..', // Row 1
    'W.KEEK..', // Row 2
    'W.KKKK..', // Row 3
    'WASSSSS.', // Row 4
    'W.SSSSA.', // Row 5: Staff continues
    'W.PPPP..', // Row 6
    'W.FFFF..', // Row 7
  ],
  'asymmetric'
);

// =============================================================================
// HAT/HELMET TEMPLATES
// =============================================================================

const TEMPLATE_WIZARD_HAT = createTemplate(
  'wizardHat',
  [
    '...T....', // Row 0: Pointy hat
    '..TTT...', // Row 1
    '.TKKKT..', // Row 2
    '..KEEK..', // Row 3
    '..KKKK..', // Row 4
    '.ASSSSA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'special'
);

const TEMPLATE_CROWN = createTemplate(
  'crown',
  [
    '.T.T.T..', // Row 0: Crown spikes
    '.TTTTT..', // Row 1
    '..KKKK..', // Row 2
    '..KEEK..', // Row 3
    '..KKKK..', // Row 4
    '.ASSSSA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'special'
);

const TEMPLATE_HELMET = createTemplate(
  'helmet',
  [
    '.TTTTTT.', // Row 0
    '.TKKEKT.', // Row 1
    '.TKKEKT.', // Row 2
    '..KKKK..', // Row 3
    '.ASSSSA.', // Row 4
    '.ASSSSA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'special'
);

// =============================================================================
// CAPE TEMPLATES
// =============================================================================

const TEMPLATE_CAPE = createTemplate(
  'cape',
  [
    '..HHHH..', // Row 0
    '.HKKKKH.', // Row 1
    'C.KEEK.C', // Row 2: Cape starts
    'C.KKKK.C', // Row 3
    'CASSSAC.', // Row 4
    'CASSSSAC', // Row 5
    'C.PPPP.C', // Row 6
    '..FFFF..', // Row 7
  ],
  'special'
);

// =============================================================================
// BODY VARIATION TEMPLATES
// =============================================================================

const TEMPLATE_WIDE = createTemplate(
  'wide',
  [
    '..HHHH..', // Row 0
    '.HKKKKH.', // Row 1
    '..KEEK..', // Row 2
    '..KKKK..', // Row 3
    'ASSSSSSA', // Row 4: Extra wide
    'ASSSSSSA', // Row 5
    '.PPPPPP.', // Row 6
    '.FFFFFF.', // Row 7
  ],
  'standard'
);

const TEMPLATE_SLIM = createTemplate(
  'slim',
  [
    '...HH...', // Row 0
    '...KK...', // Row 1
    '..KEEK..', // Row 2
    '...KK...', // Row 3
    '..ASSS..', // Row 4
    '..ASSS..', // Row 5
    '...PP...', // Row 6
    '...FF...', // Row 7
  ],
  'standard'
);

const TEMPLATE_TALL = createTemplate(
  'tall',
  [
    '...HH...', // Row 0
    '..HKKH..', // Row 1
    '..KEEK..', // Row 2
    '..SSSS..', // Row 3: Body starts higher
    '.ASSSSA.', // Row 4
    '..PPPP..', // Row 5
    '..PPPP..', // Row 6: Longer legs
    '..FFFF..', // Row 7
  ],
  'standard'
);

// =============================================================================
// MINI TEMPLATES (Small characters)
// =============================================================================

const TEMPLATE_MINI = createTemplate(
  'mini',
  [
    '........', // Row 0
    '........', // Row 1
    '...HH...', // Row 2
    '..KEEK..', // Row 3
    '..ASSS..', // Row 4
    '...PP...', // Row 5
    '...FF...', // Row 6
    '........', // Row 7
  ],
  'mini'
);

const TEMPLATE_TINY = createTemplate(
  'tiny',
  [
    '........', // Row 0
    '........', // Row 1
    '........', // Row 2
    '...HH...', // Row 3
    '..KEKK..', // Row 4: Head + eye
    '..ASSS..', // Row 5
    '...FF...', // Row 6
    '........', // Row 7
  ],
  'mini'
);

const TEMPLATE_CHIBI = createTemplate(
  'chibi',
  [
    '.HHHHHH.', // Row 0: Big head
    '.HKKKKH.', // Row 1
    '.HKEEKH.', // Row 2
    '.HKKKKH.', // Row 3
    '..SSSS..', // Row 4: Tiny body
    '..PPPP..', // Row 5
    '...FF...', // Row 6
    '........', // Row 7
  ],
  'mini'
);

// =============================================================================
// CREATURE TEMPLATES (Non-humanoid)
// =============================================================================

const TEMPLATE_GHOST = createTemplate(
  'ghost',
  [
    '..HHHH..', // Row 0
    '.HKKKKH.', // Row 1
    '.HKEEKH.', // Row 2
    '.HKKKKH.', // Row 3
    '.HHHHHH.', // Row 4: Ghost body (all "hair" color = translucent)
    '.H.HH.H.', // Row 5: Wavy bottom
    '..H..H..', // Row 6
    '........', // Row 7
  ],
  'creature'
);

const TEMPLATE_SLIME = createTemplate(
  'slime',
  [
    '........', // Row 0
    '..SSSS..', // Row 1: Slime top
    '.SSSSSS.', // Row 2
    '.SSEESS.', // Row 3: Eyes
    '.SSSSSS.', // Row 4
    'SSSSSSSS', // Row 5
    '.SSSSSS.', // Row 6
    '........', // Row 7
  ],
  'creature'
);

const TEMPLATE_CYCLOPS = createTemplate(
  'cyclops',
  [
    '..HHHH..', // Row 0
    '.HKKKKH.', // Row 1
    '..KEEK..', // Row 2: One big eye (E spans 2 pixels)
    '..KKKK..', // Row 3
    '.ASSSSA.', // Row 4
    '.ASSSSA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'creature'
);

// =============================================================================
// MISSING LIMB TEMPLATES
// =============================================================================

const TEMPLATE_ONE_ARM_LEFT = createTemplate(
  'oneArmLeft',
  [
    '..HHHH..', // Row 0
    '.HKKKKH.', // Row 1
    '..KEEK..', // Row 2
    '..KKKK..', // Row 3
    '.ASSSS..', // Row 4: Only left arm
    '.ASSSS..', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'asymmetric'
);

const TEMPLATE_ONE_ARM_RIGHT = createTemplate(
  'oneArmRight',
  [
    '..HHHH..', // Row 0
    '.HKKKKH.', // Row 1
    '..KEEK..', // Row 2
    '..KKKK..', // Row 3
    '..SSSAA.', // Row 4: Only right arm
    '..SSSAA.', // Row 5
    '..PPPP..', // Row 6
    '..FFFF..', // Row 7
  ],
  'asymmetric'
);

const TEMPLATE_PEG_LEG = createTemplate(
  'pegLeg',
  [
    '..HHHH..', // Row 0
    '.HKKKKH.', // Row 1
    '..KEEK..', // Row 2
    '..KKKK..', // Row 3
    '.ASSSSA.', // Row 4
    '.ASSSSA.', // Row 5
    '..PPP...', // Row 6: One short leg
    '..FFF...', // Row 7: Peg leg
  ],
  'asymmetric'
);

// =============================================================================
// ALL TEMPLATES
// =============================================================================

const TEMPLATES: CharacterTemplate[] = [
  // Standard (10%)
  TEMPLATE_STANDARD,
  TEMPLATE_BALD,
  TEMPLATE_MOHAWK,
  TEMPLATE_WIDE,
  TEMPLATE_SLIM,
  TEMPLATE_TALL,

  // Asymmetric hair (15%)
  TEMPLATE_SIDE_PART_LEFT,
  TEMPLATE_SIDE_PART_RIGHT,
  TEMPLATE_LONG_HAIR_LEFT,
  TEMPLATE_PONYTAIL,

  // Weapons (20%)
  TEMPLATE_SWORD_RIGHT,
  TEMPLATE_SWORD_LEFT,
  TEMPLATE_SHIELD_LEFT,
  TEMPLATE_SWORD_AND_SHIELD,
  TEMPLATE_STAFF,

  // Hats/Special (15%)
  TEMPLATE_WIZARD_HAT,
  TEMPLATE_CROWN,
  TEMPLATE_HELMET,
  TEMPLATE_CAPE,

  // Mini (15%)
  TEMPLATE_MINI,
  TEMPLATE_TINY,
  TEMPLATE_CHIBI,

  // Creatures (10%)
  TEMPLATE_GHOST,
  TEMPLATE_SLIME,
  TEMPLATE_CYCLOPS,

  // Missing limbs (15%)
  TEMPLATE_ONE_ARM_LEFT,
  TEMPLATE_ONE_ARM_RIGHT,
  TEMPLATE_PEG_LEG,
];

// =============================================================================
// RANDOM UTILITIES
// =============================================================================

function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  return array[0] % max;
}

function pickRandom<T>(array: readonly T[]): T {
  return array[secureRandomInt(array.length)];
}

function chance(percent: number): boolean {
  return secureRandomInt(100) < percent;
}

// =============================================================================
// COLOR SCHEME GENERATION
// =============================================================================

interface ColorScheme {
  skin: string;
  hair: string;
  eyes: string;
  shirt: string;
  pants: string;
  shoes: string;
  weapon: string;
  shield: string;
  hat: string;
  cape: string;
}

function generateColorScheme(): ColorScheme {
  return {
    skin: pickRandom(COLOR_GROUPS.skin),
    hair: pickRandom(COLOR_GROUPS.hair),
    eyes: pickRandom(COLOR_GROUPS.eyes),
    shirt: pickRandom(COLOR_GROUPS.shirt),
    pants: pickRandom(COLOR_GROUPS.pants),
    shoes: pickRandom(COLOR_GROUPS.shoes),
    weapon: pickRandom(COLOR_GROUPS.weapon),
    shield: pickRandom(COLOR_GROUPS.shield),
    hat: pickRandom(COLOR_GROUPS.hat),
    cape: pickRandom(COLOR_GROUPS.cape),
  };
}

// =============================================================================
// MUTATION SYSTEM (Small random variations)
// =============================================================================

interface MutationConfig {
  pixelIndex: number;
  newPart: BodyPart;
}

function generateMutations(template: CharacterTemplate): MutationConfig[] {
  const mutations: MutationConfig[] = [];

  // 30% chance for each mutation type
  // Add random hair pixel
  if (chance(30)) {
    const hairPositions = [0, 1, 6, 7, 8, 15]; // Top corners
    const pos = pickRandom(hairPositions);
    if (template.pixels[pos] === 'empty') {
      mutations.push({ pixelIndex: pos, newPart: 'hair' });
    }
  }

  // 20% chance to remove a shoe pixel (one leg shorter)
  if (chance(20)) {
    const shoePositions = [56, 57, 62, 63]; // Bottom row corners
    const pos = pickRandom(shoePositions);
    if (template.pixels[pos] === 'shoes') {
      mutations.push({ pixelIndex: pos, newPart: 'empty' });
    }
  }

  // 15% chance to add a random accessory pixel
  if (chance(15)) {
    const accessoryPositions = [0, 7, 56, 63]; // Corners
    const pos = pickRandom(accessoryPositions);
    if (template.pixels[pos] === 'empty') {
      const accessory = pickRandom(['weapon', 'cape', 'hat'] as const);
      mutations.push({ pixelIndex: pos, newPart: accessory });
    }
  }

  // 10% chance to add asymmetric detail
  if (chance(10)) {
    // Add random shirt pixel on one side
    const sidePositions = [32, 39, 40, 47]; // Side edges middle rows
    const pos = pickRandom(sidePositions);
    if (template.pixels[pos] === 'empty') {
      mutations.push({ pixelIndex: pos, newPart: 'shirt' });
    }
  }

  return mutations;
}

function applyMutations(pixels: string[], mutations: MutationConfig[], colors: ColorScheme): void {
  for (const mutation of mutations) {
    const color = getColorForPart(mutation.newPart, colors);
    pixels[mutation.pixelIndex] = color;
  }
}

function getColorForPart(part: BodyPart, colors: ColorScheme): string {
  switch (part) {
    case 'hair':
      return colors.hair;
    case 'skin':
      return colors.skin;
    case 'eyes':
      return colors.eyes;
    case 'shirt':
      return colors.shirt;
    case 'pants':
      return colors.pants;
    case 'shoes':
      return colors.shoes;
    case 'weapon':
      return colors.weapon;
    case 'shield':
      return colors.shield;
    case 'hat':
      return colors.hat;
    case 'cape':
      return colors.cape;
    case 'empty':
    default:
      return '1';
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Generates a random character pixel string (64 hex characters)
 * Uses template-based generation with mutations for high variance
 */
export function generateRandomCharacter(): string {
  // Pick a random template
  const template = pickRandom(TEMPLATES);

  // Generate a coherent color scheme
  const colors = generateColorScheme();

  // Build base pixel array
  const pixelArray: string[] = [];
  for (let i = 0; i < 64; i++) {
    const bodyPart = template.pixels[i] ?? 'empty';
    pixelArray.push(getColorForPart(bodyPart, colors));
  }

  // Apply random mutations for extra variance
  const mutations = generateMutations(template);
  applyMutations(pixelArray, mutations, colors);

  return pixelArray.join('');
}

/**
 * Generates a character with a specific template
 */
export function generateCharacterWithTemplate(templateName: string): string {
  const template = TEMPLATES.find((t) => t.name === templateName) ?? pickRandom(TEMPLATES);
  const colors = generateColorScheme();

  const pixelArray: string[] = [];
  for (let i = 0; i < 64; i++) {
    const bodyPart = template.pixels[i] ?? 'empty';
    pixelArray.push(getColorForPart(bodyPart, colors));
  }

  return pixelArray.join('');
}

/**
 * Generates a character from a specific category
 */
export function generateCharacterByCategory(
  category: CharacterTemplate['category']
): string {
  const categoryTemplates = TEMPLATES.filter((t) => t.category === category);
  if (categoryTemplates.length === 0) {
    return generateRandomCharacter();
  }

  const template = pickRandom(categoryTemplates);
  const colors = generateColorScheme();

  const pixelArray: string[] = [];
  for (let i = 0; i < 64; i++) {
    const bodyPart = template.pixels[i] ?? 'empty';
    pixelArray.push(getColorForPart(bodyPart, colors));
  }

  // Apply mutations
  const mutations = generateMutations(template);
  applyMutations(pixelArray, mutations, colors);

  return pixelArray.join('');
}

// Export template names and categories for external use
export const TEMPLATE_NAMES = TEMPLATES.map((t) => t.name);
export const TEMPLATE_CATEGORIES = ['standard', 'asymmetric', 'mini', 'creature', 'special'] as const;
