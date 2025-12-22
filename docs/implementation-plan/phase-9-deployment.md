# Phase 9: Deployment

**Ziel:** Production Build erstellen, auf Render (oder alternatives Hosting) deployen, Monitoring einrichten.

**Voraussetzungen:**
- Phase 8 abgeschlossen
- Spiel ist vollständig funktional
- Alle Tests bestanden

---

## Aufgaben

### 9.1 Production Build konfigurieren

- [ ] 🔧 Server-Build optimieren
- [ ] 🔧 Frontend-Build optimieren

**Server `package.json` aktualisieren:**

```json
// apps/server/package.json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  }
}
```

**Root `package.json` aktualisieren:**

```json
// package.json (Root)
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm --filter server build && pnpm --filter web build",
    "start": "pnpm --filter server start",
    "postbuild": "cp -r apps/web/build apps/server/dist/public"
  }
}
```

---

### 9.2 Static File Serving

- [ ] 🔧 Server serviert Frontend in Production

**In `apps/server/src/index.ts` erweitern:**

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: isProduction
    ? { origin: false } // Kein CORS nötig wenn same-origin
    : { origin: ['http://localhost:5173'], methods: ['GET', 'POST'] },
  pingTimeout: 20_000,
  pingInterval: 25_000,
  maxHttpBufferSize: 1024,
});

// In Production: Statische Dateien servieren
if (isProduction) {
  const publicPath = join(__dirname, 'public');
  app.use(express.static(publicPath));

  // SPA Fallback
  app.get('*', (_req, res) => {
    res.sendFile(join(publicPath, 'index.html'));
  });
}

// Health Check (immer)
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    connections: io.engine.clientsCount,
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    timestamp: Date.now(),
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🎨 SpriteBox running on port ${PORT}`);
  console.log(`📡 Mode: ${isProduction ? 'Production' : 'Development'}`);
});
```

---

### 9.3 Render Deployment konfigurieren

- [ ] 📁 `render.yaml` erstellen

**Datei:**

```yaml
# render.yaml
services:
  - type: web
    name: spritebox
    env: node
    region: frankfurt  # EU Server
    plan: free  # Oder starter/standard für Production
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm start
    envVars:
      - key: NODE_ENV
        value: production
    healthCheckPath: /health
```

---

### 9.4 Deployment Schritte (Render)

1. **GitHub Repository erstellen/pushen**

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

