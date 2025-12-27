# 04: Frontend - Große Komponenten

**Status:** ✅ Abgeschlossen
**Priorität:** HOCH
**Aufwand:** Mittel (3-4 Tage gesamt)

---

## Kritische Komponenten (über 600 Zeilen)

| Komponente | Zeilen | Problem |
|------------|--------|---------|
| `PixelSurvivor/Combat.svelte` | 872 | Gesamte Kampfmechanik in einer Datei |
| `CopyCatRoyale/index.svelte` | 680 | Multi-Phasen-Komponente mit if-else-Ketten |
| `ZombiePixel/ZombieGrid.svelte` | 677 | Komplexe Grid-Logik mit 20+ Bedingungen |
| `Results.svelte` | 675 | Podium + Galerie vermischt |
| `Voting.svelte` | 641 | Könnte in Atome aufgeteilt werden |

---

## 4.1 PixelSurvivor/Combat.svelte (872 Zeilen)

### Problem

Gesamte Kampfmechanik in einer Datei: Würfelwurf, Aktionen, Animationen, Ergebnis.

### Lösung

```
features/PixelSurvivor/Combat/
├── index.svelte                  # Orchestrator
├── CombatDiceRoll.svelte         # D20 Würfel-Visual
├── CombatActions.svelte          # Ability/Spell-Auswahl
├── CombatAnimationSequence.svelte # Hit/Miss-Animationen
└── CombatResult.svelte           # Damage/Healing Anzeige
```

### Checkliste

- [x] Combat-Verzeichnis erstellen
- [x] CombatDiceRoll extrahieren (34 Zeilen)
- [x] CombatActions extrahieren (78 Zeilen)
- [x] CombatArena extrahieren (327 Zeilen)
- [x] CombatResult extrahieren (69 Zeilen)
- [x] CombatLog extrahieren (41 Zeilen)
- [x] index.svelte als Orchestrator (460 Zeilen)

---

## 4.2 CopyCatRoyale/index.svelte (680 Zeilen)

### Problem

Multi-Phasen-Komponente mit großer if-else-Kette für verschiedene Spielphasen.

### Lösung

```
features/CopyCatRoyale/
├── index.svelte                  # Orchestrator (Phasen-Router)
├── RoyaleInitialDrawing.svelte
├── RoyaleShowReference.svelte
├── RoyaleDrawing.svelte
├── RoyaleResults.svelte
└── RoyaleWinner.svelte
```

### Checkliste

- [x] Phasen-Komponenten erstellen
- [x] RoyaleInitialDrawing extrahieren (108 Zeilen)
- [x] RoyaleShowReference extrahieren (172 Zeilen)
- [x] RoyaleDrawing extrahieren (158 Zeilen)
- [x] RoyaleResults extrahieren (209 Zeilen)
- [x] RoyaleWinner extrahieren (218 Zeilen)
- [x] index.svelte als Phasen-Router (96 Zeilen)

---

## 4.3 ZombiePixel/ZombieGrid.svelte (677 Zeilen)

### Problem

Komplexe Grid-Logik mit 20+ Bedingungen für Spieler, Items, Effekte.

### Lösung

```
features/ZombiePixel/
├── ZombieGrid.svelte             # Grid-Canvas (reduziert)
├── ZombieGridCell.svelte         # Einzelne Zelle
├── ZombiePlayerToken.svelte      # Spieler-Darstellung
├── ZombieItemToken.svelte        # Item auf Grid
└── ZombieEffectIndicator.svelte  # Effekt-Overlays
```

### Checkliste

- [x] ZombieHUD extrahieren (217 Zeilen)
- [x] ZombieControls extrahieren (436 Zeilen)
- [x] ZombieGridLegend extrahieren (77 Zeilen)
- [x] ZombieResults extrahieren (298 Zeilen)
- [x] ZombieGrid.svelte reduzieren (322 Zeilen, von 677)

---

## 4.4 Results.svelte (675 Zeilen)

### Problem

Podium (Top 3) und Galerie (Rest) in einer Komponente vermischt.

### Lösung

```
features/
├── Results.svelte                # Orchestrator
├── ResultsPodium.svelte          # Top 3 Anzeige
├── PodiumSlot.svelte             # Einzelner Podiumsplatz
├── ResultsGallery.svelte         # Restliche Teilnehmer
└── GalleryItemCard.svelte        # Einzelne Galerie-Karte
```

### Checkliste

- [x] ResultsPodium extrahieren (52 Zeilen)
- [x] PodiumSlot extrahieren (301 Zeilen)
- [x] ResultsGallery extrahieren (103 Zeilen)
- [x] GalleryItemCard extrahieren (121 Zeilen)
- [x] Results.svelte reduzieren (264 Zeilen, von 675)

---

## 4.5 Voting.svelte (641 Zeilen)

### Problem

Große Styling-Blöcke, aber überschaubare Logik.

### Lösung (niedrigere Priorität)

```
features/
├── Voting.svelte                 # Haupt-Komponente
├── VotingContenderCard.svelte    # Links/Rechts Karte
└── VSBadge.svelte                # VS Badge
```

### Checkliste

- [x] VotingContenderCard extrahieren (207 Zeilen)
- [x] VSBadge extrahieren (109 Zeilen)
- [x] Voting.svelte reduzieren (380 Zeilen, von 641)

---

## Priorisierung

1. **CopyCatRoyale** — Klare Phasen-Trennung, hoher Nutzen
2. **Results** — Einfache Trennung Podium/Galerie
3. **ZombieGrid** — Komplexität reduzieren
4. **Combat** — Größte Komponente, aber isoliert
5. **Voting** — Niedrigste Priorität
