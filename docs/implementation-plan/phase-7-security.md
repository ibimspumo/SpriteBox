# Phase 7: Sicherheit

**Ziel:** Input-Validation härten, Rate-Limiting implementieren, Anti-Cheat-Maßnahmen, DoS-Schutz.

**Voraussetzungen:**
- Phase 6 abgeschlossen
- Kompletter Spielablauf funktioniert
- Frontend und Backend kommunizieren korrekt

---

## Aufgaben

### 7.1 Zod-Schemas erweitern

- [ ] 🔧 Alle Inputs abdecken
- [ ] 🔧 Strikte Validierung

**In `validation.ts` erweitern:**

```typescript
// apps/server/src/validation.ts
import { z } from 'zod';
import { CANVAS } from './constants.js';

// === Pixel Validation ===
export const PixelSchema = z.object({
  pixels: z
    .string()
    .length(CANVAS.TOTAL_PIXELS, `Must be exactly ${CANVAS.TOTAL_PIXELS} characters`)
    .regex(/^[0-9A-Fa-f]+$/, 'Only hex characters allowed')
    .transform((s) => s.toUpperCase()),
});

// === Room Code ===
export const RoomCodeSchema = z.object({
  code: z
    .string()
    .length(4, 'Must be exactly 4 characters')
    .regex(/^[A-Z0-9]+$/i, 'Only letters and numbers')
    .transform((s) => s.toUpperCase()),
});

// === Username ===
const FORBIDDEN_NAMES = ['admin', 'moderator', 'system', 'null', 'undefined', 'bot'];
const XSS_PATTERNS = [/<script/i, /javascript:/i, /on\w+=/i, /<iframe/i];

export const UsernameSchema = z.object({
  name: z
    .string()
    .min(1, 'Cannot be empty')
    .max(20, 'Max 20 characters')
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'Cannot be empty after trim')
    .refine(
      (s) => !FORBIDDEN_NAMES.includes(s.toLowerCase()),
      'This name is not allowed'
    )
    .refine(
      (s) => !XSS_PATTERNS.some((p) => p.test(s)),
      'Invalid characters'
    )
    // HTML entities escapen
    .transform((s) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
    ),
});

// === Vote ===
export const VoteSchema = z.object({
  chosenId: z.string().min(1, 'Must choose an image').max(50),
});

// === Finale Vote ===
export const FinaleVoteSchema = z.object({
  playerId: z.string().min(1).max(50),
});

// === Stats Sync ===
export const StatsSchema = z.object({
  gamesPlayed: z.number().int().min(0).max(1_000_000),
  placements: z.object({
    1: z.number().int().min(0).max(100_000),
    2: z.number().int().min(0).max(100_000),
    3: z.number().int().min(0).max(100_000),
  }),
});

// === Pixel Content Validation ===
export function validateMinPixels(pixels: string): { valid: boolean; setPixels: number } {
  let setPixels = 0;
  for (const char of pixels) {
    if (char !== CANVAS.BACKGROUND_COLOR) {
      setPixels++;
    }
  }
  return {
    valid: setPixels >= CANVAS.MIN_PIXELS_SET,
    setPixels,
  };
}

// === Generic Validator ===
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const error = result.error.errors[0]?.message || 'Validation failed';
  return { success: false, error };
}
```

---

### 7.2 Rate-Limiter implementieren

- [ ] 📁 `apps/server/src/rateLimit.ts` erstellen

**Datei:**