2. **Render Account erstellen**
   - [render.com](https://render.com) öffnen
   - Mit GitHub verbinden

3. **Web Service erstellen**
   - "New" → "Web Service"
   - Repository auswählen
   - Region: **Frankfurt** (EU)
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start`
   - Environment: `NODE_ENV=production`

4. **Deploy starten**
   - "Create Web Service" klicken
   - Warten bis Build fertig ist
   - URL erhalten (z.B. `spritebox.onrender.com`)

---

### 9.5 Alternative: Docker Deployment

- [ ] 📁 `Dockerfile` erstellen (optional)

**Datei:**

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# pnpm installieren
RUN npm install -g pnpm

# Dependencies installieren
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

# Source kopieren und builden
COPY . .
RUN pnpm build

# Production Image
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/server/package.json apps/server/
COPY --from=builder /app/apps/server/dist apps/server/dist/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/apps/server/node_modules apps/server/node_modules/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "--filter", "server", "start"]
```

```bash
# Docker Build & Run
docker build -t spritebox .
docker run -p 3000:3000 spritebox
```

---

### 9.6 Monitoring einrichten

- [ ] 🔧 Health-Checks konfigurieren
- [ ] 🔧 Logs überwachen

**Render Health Check:**
- Path: `/health`
- Interval: 30 Sekunden

**Logging im Server erweitern:**

```typescript
// apps/server/src/monitoring.ts
import { getInstanceStats } from './instance.js';

export function startMonitoring(): void {
  // Periodische Stats alle 5 Minuten
  setInterval(() => {
    const stats = getInstanceStats();
    const memory = process.memoryUsage();

    console.log(JSON.stringify({
      type: 'stats',
      timestamp: new Date().toISOString(),
      instances: stats.total,
      players: stats.totalPlayers,
      heapMB: Math.round(memory.heapUsed / 1024 / 1024),
      uptime: Math.round(process.uptime()),
    }));
  }, 5 * 60 * 1000);

  // Unhandled Errors loggen
  process.on('uncaughtException', (error) => {
    console.error(JSON.stringify({
      type: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
    }));
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error(JSON.stringify({
      type: 'rejection',
      timestamp: new Date().toISOString(),
      reason: String(reason),
    }));
  });
}
```

---

### 9.7 Post-Deployment Checklist

- [ ] 🧪 Health-Check erreichbar
- [ ] 🧪 WebSocket verbindet
- [ ] 🧪 Spiel funktioniert End-to-End
- [ ] 🧪 Mobile funktioniert
- [ ] 🧪 Mehrere Spieler gleichzeitig
- [ ] 🧪 Private Räume funktionieren

---

## Kontrollpunkte

### 🧪 Test 1: Production Build

```bash
pnpm build
pnpm start
# ✅ Server startet auf Port 3000
# ✅ Frontend wird serviert
```

### 🧪 Test 2: Health Check

```bash
curl https://your-app.onrender.com/health
# ✅ JSON Response mit status: "healthy"
```

### 🧪 Test 3: WebSocket in Production

```javascript
// Im Browser auf Production-URL
const socket = io();
socket.on('connected', () => console.log('Connected!'));
// ✅ Verbindung erfolgreich
```

### 🧪 Test 4: Kompletter Spielablauf

```
- [ ] Öffentlichem Spiel beitreten
- [ ] Warten auf 5 Spieler (oder private Lobby)
- [ ] Zeichnen und abgeben
- [ ] Voting durchführen
- [ ] Ergebnisse sehen
- [ ] ✅ Alles funktioniert
```

---

## Definition of Done

- [ ] Production Build funktioniert lokal
- [ ] App ist auf Render (oder anderem Host) deployed
- [ ] Health-Check ist erreichbar
- [ ] WebSocket funktioniert in Production
- [ ] Frontend wird korrekt serviert
- [ ] Spiel ist vollständig spielbar
- [ ] Monitoring/Logging ist aktiv
- [ ] Domain ist eingerichtet (optional)
- [ ] README mit Deployment-Anleitung aktualisiert

---

## Deployment Checklist

| Schritt | Status | Details |
|---------|--------|---------|
| Build lokal testen | ⬜ | `pnpm build && pnpm start` |
| Git Push | ⬜ | Alle Änderungen committed |
| Render Service erstellen | ⬜ | Mit GitHub verbunden |
| Build erfolgreich | ⬜ | Keine Fehler im Log |
| Health Check OK | ⬜ | `/health` antwortet |
| WebSocket funktioniert | ⬜ | Verbindung möglich |
| End-to-End Test | ⬜ | Komplettes Spiel |
| Mobile Test | ⬜ | Touch funktioniert |

---

## Nach dem Deployment

### Optionale Verbesserungen

| Feature | Beschreibung |
|---------|--------------|
| Custom Domain | Eigene Domain einrichten |
| SSL Cert | HTTPS (Render macht das automatisch) |
| CDN | Static Assets über CDN |
| Alerts | Benachrichtigungen bei Errors |
| Analytics | Nutzungsstatistiken |

### Skalierung (wenn nötig)

| Aktion | Wann |
|--------|------|
| Plan upgraden | >100 gleichzeitige Spieler |
| Mehr RAM | Memory-Warnings im Log |
| Multi-Region | Globale Nutzer |
| Redis | >10.000 gleichzeitige Spieler |

---

## Geschafft! 🎉

Wenn du bis hierhin gekommen bist, hast du erfolgreich SpriteBox implementiert und deployed!

### Was du gebaut hast:

- ✅ Echtzeit-Multiplayer-Spiel
- ✅ 8x8 Pixel-Art Canvas
- ✅ Elo-basiertes Voting
- ✅ Public & Private Lobbies
- ✅ Mobile-First Design
- ✅ Security-hardened
- ✅ Production-ready

### Nächste Schritte:

1. **Teilen** - Lade Freunde ein zum Spielen
2. **Feedback sammeln** - Was gefällt, was fehlt?
3. **Iterieren** - Features basierend auf Feedback hinzufügen
4. **Open Source** - Community aufbauen (optional)

---

**Viel Spaß mit SpriteBox!** 🎨
