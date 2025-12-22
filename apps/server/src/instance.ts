// apps/server/src/instance.ts
import type { Server } from 'socket.io';
import type { Instance, Player, InstanceType } from './types.js';
import { generateId, generateRoomCode, log } from './utils.js';
import { MAX_PLAYERS_PER_INSTANCE, MIN_PLAYERS_TO_START, TIMERS } from './constants.js';
import { startGame as startGamePhase } from './phases.js';

// Globale Instanz-Verwaltung
const instances = new Map<string, Instance>();
const privateRooms = new Map<string, Instance>(); // code -> instance

// Socket.io Instanz für Broadcasting
let ioInstance: Server | null = null;

/**
 * Setzt die Socket.io Server-Instanz für Broadcasting
 */
export function setIoInstance(io: Server): void {
  ioInstance = io;
}

/**
 * Erstellt eine neue Instanz
 */
export function createInstance(options: {
  type: InstanceType;
  hostId?: string;
  code?: string;
}): Instance {
  const instance: Instance = {
    id: generateId(),
    type: options.type,
    code: options.code,
    hostId: options.hostId,
    phase: 'lobby',
    players: new Map(),
    spectators: new Map(),
    submissions: [],
    votes: [],
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  instances.set(instance.id, instance);

  if (options.type === 'private' && options.code) {
    privateRooms.set(options.code, instance);
  }

  log('Instance', `Created ${options.type} instance: ${instance.id}`);
  return instance;
}

/**
 * Findet eine offene öffentliche Instanz oder erstellt eine neue
 */
export function findOrCreatePublicInstance(): Instance {
  // Suche offene Instanz (Lobby-Phase, nicht voll)
  for (const instance of instances.values()) {
    if (
      instance.type === 'public' &&
      instance.phase === 'lobby' &&
      instance.players.size < MAX_PLAYERS_PER_INSTANCE
    ) {
      return instance;
    }
  }

  // Keine passende gefunden -> neue erstellen
  return createInstance({ type: 'public' });
}

/**
 * Erstellt einen privaten Raum
 */
export function createPrivateRoom(hostPlayer: Player): { code: string; instance: Instance } {
  const code = generateUniqueRoomCode();
  const instance = createInstance({
    type: 'private',
    hostId: hostPlayer.id,
    code,
  });

  return { code, instance };
}

/**
 * Generiert einen eindeutigen Raum-Code
 */
function generateUniqueRoomCode(): string {
  let code: string;
  let attempts = 0;

  do {
    code = generateRoomCode();
    attempts++;
  } while (privateRooms.has(code) && attempts < 100);

  if (attempts >= 100) {
    throw new Error('Could not generate unique room code');
  }

  return code;
}

/**
 * Findet einen privaten Raum anhand des Codes
 */
export function findPrivateRoom(code: string): Instance | undefined {
  return privateRooms.get(code.toUpperCase());
}

/**
 * Findet eine Instanz anhand der ID
 */
export function findInstance(instanceId: string): Instance | undefined {
  return instances.get(instanceId);
}

/**
 * Fügt einen Spieler zu einer Instanz hinzu
 */
export function addPlayerToInstance(instance: Instance, player: Player): {
  success: boolean;
  spectator: boolean;
  error?: string;
} {
  // Instanz voll?
  if (instance.players.size >= MAX_PLAYERS_PER_INSTANCE) {
    return { success: false, spectator: false, error: 'Instance is full' };
  }

  // Spiel läuft bereits?
  if (instance.phase !== 'lobby') {
    // Als Spectator hinzufügen
    instance.spectators.set(player.id, player);
    log('Instance', `Player ${player.id} joined as spectator`);
    return { success: true, spectator: true };
  }

  // Als aktiver Spieler hinzufügen
  instance.players.set(player.id, player);
  instance.lastActivity = Date.now();

  log('Instance', `Player ${player.id} joined instance ${instance.id}`);

  // Lobby-Timer-Logik prüfen
  checkLobbyTimer(instance);

  return { success: true, spectator: false };
}

/**
 * Entfernt einen Spieler aus einer Instanz
 */
export function removePlayerFromInstance(instance: Instance, playerId: string): void {
  instance.players.delete(playerId);
  instance.spectators.delete(playerId);
  instance.lastActivity = Date.now();

  log('Instance', `Player ${playerId} left instance ${instance.id}`);

  // Prüfen ob Instanz noch valide
  checkInstanceCleanup(instance);
}

/**
 * Prüft und startet den Lobby-Timer
 */
function checkLobbyTimer(instance: Instance): void {
  if (instance.phase !== 'lobby') return;

  const playerCount = instance.players.size;

  // Sofort starten wenn voll
  if (playerCount >= MAX_PLAYERS_PER_INSTANCE) {
    clearTimeout(instance.lobbyTimer);
    startGame(instance);
    return;
  }

  // Timer starten wenn Minimum erreicht
  if (playerCount >= MIN_PLAYERS_TO_START && !instance.lobbyTimer) {
    log('Instance', `Lobby timer started for instance ${instance.id}`);

    instance.lobbyTimer = setTimeout(() => {
      instance.lobbyTimer = undefined; // Clear reference after execution
      if (instance.players.size >= MIN_PLAYERS_TO_START) {
        startGame(instance);
      }
    }, TIMERS.LOBBY_TIMEOUT);

    // Event an alle Spieler senden
    emitToInstance(instance, 'lobby-timer-started', {
      duration: TIMERS.LOBBY_TIMEOUT,
      startsAt: Date.now() + TIMERS.LOBBY_TIMEOUT,
    });
  }
}

/**
 * Startet das Spiel (delegiert an phases.ts)
 */
function startGame(instance: Instance): void {
  startGamePhase(instance);
}

/**
 * Startet das Spiel manuell (für Host in privaten Räumen)
 */
export function startGameManually(instance: Instance): { success: boolean; error?: string } {
  if (instance.phase !== 'lobby') {
    return { success: false, error: 'Game already in progress' };
  }

  if (instance.players.size < MIN_PLAYERS_TO_START) {
    return { success: false, error: `Need at least ${MIN_PLAYERS_TO_START} players` };
  }

  startGame(instance);
  return { success: true };
}

/**
 * Prüft ob eine Instanz aufgeräumt werden sollte
 */
function checkInstanceCleanup(instance: Instance): void {
  // Leere Instanz in Lobby -> sofort löschen
  if (instance.phase === 'lobby' && instance.players.size === 0) {
    cleanupInstance(instance);
  }
}

/**
 * Räumt eine Instanz auf
 */
export function cleanupInstance(instance: Instance): void {
  clearTimeout(instance.lobbyTimer);
  clearTimeout(instance.phaseTimer);

  instances.delete(instance.id);

  if (instance.code) {
    privateRooms.delete(instance.code);
  }

  log('Instance', `Cleaned up instance ${instance.id}`);
}

/**
 * Sendet ein Event an alle Spieler einer Instanz
 */
function emitToInstance(instance: Instance, event: string, data: unknown): void {
  if (ioInstance) {
    ioInstance.to(instance.id).emit(event, data);
  }
}

/**
 * Gibt alle Spieler einer Instanz als Array zurück
 */
export function getInstancePlayers(instance: Instance): Player[] {
  return Array.from(instance.players.values());
}

/**
 * Gibt Statistiken über alle Instanzen zurück
 */
export function getInstanceStats(): {
  total: number;
  public: number;
  private: number;
  totalPlayers: number;
} {
  let publicCount = 0;
  let privateCount = 0;
  let totalPlayers = 0;

  for (const instance of instances.values()) {
    if (instance.type === 'public') publicCount++;
    else privateCount++;
    totalPlayers += instance.players.size + instance.spectators.size;
  }

  return {
    total: instances.size,
    public: publicCount,
    private: privateCount,
    totalPlayers,
  };
}
