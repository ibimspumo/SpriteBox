---
title: Entwicklung
description: Entwicklungsumgebung und häufige Aufgaben
---

## Einrichtung

### Voraussetzungen

- Node.js 20.19.0+
- pnpm 9.x+
- Git

### Installation

```bash
git clone https://github.com/ibimspumo/SpriteBox.git
cd SpriteBox
pnpm install
pnpm dev
```

## Häufige Aufgaben

### Neues Socket-Event hinzufügen

1. **Server-Handler** (`apps/server/src/socket.ts`)
   ```typescript
   socket.on('mein-event', (data) => {
     const validated = meinEventSchema.parse(data);
     // Logik hier
   });
   ```

2. **Zod-Schema** definieren
   ```typescript
   const meinEventSchema = z.object({
     feld: z.string(),
   });
   ```

3. **Client-Handler** (`apps/web/src/lib/socket.ts`)
   ```typescript
   socket.on('mein-event', (data) => {
     // State aktualisieren
   });
   ```

### Neue Übersetzung hinzufügen

1. **Typ definieren** (`types.ts`)
   ```typescript
   meinBereich: {
     meinSchlüssel: string;
   };
   ```

2. **Englisch** (`en.ts`)
   ```typescript
   meinBereich: {
     meinSchlüssel: 'My text',
   },
   ```

3. **Deutsch** (`de.ts`)
   ```typescript
   meinBereich: {
     meinSchlüssel: 'Mein Text',
   },
   ```

4. **Verwenden**
   ```svelte
   <span>{$t.meinBereich.meinSchlüssel}</span>
   ```

### Neue Komponente erstellen

1. **Entscheide die Ebene**
   - Atom: Einfaches UI-Element
   - Molecule: Kombination von Atoms
   - Organism: Komplexer Abschnitt
   - Feature: Spielphasen-Komponente

2. **Erstelle die Datei**
   ```svelte
   <!-- components/atoms/MeineKomponente.svelte -->
   <script lang="ts">
     interface Props {
       label: string;
       onclick?: () => void;
     }
     let { label, onclick }: Props = $props();
   </script>

   <button class="meine-komponente" {onclick}>
     {label}
   </button>

   <style>
     .meine-komponente {
       padding: var(--space-2) var(--space-4);
       border-radius: var(--radius-md);
     }
   </style>
   ```

3. **Exportiere**
   ```typescript
   // components/atoms/index.ts
   export { default as MeineKomponente } from './MeineKomponente.svelte';
   ```

## Debugging

### Debug-Panel

Drücke `D` im Spiel für das Debug-Panel:
- Spielzustand
- Socket-Verbindung
- Phasen-Timer
- Spielerliste

### Server-Logs

```bash
# Detaillierte Logs
DEBUG=* pnpm dev:server
```

## Befehle

```bash
# Entwicklung
pnpm dev              # Alles starten
pnpm dev:web          # Nur Frontend
pnpm dev:server       # Nur Backend

# Qualität
pnpm lint             # ESLint
pnpm typecheck        # TypeScript

# Build
pnpm build            # Produktion
pnpm start            # Server starten
```

## Nächste Schritte

- [Richtlinien](/docs/de/contributing/guidelines/) - Beitragsregeln
- [Socket-Events](/docs/de/api/socket-events/) - Event-Referenz
