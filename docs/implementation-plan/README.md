# SpriteBox - Implementierungsplan

Dieser Ordner enthält einen strukturierten, mehrstufigen Plan zur Umsetzung des Pixel-Spiels gemäß der [SPEC.md](../../SPEC.md).

## Übersicht der Phasen

| Phase | Name | Beschreibung | Geschätzte Tasks |
|-------|------|--------------|------------------|
| 0 | [Projekt-Setup](./phase-0-setup.md) | Monorepo, Dependencies, Konfiguration | 8 |
| 1 | [Server-Grundgerüst](./phase-1-server.md) | Express, Socket.io, Entry Point | 7 |
| 2 | [Instanz-System](./phase-2-instances.md) | Public/Private Instanzen, Lobby | 9 |
| 3 | [Zeichnen-Phase](./phase-3-drawing.md) | Canvas-Logik, Pixel-Speicherung, Timer | 6 |
| 4 | [Voting-System](./phase-4-voting.md) | Elo-Rating, Fairness-Algorithmus | 10 |
| 5 | [Frontend-Grundgerüst](./phase-5-frontend.md) | Svelte Setup, Socket-Client, Stores | 8 |
| 6 | [UI-Komponenten](./phase-6-ui.md) | Canvas, Palette, Voting, Results | 9 |
| 7 | [Sicherheit](./phase-7-security.md) | Validation, Rate Limiting, Anti-Cheat | 8 |
| 8 | [Polish & Extras](./phase-8-polish.md) | Stats, Galerie, Reconnect, Compression | 7 |
| 9 | [Deployment](./phase-9-deployment.md) | Render Setup, Production Build | 5 |

---

## Projektstruktur (Ziel)

```
SpriteBox/
├── apps/
│   ├── server/
│   │   ├── src/
│   │   │   ├── index.ts          # Entry Point
│   │   │   ├── socket.ts         # WebSocket Handler
│   │   │   ├── instance.ts       # Instanz-Logik
│   │   │   ├── voting.ts         # Voting-Algorithmus
│   │   │   ├── phases.ts         # Phasen-Steuerung
│   │   │   ├── validation.ts     # Input Validation (Zod)
│   │   │   └── utils.ts          # Hilfsfunktionen
│   │   ├── data/
│   │   │   └── prompts.json      # Prompt-Datenbank
│   │   └── package.json
│   │
│   └── web/
│       ├── src/
│       │   ├── lib/
│       │   │   ├── socket.ts     # Socket.io Client
│       │   │   ├── stores.ts     # Svelte Stores
│       │   │   └── types.ts      # TypeScript Types
│       │   ├── components/
│       │   │   ├── PixelCanvas.svelte
│       │   │   ├── ColorPalette.svelte
│       │   │   ├── Lobby.svelte
│       │   │   ├── Voting.svelte
│       │   │   └── Results.svelte
│       │   ├── routes/
│       │   │   └── +page.svelte
│       │   └── app.html
│       ├── vite.config.ts
│       └── package.json
│
├── package.json              # Workspace Root
├── pnpm-workspace.yaml
├── SPEC.md
├── CLAUDE.md
└── README.md
```

---

## Wie diesen Plan nutzen

### 1. Sequenziell arbeiten
Die Phasen bauen aufeinander auf. Beginne mit Phase 0 und arbeite dich durch.

### 2. Kontrollpunkte beachten
Jede Phase hat **Kontrollpunkte** am Ende. Diese MÜSSEN erfolgreich sein, bevor du zur nächsten Phase gehst.

### 3. Checklisten abhaken
Jede Aufgabe hat eine Checkbox. Hake sie ab, wenn sie erledigt ist:
```markdown
- [x] Erledigt
- [ ] Noch offen
```

### 4. Smoke-Tests ausführen
Vor dem Weitergehen: Führe die angegebenen Smoke-Tests aus, um sicherzustellen, dass alles funktioniert.

---

## Definition of Done (DoD) pro Phase

Eine Phase gilt als **abgeschlossen**, wenn:

1. ✅ Alle Aufgaben in der Checkliste sind erledigt
2. ✅ Alle Kontrollpunkte sind erfolgreich
3. ✅ `pnpm lint` läuft ohne Fehler
4. ✅ `pnpm typecheck` läuft ohne Fehler
5. ✅ Die Smoke-Tests funktionieren
6. ✅ Der Code ist committet

---

## Schnellstart

```bash
# 1. Repository klonen (falls noch nicht geschehen)
git clone <repo-url>
cd SpriteBox

# 2. Phase 0 durcharbeiten
# → docs/implementation-plan/phase-0-setup.md

# 3. Dependencies installieren
pnpm install

# 4. Dev-Server starten
pnpm dev
```

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | Muss erfüllt sein |
| 🔧 | Technische Aufgabe |
| 📁 | Datei erstellen/bearbeiten |
| 🧪 | Test/Kontrolle |
| ⚠️ | Wichtiger Hinweis |
| 💡 | Tipp |

---

## Zeitlicher Ablauf (empfohlen)

```
Phase 0-1:  Grundgerüst          [█████░░░░░]  20%
Phase 2-3:  Kernlogik Server     [██████████░░░░░]  40%
Phase 4:    Voting-System        [████████████░░░░░░]  50%
Phase 5-6:  Frontend komplett    [████████████████░░░░]  75%
Phase 7:    Sicherheit           [██████████████████░░]  85%
Phase 8-9:  Polish & Deploy      [████████████████████]  100%
```

---

## Nächster Schritt

👉 **Starte mit [Phase 0: Projekt-Setup](./phase-0-setup.md)**