```typescript
// apps/server/src/rateLimit.ts
import type { Socket } from 'socket.io';
import { RATE_LIMITS } from './constants.js';
import { log } from './utils.js';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitRecord {
  requests: number[];
  blockedUntil: number;
}

class RateLimiter {
  private records = new Map<string, RateLimitRecord>();

  /**
   * Prüft ob ein Request erlaubt ist
   */
  check(identifier: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const key = identifier;

    let record = this.records.get(key);

    // Geblockt?
    if (record && record.blockedUntil > now) {
      return false;
    }

    // Neuer Record oder Reset
    if (!record || record.blockedUntil > 0) {
      record = { requests: [], blockedUntil: 0 };
      this.records.set(key, record);
    }

    // Alte Requests entfernen
    record.requests = record.requests.filter((t) => now - t < config.windowMs);

    // Limit erreicht?
    if (record.requests.length >= config.maxRequests) {
      // Block für 3x Window-Zeit
      record.blockedUntil = now + config.windowMs * 3;
      log('RateLimit', `Blocked: ${key}`);
      return false;
    }

    // Request tracken
    record.requests.push(now);
    return true;
  }

  /**
   * Cleanup alte Einträge (alle 5 Minuten aufrufen)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 Minuten

    for (const [key, record] of this.records) {
      const oldestRequest = Math.min(...record.requests, now);
      if (now - oldestRequest > maxAge && record.blockedUntil < now) {
        this.records.delete(key);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// Cleanup alle 5 Minuten
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

/**
 * Rate-Limit Middleware für Socket-Events
 */
export function checkRateLimit(socket: Socket, event: string): boolean {
  const config = (RATE_LIMITS as Record<string, RateLimitConfig>)[event.toUpperCase().replace(/-/g, '_')] || RATE_LIMITS.GLOBAL;
  const identifier = `${socket.id}:${event}`;

  if (!rateLimiter.check(identifier, config)) {
    socket.emit('error', {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down.',
      retryAfter: config.windowMs,
    });
    return false;
  }

  return true;
}

/**
 * IP-basiertes Rate-Limiting für Verbindungen
 */
const connectionAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkConnectionRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000; // 1 Minute
  const maxAttempts = 10;

  let record = connectionAttempts.get(ip);

  if (!record || record.resetAt < now) {
    record = { count: 0, resetAt: now + windowMs };
    connectionAttempts.set(ip, record);
  }

  record.count++;

  if (record.count > maxAttempts) {
    log('RateLimit', `Connection blocked for IP: ${ip}`);
    return false;
  }

  return true;
}
```

---

### 7.3 DoS-Schutz in Socket-Handler

- [ ] 🔧 `socket.ts` absichern

**In `socket.ts` erweitern:**

```typescript
// Imports hinzufügen
import { checkRateLimit, checkConnectionRateLimit } from './rateLimit.js';
import { DOS } from './constants.js';

// Verbindungs-Tracking
const connectionsPerIP = new Map<string, Set<string>>();
let totalConnections = 0;

// In setupSocketHandlers:
export function setupSocketHandlers(io: Server): void {
  setIoInstance(io);

  // Middleware: Verbindungslimits prüfen
  io.use((socket, next) => {
    const ip = getClientIP(socket);

    // IP Rate-Limit
    if (!checkConnectionRateLimit(ip)) {
      return next(new Error('TOO_MANY_CONNECTIONS'));
    }

    // Globales Limit
    if (totalConnections >= DOS.MAX_TOTAL_CONNECTIONS) {
      return next(new Error('SERVER_FULL'));
    }

    // Per-IP Limit
    const ipConns = connectionsPerIP.get(ip) || new Set();
    if (ipConns.size >= DOS.MAX_CONNECTIONS_PER_IP) {
      return next(new Error('TOO_MANY_CONNECTIONS'));
    }

    // Tracken
    ipConns.add(socket.id);
    connectionsPerIP.set(ip, ipConns);
    totalConnections++;

    socket.data.ip = ip;
    next();
  });

  io.on('connection', (socket: Socket) => {
    // ... bestehender Code ...

    // Middleware für alle Events: Rate-Limiting
    socket.use((packet, next) => {
      const [event] = packet;

      // Globales Event-Rate-Limit
      if (!checkRateLimit(socket, 'global')) {
        return next(new Error('RATE_LIMITED'));
      }

      // Event-spezifisches Rate-Limit
      if (!checkRateLimit(socket, event)) {
        return next(new Error('RATE_LIMITED'));
      }

      next();
    });

    // Idle-Timeout
    let lastActivity = Date.now();
    socket.onAny(() => {
      lastActivity = Date.now();
    });

    const idleCheck = setInterval(() => {
      if (Date.now() - lastActivity > DOS.IDLE_TIMEOUT) {
        socket.emit('idle-disconnect', { reason: 'Inactivity' });
        socket.disconnect(true);
      }
    }, 60_000);

    // Cleanup bei Disconnect
    socket.on('disconnect', () => {
      clearInterval(idleCheck);

      const ip = socket.data.ip;
      if (ip) {
        const ipConns = connectionsPerIP.get(ip);
        if (ipConns) {
          ipConns.delete(socket.id);
          if (ipConns.size === 0) {
            connectionsPerIP.delete(ip);
          }
        }
      }
      totalConnections--;
    });
  });
}

function getClientIP(socket: Socket): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  return socket.handshake.address;
}
```

