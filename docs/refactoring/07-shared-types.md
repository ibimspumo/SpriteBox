# 07: Shared Types Package

**Status:** Offen
**Priorität:** MITTEL
**Aufwand:** Mittel (1-2 Tage)

---

## Problem

Server und Client definieren identische Types unabhängig voneinander:

| Type | Server | Client |
|------|--------|--------|
| `User` | `types.ts:4` | `socket.ts:394` |
| `Prompt` | `types.ts:229` | `socket.ts:382` + `prompts.ts:18` |
| `PromptIndices` | `types.ts:236` | `socket.ts:388` + `prompts.ts:12` |
| `GameModeStats` | `types.ts:253` | `socket.ts:67` |
| `CopyCatPlayerResult` | `types.ts:94` | `socket.ts:76` |

### Risiken

- **Type-Drift**: Server und Client können auseinanderlaufen
- **Manuelle Synchronisation**: Fehleranfällig
- **Zod-Schemas nicht geteilt**: Server validiert, Client nicht

---

## Lösung

Shared Types Package im Monorepo erstellen:

```
packages/
└── types/
    ├── src/
    │   ├── index.ts          # Alle Exports
    │   ├── user.ts           # User-Types
    │   ├── game.ts           # Spiel-Types
    │   ├── socket.ts         # Socket-Event-Types
    │   ├── modes/            # Spielmodus-spezifische Types
    │   │   ├── copycat.ts
    │   │   ├── pixelGuesser.ts
    │   │   ├── zombiePixel.ts
    │   │   └── copycatRoyale.ts
    │   └── validation.ts     # Zod-Schemas mit Type-Exports
    ├── package.json
    └── tsconfig.json
```

---

## Implementierungsschritte

### Phase 1: Package-Setup

1. `packages/types/` Verzeichnis erstellen
2. `package.json` konfigurieren
3. `tsconfig.json` konfigurieren
4. pnpm Workspace aktualisieren

### Phase 2: Types migrieren

5. Core-Types extrahieren (`User`, `Prompt`, etc.)
6. Socket-Event-Types extrahieren
7. Spielmodus-Types extrahieren
8. Zod-Schemas migrieren (mit `z.infer<>`)

### Phase 3: Apps aktualisieren

9. Server: Types-Package als Dependency
10. Server: Imports aktualisieren
11. Web: Types-Package als Dependency
12. Web: Imports aktualisieren
13. Doppelte Type-Definitionen entfernen

### Phase 4: Validierung

14. TypeScript-Check in allen Apps
15. Build-Pipeline testen
16. Runtime-Tests

---

## Package-Konfiguration

### package.json

```json
{
  "name": "@spritebox/types",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "./dist",
    "strict": true
  },
  "include": ["src/**/*"]
}
```

---

## Verwendung nach Migration

### Server

```typescript
import type { User, Prompt, GameModeStats } from '@spritebox/types';
import { UserSchema, PromptSchema } from '@spritebox/types/validation';
```

### Web

```typescript
import type { User, Prompt, SocketEvents } from '@spritebox/types';
```

---

## Vorteile

- **Single Source of Truth**: Types nur an einem Ort
- **Type-Safety**: Garantierte Konsistenz
- **Zod-Integration**: Schemas und Types zusammen
- **Einfaches Versioning**: Package-Version trackt Änderungen
- **IDE-Support**: Bessere Autocomplete in beiden Apps

---

## Checkliste

- [ ] Package-Verzeichnis erstellen
- [ ] package.json konfigurieren
- [ ] tsconfig.json konfigurieren
- [ ] pnpm Workspace aktualisieren
- [ ] Core-Types extrahieren
- [ ] Socket-Event-Types extrahieren
- [ ] Spielmodus-Types extrahieren
- [ ] Zod-Schemas migrieren
- [ ] Server-Imports aktualisieren
- [ ] Web-Imports aktualisieren
- [ ] Doppelte Types entfernen
- [ ] Build-Pipeline testen
- [ ] TypeScript-Checks in allen Apps
