# Phase 0: Projekt-Setup

**Ziel:** Monorepo-Struktur aufsetzen, alle Dependencies installieren, Basis-Konfiguration erstellen.

**Voraussetzungen:**
- Node.js >= 18 installiert
- pnpm installiert (`npm install -g pnpm`)
- Git installiert

---

## Aufgaben

### 0.1 Monorepo-Struktur erstellen

- [ ] 🔧 Root `package.json` erstellen
- [ ] 🔧 `pnpm-workspace.yaml` erstellen
- [ ] 📁 `apps/server/` Ordner anlegen
- [ ] 📁 `apps/web/` Ordner anlegen

**Dateien:**

```json
// package.json (Root)
{
  "name": "spritebox",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "start": "pnpm --filter server start",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
```

---

### 0.2 Server-Projekt initialisieren

- [ ] 📁 `apps/server/package.json` erstellen
- [ ] 📁 `apps/server/tsconfig.json` erstellen
- [ ] 📁 `apps/server/src/` Ordner anlegen

**Dateien:**

```json
// apps/server/package.json
{
  "name": "server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "zod": "^3.22.4",
    "lz-string": "^1.5.0",
    "nanoid": "^5.0.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "tsx": "^4.6.0",
    "typescript": "^5.3.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0"
  }
}
```

```json
// apps/server/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### 0.3 Web-Projekt initialisieren (Svelte 5)

- [ ] 🔧 Svelte-Projekt mit Vite erstellen
- [ ] 📁 Dependencies installieren
- [ ] 📁 `vite.config.ts` anpassen

**Befehle:**

```bash
cd apps
pnpm create svelte@latest web
# Wähle:
# - Skeleton project
# - TypeScript
# - ESLint
# - Prettier (optional)

cd web
pnpm add socket.io-client
```

**Datei anpassen:**

```typescript
// apps/web/vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
});
```

---

### 0.4 Prompt-Datenbank erstellen

- [ ] 📁 `apps/server/data/` Ordner anlegen
- [ ] 📁 `apps/server/data/prompts.json` erstellen

**Datei:**

```json
// apps/server/data/prompts.json
{
  "prefixes": [
    "angry", "sleepy", "giant", "tiny", "robot",
    "medieval", "disco", "sad", "floating", "melting",
    "happy", "flying", "invisible", "glowing", "frozen",
    "dancing", "hungry", "magical", "royal", "evil"
  ],
  "subjects": [
    "cat", "house", "pizza", "tree", "ghost",
    "banana", "knight", "spaceship", "frog", "burger",
    "robot", "wizard", "dragon", "car", "flower",
    "moon", "sun", "fish", "bird", "dog"
  ],
  "suffixes": [
    "in space", "on fire", "at night", "in love",
    "running away", "eating cake", "as a king", "underwater",
    "on a cloud", "in the rain", "with sunglasses", "sleeping",
    "playing music", "reading a book", "on vacation", "at a party"
  ]
}
```

---

### 0.5 ESLint konfigurieren

- [ ] 📁 Root `.eslintrc.cjs` erstellen

**Datei:**

```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    node: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off'
  },
  ignorePatterns: ['dist/', 'node_modules/', '.svelte-kit/']
};
```

---

### 0.6 Git konfigurieren

- [ ] 📁 `.gitignore` aktualisieren

**Datei:**

```gitignore
# .gitignore
node_modules/
dist/
.svelte-kit/
build/

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Build
*.tsbuildinfo
```

---

### 0.7 Dependencies installieren

- [ ] 🔧 `pnpm install` ausführen
- [ ] 🧪 Überprüfen, dass keine Fehler auftreten

```bash
# Im Root-Verzeichnis
pnpm install
```

---

### 0.8 Basis-Entry-Points erstellen

- [ ] 📁 `apps/server/src/index.ts` (Platzhalter)
- [ ] 📁 `apps/web/src/routes/+page.svelte` anpassen

**Server Platzhalter:**

```typescript
// apps/server/src/index.ts
console.log('🎨 SpriteBox Server starting...');
console.log('📦 Phase 0 complete - Setup done!');
```

---

## Kontrollpunkte

### 🧪 Test 1: pnpm install

```bash
pnpm install
# ✅ Keine Fehler
# ✅ node_modules in Root und apps/*
```

### 🧪 Test 2: TypeScript Check

```bash
pnpm typecheck
# ✅ Keine Fehler
```

### 🧪 Test 3: Server startet

```bash
cd apps/server
pnpm dev
# ✅ Ausgabe: "SpriteBox Server starting..."
```

### 🧪 Test 4: Web startet

```bash
cd apps/web
pnpm dev
# ✅ Browser öffnet http://localhost:5173
# ✅ Svelte-Seite wird angezeigt
```

---

## Definition of Done

- [ ] Alle Ordner existieren gemäß Struktur
- [ ] `pnpm install` läuft erfolgreich
- [ ] `pnpm typecheck` zeigt keine Fehler
- [ ] Server-Platzhalter startet
- [ ] Web-App startet im Browser
- [ ] Git-Repository ist sauber (`.gitignore` funktioniert)
- [ ] Alle Änderungen sind committed

---

## Häufige Probleme

### Problem: pnpm nicht gefunden

```bash
npm install -g pnpm
```

### Problem: Node-Version zu alt

```bash
node --version
# Muss >= 18.0.0 sein
```

### Problem: TypeScript-Fehler bei Import

Stelle sicher, dass `"type": "module"` in `package.json` steht und `tsconfig.json` `"moduleResolution": "bundler"` verwendet.

---

## Nächster Schritt

👉 **Weiter zu [Phase 1: Server-Grundgerüst](./phase-1-server.md)**
