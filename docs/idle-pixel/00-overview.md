# Idle Pixel - Game Mode Specification

> Ein Idle/Clicker-Spiel basierend auf dem SpriteBox Pixel-Art-Theme.

## Inhaltsverzeichnis

| Phase | Datei | Beschreibung |
|-------|-------|--------------|
| 0 | [00-overview.md](./00-overview.md) | Übersicht & Kernkonzept |
| 1 | [01-data-structures.md](./01-data-structures.md) | TypeScript Types & Datenstrukturen |
| 2 | [02-core-systems.md](./02-core-systems.md) | Pixel, Merge & Grid System |
| 3 | [03-upgrade-system.md](./03-upgrade-system.md) | Dynamisches Upgrade-System |
| 4 | [04-clicker-system.md](./04-clicker-system.md) | Energie-Balken & Goldener Pixel |
| 5 | [05-prestige-system.md](./05-prestige-system.md) | Prestige & Reset-Mechanik |
| 6 | [06-storage-offline.md](./06-storage-offline.md) | LocalStorage & Offline-Fortschritt |
| 7 | [07-ui-components.md](./07-ui-components.md) | Svelte Komponenten & Animationen |
| 8 | [08-balancing.md](./08-balancing.md) | Formeln & Balancing-Werte |

---

## Kernkonzept

### Spielidee

Der Spieler startet mit einem einzelnen schwarzen Pixel in einem 2×2 Grid. Dieser Pixel produziert automatisch "Pixel-Währung". Mit dieser Währung kann der Spieler:

1. **Neue Pixel kaufen** → Erscheinen auf dem Grid
2. **Grid erweitern** → Mehr Platz für Pixel
3. **Upgrades kaufen** → Produktion verbessern

### Merge-Mechanik

Zwei gleichfarbige Pixel verschmelzen automatisch zur nächsten Farbstufe:

```
⬛ + ⬛ = 🟫   (Schwarz + Schwarz = Braun)
🟫 + 🟫 = 🔴   (Braun + Braun = Rot)
🔴 + 🔴 = 🟠   (Rot + Rot = Orange)
...
```

### Wert-Progression

| Stufe | Farbe | Produktion/Sek | Formel |
|-------|-------|----------------|--------|
| 1 | Schwarz | 1 | 3⁰ = 1 |
| 2 | Braun | 3 | 3¹ = 3 |
| 3 | Rot | 9 | 3² = 9 |
| 4 | Orange | 27 | 3³ = 27 |
| 5 | Gelb | 81 | 3⁴ = 81 |
| ... | ... | ... | 3^(n-1) |
| 15 | Rosa | 4,782,969 | 3¹⁴ |

---

## Feature-Übersicht

### Muss-Features (MVP)

- [x] Pixel-Produktion & Währung
- [x] Kauf neuer Pixel (exponentiell steigender Preis)
- [x] Automatisches Merge mit Animation
- [x] Grid-Erweiterung (frei wählbare Slots)
- [x] 5 Basis-Upgrades
- [x] Energie-Balken (Clicker A)
- [x] Goldener Pixel (Clicker B)
- [x] LocalStorage Speicherung
- [x] Offline-Fortschritt (max 24h)

### Geplante Features

- [ ] Prestige-System
- [ ] Erweiterte Upgrades
- [ ] Achievements
- [ ] Statistiken

---

## Technische Rahmenbedingungen

| Aspekt | Entscheidung |
|--------|-------------|
| Architektur | 100% Clientseitig |
| Framework | Svelte 5 (Runes) |
| Speicherung | LocalStorage |
| Server | Nicht benötigt |
| Styling | Design Tokens + Mikro-Animationen |

---

## Farb-Palette (15 Farben)

Basierend auf der bestehenden SpriteBox-Palette (ohne Weiß):

```typescript
const IDLE_PIXEL_COLORS = [
  '#000000', // 0: Schwarz (Stufe 1)
  '#5c3a21', // 1: Braun
  '#ff0000', // 2: Rot
  '#ff8800', // 3: Orange
  '#ffff00', // 4: Gelb
  '#00ff00', // 5: Grün
  '#00ffff', // 6: Cyan
  '#0088ff', // 7: Hellblau
  '#0000ff', // 8: Blau
  '#8800ff', // 9: Violett
  '#ff00ff', // 10: Magenta
  '#ff0088', // 11: Pink
  '#888888', // 12: Grau
  '#cccccc', // 13: Hellgrau
  '#ffcccc', // 14: Rosa (Stufe 15 - Maximum)
];
```

---

## Nächste Schritte

1. **Phase 1:** Types in `@spritebox/types` definieren
2. **Phase 2:** Core-Systeme implementieren
3. **Phase 3:** Upgrade-System aufbauen
4. **Phase 4:** Clicker-Elemente hinzufügen
5. **Phase 5:** Prestige vorbereiten
6. **Phase 6:** Speicherung & Offline
7. **Phase 7:** UI-Komponenten
8. **Phase 8:** Balancing & Feintuning
