---
title: Datenformate
description: Pixel-Daten, Prompts und Kompression
---

## Pixel-Art-Format

### Struktur

Pixel Art wird als **64-Zeichen Hex-String** gespeichert:
- 8x8 Grid = 64 Pixel
- 16 Farben = 4 Bit pro Pixel
- 1 Hex-Zeichen pro Pixel

### Beispiel

```
"0000000000000000000F0F00000F0F0000FFFF00000000000000000000000000"
```

Decodiert (8x8 Grid):
```
0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0
0 0 0 F 0 F 0 0   <- Augen (weiß)
0 0 0 F 0 F 0 0
0 0 F F F F 0 0   <- Mund (weiß)
0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0
```

### Farbpalette

| Index | Hex | Farbe |
|-------|-----|-------|
| 0 | `#000000` | Schwarz |
| 1 | `#1D2B53` | Dunkelblau |
| 2 | `#7E2553` | Dunkelviolett |
| 3 | `#008751` | Dunkelgrün |
| 4 | `#AB5236` | Braun |
| 5 | `#5F574F` | Dunkelgrau |
| 6 | `#C2C3C7` | Hellgrau |
| 7 | `#FFF1E8` | Weiß |
| 8 | `#FF004D` | Rot |
| 9 | `#FFA300` | Orange |
| A | `#FFEC27` | Gelb |
| B | `#00E436` | Grün |
| C | `#29ADFF` | Hellblau |
| D | `#83769C` | Lavendel |
| E | `#FF77A8` | Pink |
| F | `#FFCCAA` | Pfirsich |

## Prompt-Format

### Struktur

Prompts werden als **Indizes** gesendet, nicht als Text:

```typescript
interface PromptIndices {
  prefix: number;   // Index in prefixes[]
  subject: number;  // Index in subjects[]
  suffix: number;   // Index in suffixes[]
}
```

### Client-Lokalisierung

Der Client baut den lokalisierten Prompt zusammen:

```typescript
// prompts_en.json / prompts_de.json
{
  "prefixes": ["Happy", "Sad", "Angry", ...],
  "subjects": ["cat", "dog", "robot", ...],
  "suffixes": ["in space", "at the beach", ...]
}

// Client
const prompt = `${prefixes[idx.prefix]} ${subjects[idx.subject]} ${suffixes[idx.suffix]}`;
// "Happy cat in space"
```

## Galerie-Kompression

### Wann komprimiert wird

- **Kleine Galerien** (<50 Spieler): Keine Kompression
- **Große Galerien** (50+ Spieler): LZ-String-Kompression

### Format

```typescript
interface GalleryData {
  compressed: boolean;
  data: string;  // Raw oder LZ-String komprimiert
}
```

### Client-Dekompression

```typescript
import LZString from 'lz-string';

const gallery = data.compressed
  ? JSON.parse(LZString.decompressFromUTF16(data.data))
  : JSON.parse(data.data);
```

## Validierung

### Pixel-Schema (Zod)

```typescript
const pixelSchema = z.string()
  .length(64)
  .regex(/^[0-9a-f]+$/i);
```

### Prompt-Schema

```typescript
const promptIndicesSchema = z.object({
  prefix: z.number().int().min(0),
  subject: z.number().int().min(0),
  suffix: z.number().int().min(0),
});
```

## Nächste Schritte

- [Socket-Events](/docs/de/api/socket-events/) - Event-Referenz
- [Entwicklung](/docs/de/contributing/development/) - Neue Formate hinzufügen