---

### 7.4 Anti-Cheat: Timing-Validierung

- [ ] 🔧 Server-seitige Timer prüfen

**In `phases.ts` erweitern:**

```typescript
// Timing-Tracking pro Instanz
interface PhaseTimings {
  phaseStartedAt: number;
  phaseEndsAt: number;
}

const instanceTimings = new Map<string, PhaseTimings>();

function setPhaseTimings(instanceId: string, duration: number): void {
  instanceTimings.set(instanceId, {
    phaseStartedAt: Date.now(),
    phaseEndsAt: Date.now() + duration,
  });
}

/**
 * Prüft ob eine Aktion im gültigen Zeitfenster liegt
 */
export function isWithinPhaseTime(instanceId: string, gracePeriodMs = 2000): boolean {
  const timings = instanceTimings.get(instanceId);
  if (!timings) return false;

  const now = Date.now();
  return now <= timings.phaseEndsAt + gracePeriodMs;
}

// In handleDrawing:
function handleDrawing(instance: Instance): void {
  instance.submissions = [];
  setPhaseTimings(instance.id, TIMERS.DRAWING);
  // ... rest
}
```

---

### 7.5 Anti-Cheat: Submission-Validierung

- [ ] 🔧 Doppelte Submissions verhindern
- [ ] 🔧 Timing prüfen

**Im Submit-Handler erweitern:**

```typescript
socket.on('submit-drawing', (data: unknown) => {
  // ... bestehende Validierung ...

  // Timing prüfen
  if (!isWithinPhaseTime(instanceId)) {
    socket.emit('error', { code: 'TIME_EXPIRED', message: 'Submission time expired' });
    return;
  }

  // Minimum Zeichenzeit (Anti-Bot: mindestens 3 Sekunden)
  const MIN_DRAW_TIME = 3000;
  const timings = getPhaseTimings(instanceId);
  if (timings && Date.now() - timings.phaseStartedAt < MIN_DRAW_TIME) {
    socket.emit('error', { code: 'TOO_FAST', message: 'Submitted too quickly' });
    return;
  }

  // ... Rest der Submission-Logik
});
```

---

### 7.6 Anti-Cheat: Vote-Manipulation verhindern

- [ ] 🔧 Self-Votes blockieren
- [ ] 🔧 Doppelte Votes blockieren
- [ ] 🔧 Nur gültige Targets erlauben

**Im Vote-Handler erweitern:**

```typescript
socket.on('vote', (data: unknown) => {
  // ... Validierung ...

  // Kann nicht für sich selbst voten
  if (validation.data.chosenId === player.id) {
    socket.emit('error', { code: 'CANNOT_VOTE_SELF' });
    return;
  }

  // Target muss im Assignment sein
  const state = getVotingState(instanceId);
  const assignment = state?.assignments.find((a) => a.voterId === player.id);

  if (!assignment) {
    socket.emit('error', { code: 'NO_ASSIGNMENT' });
    return;
  }

  if (
    validation.data.chosenId !== assignment.imageA &&
    validation.data.chosenId !== assignment.imageB
  ) {
    socket.emit('error', { code: 'INVALID_TARGET' });
    return;
  }

  // ... Rest
});
```

---

### 7.7 Multi-Account Detection

- [ ] 📁 `apps/server/src/fingerprint.ts` erstellen

**Datei:**

