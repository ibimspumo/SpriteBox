# 04: Frontend - Große Komponenten

**Status:** Offen
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

- [ ] Combat-Verzeichnis erstellen
- [ ] CombatDiceRoll extrahieren
- [ ] CombatActions extrahieren
- [ ] CombatAnimationSequence extrahieren
- [ ] CombatResult extrahieren
- [ ] index.svelte als Orchestrator

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

- [ ] Phasen-Komponenten erstellen
- [ ] RoyaleInitialDrawing extrahieren
- [ ] RoyaleShowReference extrahieren
- [ ] RoyaleDrawing extrahieren
- [ ] RoyaleResults extrahieren
- [ ] RoyaleWinner extrahieren
- [ ] index.svelte als Phasen-Router

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

- [ ] ZombiePlayerToken extrahieren
- [ ] ZombieItemToken extrahieren
- [ ] ZombieEffectIndicator extrahieren
- [ ] ZombieGridCell extrahieren (optional)
- [ ] ZombieGrid.svelte reduzieren

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

- [ ] ResultsPodium extrahieren
- [ ] PodiumSlot extrahieren
- [ ] ResultsGallery extrahieren
- [ ] GalleryItemCard extrahieren
- [ ] Results.svelte reduzieren

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

- [ ] VotingContenderCard extrahieren
- [ ] VSBadge extrahieren (optional)
- [ ] Voting.svelte reduzieren

---

## Priorisierung

1. **CopyCatRoyale** — Klare Phasen-Trennung, hoher Nutzen
2. **Results** — Einfache Trennung Podium/Galerie
3. **ZombieGrid** — Komplexität reduzieren
4. **Combat** — Größte Komponente, aber isoliert
5. **Voting** — Niedrigste Priorität
