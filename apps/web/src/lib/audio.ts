/**
 * Audio System for SpriteBox
 *
 * Uses Web Audio API for high-performance, non-blocking audio playback.
 * - Sounds are preloaded as AudioBuffers (stored in memory)
 * - Unlimited concurrent playback (no pooling needed)
 * - Zero latency, no main thread blocking
 * - Mobile-friendly: Handles iOS/Safari autoplay restrictions
 */

// Sound definitions - add new sounds here
export const SOUNDS = {
  pixelPlace: '/audio/plop.mp3',
  click: '/audio/click.mp3',
  attack: '/audio/attack.mp3',
  zombieInfected: '/audio/zombie-infected.mp3',
} as const;

export type SoundName = keyof typeof SOUNDS;

// Default volume levels (0-1)
const DEFAULT_VOLUMES: Record<SoundName, number> = {
  pixelPlace: 0.1,
  click: 0.2,
  attack: 0.4,
  zombieInfected: 0.5,
};

// Web Audio API context and buffers
let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
const audioBuffers: Map<SoundName, AudioBuffer> = new Map();
let isInitialized = false;
let isUnlocked = false;

// Global volume multiplier
let globalVolume = 1.0;

/**
 * Initialize Web Audio API context
 * Must be called after user interaction (browser autoplay policy)
 */
function initAudioContext(): void {
  if (audioContext) return;

  try {
    audioContext = new AudioContext();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = globalVolume;
  } catch {
    console.warn('Web Audio API not supported');
  }
}

/**
 * Resume audio context if suspended (required after user interaction)
 * Returns true if context is ready for playback
 */
async function resumeAudioContext(): Promise<boolean> {
  if (!audioContext) return false;

  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch {
      console.warn('Failed to resume AudioContext');
      return false;
    }
  }

  return audioContext.state === 'running';
}

/**
 * Unlock audio on mobile browsers (iOS/Safari)
 * Must be called from a user gesture (touch/click) event handler
 * Call this early (e.g., on first touch anywhere in the app)
 */
export async function unlockAudio(): Promise<void> {
  if (isUnlocked) return;

  // Initialize context if needed
  initAudioContext();

  if (!audioContext) return;

  // Resume the context
  const isReady = await resumeAudioContext();

  if (isReady) {
    isUnlocked = true;

    // On iOS, we need to play a silent sound to fully unlock
    // Create and play a silent buffer
    try {
      const silentBuffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(audioContext.destination);
      source.start(0);

      // Preload sounds after unlocking
      await preloadSounds();
    } catch {
      // Silent buffer creation failed, but context may still work
    }
  }
}

/**
 * Load and decode an audio file into an AudioBuffer
 */
async function loadSound(soundName: SoundName): Promise<void> {
  if (!audioContext || audioBuffers.has(soundName)) return;

  try {
    const response = await fetch(SOUNDS[soundName]);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBuffers.set(soundName, audioBuffer);
  } catch (error) {
    console.warn(`Failed to load sound: ${soundName}`, error);
  }
}

/**
 * Play a sound with optional volume override
 *
 * @param soundName - The name of the sound to play
 * @param volumeOverride - Optional volume (0-1) to override default
 */
export function playSound(soundName: SoundName, volumeOverride?: number): void {
  // Audio must be unlocked first via user interaction
  if (!isUnlocked || !audioContext || !gainNode) {
    // Try lazy init, but sound won't play until unlocked
    if (!audioContext) {
      initAudioContext();
    }
    return;
  }

  // Ensure context is running (may have been suspended by browser)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {
      // Ignore resume errors - just skip this sound
    });
    return;
  }

  const buffer = audioBuffers.get(soundName);
  if (!buffer) {
    // Sound not loaded yet, load it now and play when ready
    loadSound(soundName).then(() => {
      playSound(soundName, volumeOverride);
    });
    return;
  }

  // Create a new buffer source for each play (they're one-shot)
  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  // Create individual gain node for this sound's volume
  const soundGain = audioContext.createGain();
  const baseVolume = volumeOverride ?? DEFAULT_VOLUMES[soundName] ?? 0.5;
  soundGain.gain.value = baseVolume;

  // Connect: source -> soundGain -> masterGain -> destination
  source.connect(soundGain);
  soundGain.connect(gainNode);

  // Play immediately
  source.start(0);
}

/**
 * Set global volume multiplier
 *
 * @param volume - Volume multiplier (0-1)
 */
export function setGlobalVolume(volume: number): void {
  globalVolume = Math.min(1, Math.max(0, volume));
  if (gainNode) {
    gainNode.gain.value = globalVolume;
  }
}

/**
 * Get current global volume
 */
export function getGlobalVolume(): number {
  return globalVolume;
}

/**
 * Preload all sounds for instant playback
 * Call this on app initialization
 */
export async function preloadSounds(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  initAudioContext();

  if (!audioContext) return;

  // Load all sounds in parallel
  const loadPromises = (Object.keys(SOUNDS) as SoundName[]).map(loadSound);
  await Promise.all(loadPromises);
}