```typescript
// apps/server/src/fingerprint.ts
import type { Socket } from 'socket.io';
import { log } from './utils.js';

interface Fingerprint {
  ip: string;
  userAgent: string;
}

// IP -> Socket IDs
const ipToSockets = new Map<string, Set<string>>();

// Max Sessions pro IP
const MAX_SESSIONS_PER_IP = 3;

/**
 * Prüft auf Multi-Account
 */
export function checkMultiAccount(socket: Socket): { allowed: boolean; warning: boolean } {
  const ip = socket.data.ip || socket.handshake.address;

  let sockets = ipToSockets.get(ip);
  if (!sockets) {
    sockets = new Set();
    ipToSockets.set(ip, sockets);
  }

  // Bereits registriert?
  if (sockets.has(socket.id)) {
    return { allowed: true, warning: false };
  }

  // Limit erreicht?
  if (sockets.size >= MAX_SESSIONS_PER_IP) {
    log('MultiAccount', `IP ${ip} has ${sockets.size} sessions, blocking new`);
    return { allowed: false, warning: false };
  }

  // Warning bei vielen Sessions
  const warning = sockets.size >= MAX_SESSIONS_PER_IP - 1;

  sockets.add(socket.id);
  return { allowed: true, warning };
}

/**
 * Entfernt Socket bei Disconnect
 */
export function removeSocketFingerprint(socket: Socket): void {
  const ip = socket.data.ip || socket.handshake.address;
  const sockets = ipToSockets.get(ip);

  if (sockets) {
    sockets.delete(socket.id);
    if (sockets.size === 0) {
      ipToSockets.delete(ip);
    }
  }
}

/**
 * Gibt Anzahl Sessions pro IP zurück
 */
export function getSessionCount(ip: string): number {
  return ipToSockets.get(ip)?.size ?? 0;
}
```

---

### 7.8 Sicherheits-Middleware zusammenfassen

- [ ] 🔧 Zentrale Security-Middleware

**In `socket.ts` integrieren:**

```typescript
import { checkMultiAccount, removeSocketFingerprint } from './fingerprint.js';

// Bei Connection:
io.use((socket, next) => {
  // Multi-Account Check
  const multiCheck = checkMultiAccount(socket);
  if (!multiCheck.allowed) {
    return next(new Error('TOO_MANY_SESSIONS'));
  }

  if (multiCheck.warning) {
    socket.data.multiAccountWarning = true;
  }

  next();
});

// Bei Disconnect:
socket.on('disconnect', () => {
  removeSocketFingerprint(socket);
  // ... rest
});
```

---

## Kontrollpunkte

### 🧪 Test 1: Rate-Limiting funktioniert

```javascript
// Schnell viele Requests senden
for (let i = 0; i < 100; i++) {
  socket.emit('vote', { chosenId: 'test' });
}
// ✅ Nach ~50 Requests: "RATE_LIMITED" Fehler
```

### 🧪 Test 2: Self-Vote blockiert

```javascript
socket.emit('vote', { chosenId: myOwnPlayerId });
// ✅ Error: CANNOT_VOTE_SELF
```

### 🧪 Test 3: XSS in Username blockiert

```javascript
socket.emit('change-name', { name: '<script>alert(1)</script>' });
// ✅ Name wird escaped oder abgelehnt
```

### 🧪 Test 4: Multi-Account Detection

```
- [ ] Mehr als 3 Tabs mit gleicher IP öffnen
- [ ] ✅ Ab dem 4. Tab: Verbindung abgelehnt
```

### 🧪 Test 5: Idle-Disconnect

```
- [ ] 5 Minuten nichts tun
- [ ] ✅ "idle-disconnect" Event kommt
- [ ] ✅ Socket wird getrennt
```

---

## Definition of Done

- [ ] Alle Inputs werden mit Zod validiert
- [ ] XSS-Patterns werden blockiert
- [ ] Rate-Limiting für alle Events aktiv
- [ ] DoS-Schutz: Connection-Limits, Payload-Limits
- [ ] Timing-Validierung auf Server-Seite
- [ ] Self-Votes werden blockiert
- [ ] Multi-Account Detection funktioniert
- [ ] Idle-Timeout trennt inaktive Verbindungen
- [ ] Keine sensiblen Infos in Error-Messages
- [ ] Alle Änderungen sind committed

---

## Security Checklist

| Bereich | Status | Maßnahme |
|---------|--------|----------|
| Input Validation | ⬜ | Zod für alle Inputs |
| XSS | ⬜ | HTML Entities escapen |
| Rate Limiting | ⬜ | Per-Event und Per-IP |
| DoS | ⬜ | Connection + Payload Limits |
| Timing | ⬜ | Server-autoritative Timer |
| Vote Manipulation | ⬜ | Assignment-Prüfung |
| Multi-Account | ⬜ | IP-basierte Limits |
| Idle Timeout | ⬜ | 5 Minuten |

---

## Nächster Schritt

👉 **Weiter zu [Phase 8: Polish & Extras](./phase-8-polish.md)**
