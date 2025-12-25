# SpriteBox 8x8 Pixel Art Generation Guide

> **Ziel:** Diese Anleitung ermöglicht es einer KI, pixelgenaue 8x8-Grafiken im SpriteBox-Format zu generieren.

---

## Inhaltsverzeichnis

1. [Überblick und Format-Spezifikation](#1-überblick-und-format-spezifikation)
2. [Die 16-Farben-Palette](#2-die-16-farben-palette)
3. [Koordinatensystem und Encoding](#3-koordinatensystem-und-encoding)
4. [Schritt-für-Schritt Generierung](#4-schritt-für-schritt-generierung)
5. [Validierungsregeln](#5-validierungsregeln)
6. [Design-Prinzipien für 8x8 Pixel Art](#6-design-prinzipien-für-8x8-pixel-art)
7. [Referenz-Beispiele mit Erklärungen](#7-referenz-beispiele-mit-erklärungen)
8. [Thematische Farbzuordnungen](#8-thematische-farbzuordnungen)
9. [Häufige Muster und Techniken](#9-häufige-muster-und-techniken)
10. [DO's und DON'Ts](#10-dos-und-donts)
11. [Ausgabeformat](#11-ausgabeformat)
12. [Testfälle zur Selbstvalidierung](#12-testfälle-zur-selbstvalidierung)
13. [Prompt-Vorlagen für verschiedene Kategorien](#13-prompt-vorlagen-für-verschiedene-kategorien)

---

## 1. Überblick und Format-Spezifikation

### Das Zielformat

Du generierst **8x8 Pixel-Art** als **64-Zeichen Hexadezimal-String**.

```
Beispiel-Output: "1111111111221221112222111122221111122211111221111112211111111111"
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                 Genau 64 Zeichen, jedes Zeichen repräsentiert 1 Pixel
```

### Technische Spezifikation

| Eigenschaft | Wert |
|-------------|------|
| Breite | 8 Pixel |
| Höhe | 8 Pixel |
| Gesamtpixel | 64 |
| Farbtiefe | 4 Bit (16 Farben) |
| Encoding | Hexadezimal (0-9, A-F) |
| Reihenfolge | Row-Major (Zeile für Zeile, links nach rechts) |
| Case-Sensitivity | Nein (bevorzugt: GROSSBUCHSTABEN) |

---

## 2. Die 16-Farben-Palette

### Komplette Farbdefinition

```
╔═══════╦══════════╦═══════════════╦═══════════════════════════════════════════╗
║ Index ║ Hex-Code ║ Farbname      ║ Semantische Verwendung                    ║
╠═══════╬══════════╬═══════════════╬═══════════════════════════════════════════╣
║   0   ║ #000000  ║ Schwarz       ║ Konturen, Schatten, Augen, Text           ║
║   1   ║ #FFFFFF  ║ Weiß          ║ HINTERGRUND, Highlights, Wolken, Zähne    ║
║   2   ║ #FF3B30  ║ Rot           ║ Herzen, Feuer, Kirschen, Wut, Blut        ║
║   3   ║ #8B1A1A  ║ Dunkelrot     ║ Tiefe Schatten, getrocknetes Blut         ║
║   4   ║ #4CD964  ║ Grün          ║ Gras, Blätter, Schleim, Frösche           ║
║   5   ║ #2D5A27  ║ Dunkelgrün    ║ Bäume, Kakteen, Schlangen, Schatten       ║
║   6   ║ #007AFF  ║ Blau          ║ Wasser, Himmel, Traurigkeit, Augen        ║
║   7   ║ #1C2541  ║ Dunkelblau    ║ Weltraum, Nacht, tiefes Wasser            ║
║   8   ║ #FFCC00  ║ Gelb          ║ Sonne, Sterne, Münzen, Blitze, Glück      ║
║   9   ║ #FF9500  ║ Orange        ║ Feuer, Lava, Kürbisse, Sonnenuntergang    ║
║   A   ║ #A0522D  ║ Braun         ║ Holz, Erde, Pilze, Brot, Schokolade       ║
║   B   ║ #FF2D92  ║ Pink          ║ Blumen, Liebe, Freude, Süßigkeiten        ║
║   C   ║ #AF52DE  ║ Lila          ║ Magie, Edelsteine, Tränke, Mysterium      ║
║   D   ║ #5AC8FA  ║ Cyan          ║ Eis, Frost, Wasser-Highlights, Kristalle  ║
║   E   ║ #8E8E93  ║ Grau          ║ Stein, Metall, Schädel, Roboter           ║
║   F   ║ #D4A574  ║ Hautfarbe/Tan ║ Haut, Kekse, Eier, Sand, Brot             ║
╚═══════╩══════════╩═══════════════╩═══════════════════════════════════════════╝
```

### Visuelle Palette-Referenz

```
Zeile 1: ■ ■ ■ ■ ■ ■ ■ ■
         0 1 2 3 4 5 6 7

Zeile 2: ■ ■ ■ ■ ■ ■ ■ ■
         8 9 A B C D E F
```

### Wichtige Palette-Regeln

1. **Index 1 (Weiß) ist der Standard-Hintergrund** - Behandle `1` als "leerer Pixel"
2. **Index 0 (Schwarz) für Konturen** - Verwende sparsam, da sehr dominant
3. **Farben A-F sind Großbuchstaben** - Immer `A` statt `a`
4. **Maximale Farbanzahl pro Bild: 3-5** - Mehr wirkt chaotisch bei 8x8

---

## 3. Koordinatensystem und Encoding

### Das 8x8 Grid

```
       Spalte (x)
       0 1 2 3 4 5 6 7
      ┌─┬─┬─┬─┬─┬─┬─┬─┐
    0 │0│1│2│3│4│5│6│7│  ← Zeile 0 (Index 0-7)
      ├─┼─┼─┼─┼─┼─┼─┼─┤
    1 │8│9│10│11│12│13│14│15│  ← Zeile 1 (Index 8-15)
      ├─┼─┼─┼─┼─┼─┼─┼─┤
Z   2 │16│17│18│19│20│21│22│23│
e     ├─┼─┼─┼─┼─┼─┼─┼─┤
i   3 │24│25│26│27│28│29│30│31│
l     ├─┼─┼─┼─┼─┼─┼─┼─┤
e   4 │32│33│34│35│36│37│38│39│
      ├─┼─┼─┼─┼─┼─┼─┼─┤
(y) 5 │40│41│42│43│44│45│46│47│
      ├─┼─┼─┼─┼─┼─┼─┼─┤
    6 │48│49│50│51│52│53│54│55│
      ├─┼─┼─┼─┼─┼─┼─┼─┤
    7 │56│57│58│59│60│61│62│63│  ← Zeile 7 (Index 56-63)
      └─┴─┴─┴─┴─┴─┴─┴─┘
```

### Umrechnungsformeln

```
Position → Index:     index = y * 8 + x
Index → Position:     x = index % 8
                      y = index ÷ 8 (Integer-Division)

Beispiele:
- Pixel (0,0) = Index 0
- Pixel (7,0) = Index 7
- Pixel (0,1) = Index 8
- Pixel (3,4) = Index 35
- Pixel (7,7) = Index 63
```

### Encoding-Prozess (Pseudocode)

```
function encodePixelArt(grid[8][8]):
    result = ""
    for y from 0 to 7:           // Zeile für Zeile
        for x from 0 to 7:       // Spalte für Spalte
            colorIndex = grid[y][x]   // Wert 0-15
            hexChar = toHex(colorIndex)  // '0'-'F'
            result += hexChar
    return result   // 64 Zeichen
```

---

## 4. Schritt-für-Schritt Generierung

### Phase 1: Konzeptualisierung

1. **Bestimme das Motiv** (z.B. "Herz")
2. **Wähle 3-5 Hauptfarben** aus der Palette
3. **Plane die Silhouette** - was sind die wichtigsten Pixel?

### Phase 2: Grid-Skizze

Zeichne das Motiv als 8x8 Grid mit Farbindizes:

```
Beispiel: Einfaches Herz

  0 1 2 3 4 5 6 7
  ─────────────────
0 │1 1 1 1 1 1 1 1│
1 │1 1 2 2 1 2 2 1│
2 │1 2 2 2 2 2 2 1│
3 │1 2 2 2 2 2 2 1│
4 │1 1 2 2 2 2 1 1│
5 │1 1 1 2 2 1 1 1│
6 │1 1 1 1 2 1 1 1│  (Korrektur: eigentlich 2 Pixel)
7 │1 1 1 1 1 1 1 1│
```

### Phase 3: Linearisierung

Konvertiere Zeile für Zeile:

```
Zeile 0: 1 1 1 1 1 1 1 1 → "11111111"
Zeile 1: 1 1 2 2 1 2 2 1 → "11221221"
Zeile 2: 1 2 2 2 2 2 2 1 → "12222221"
...
Ergebnis: "1111111111221221122222211222222111222211111221111111211111111111"
```

### Phase 4: Validierung

```
✓ Länge = 64 Zeichen
✓ Nur 0-9 und A-F
✓ Mindestens 5 nicht-weiße Pixel (hier: ~20 rote Pixel)
```

---

## 5. Validierungsregeln

### Zwingende Anforderungen

| Regel | Beschreibung | Fehlschlag-Konsequenz |
|-------|--------------|----------------------|
| **Länge** | Exakt 64 Zeichen | Ungültiges Format |
| **Zeichensatz** | Nur `[0-9A-Fa-f]` | Parse-Fehler |
| **Minimum-Pixel** | ≥5 nicht-weiße (`1`) Pixel | Anti-AFK-Ablehnung |
| **Keine Leerzeichen** | String ohne Whitespace | Parse-Fehler |

### Validierungs-Pseudocode

```
function validate(pixels):
    if length(pixels) != 64:
        return ERROR("Muss exakt 64 Zeichen haben")

    if not matches(pixels, /^[0-9A-Fa-f]+$/):
        return ERROR("Nur Hex-Zeichen erlaubt")

    nonWhiteCount = count(pixels, char != '1')
    if nonWhiteCount < 5:
        return ERROR("Mindestens 5 nicht-weiße Pixel erforderlich")

    return SUCCESS
```

---

## 6. Design-Prinzipien für 8x8 Pixel Art

### Die Goldene Regel

> **Erkennbarkeit > Detailtreue**
>
> Bei nur 64 Pixeln muss jeder Pixel zählen. Ein erkennbares Objekt mit 3 Farben ist besser als ein unerkennbares mit 10 Farben.

### Prinzip 1: Silhouette First

```
RICHTIG: Klare Silhouette        FALSCH: Zu viele Details
┌─────────────────┐              ┌─────────────────┐
│    ████████     │              │   ▓░▒█▓░▒█      │
│  ██████████     │              │  ▓░▒█████░▒     │
│  ████████████   │              │  █▓░▒█░▒▓█▒░    │
│    ████████     │              │    ▒░▓█▓░▒      │
└─────────────────┘              └─────────────────┘
```

### Prinzip 2: Strategische Farbwahl

```
Empfohlene Farbkombinationen pro Motiv:

NATUR:       4 (Grün) + 5 (Dunkelgrün) + A (Braun) + 8 (Gelb)
WASSER:      6 (Blau) + 7 (Dunkelblau) + D (Cyan) + 1 (Weiß)
FEUER:       2 (Rot) + 9 (Orange) + 8 (Gelb) + 0 (Schwarz)
CHARAKTER:   F (Haut) + 0 (Schwarz) + 6 (Blau) + 2 (Rot)
MAGIE:       C (Lila) + B (Pink) + D (Cyan) + 1 (Weiß)
```

### Prinzip 3: Anti-Aliasing bei 8x8 vermeiden

```
FALSCH: Versuch von Anti-Aliasing    RICHTIG: Harte Kanten
┌─────────────────┐                  ┌─────────────────┐
│      ░▒█        │                  │      ██         │
│    ░▒█████      │                  │    ████         │
│   ▒█████████    │                  │   ██████        │
└─────────────────┘                  └─────────────────┘
```

### Prinzip 4: Symmetrie nutzen

```
Symmetrische Motive sind bei 8x8 leichter erkennbar:

Vertikal symmetrisch:    Horizontal symmetrisch:
    ▪▪  ▪▪                 ▪▪▪▪▪▪▪▪
    ▪▪▪▪▪▪                 ▪▪▪▪▪▪▪▪
    ▪▪▪▪▪▪
    ▪▪  ▪▪
```

### Prinzip 5: Kontrast für Lesbarkeit

```
SCHLECHT: Niedriger Kontrast        GUT: Hoher Kontrast
(Dunkelgrün auf Grün)               (Schwarz auf Gelb)
┌─────────────────┐                 ┌─────────────────┐
│  ████████████   │                 │  ░░░░░░░░░░░░   │
│  ██ Kaum  ███   │                 │  ░░ KLAR ░░░░   │
│  ██sichtbar██   │                 │  ░░sichtbar░░   │
│  ████████████   │                 │  ░░░░░░░░░░░░   │
└─────────────────┘                 └─────────────────┘
```

---

## 7. Referenz-Beispiele mit Erklärungen

### Beispiel 1: Herz

```
Visuelle Darstellung:
  0 1 2 3 4 5 6 7
  ─────────────────
0 │· · · · · · · ·│
1 │· · 2 2 · 2 2 ·│
2 │· 2 2 2 2 2 2 ·│
3 │· 2 2 2 2 2 2 ·│
4 │· · 2 2 2 2 · ·│
5 │· · · 2 2 · · ·│
6 │· · · · 2 · · ·│
7 │· · · · · · · ·│

Legende: · = 1 (Weiß), 2 = Rot

HEX-STRING: "1111111111221221112222111122221111122211111221111112211111111111"

Verwendete Farben: 1 (Weiß), 2 (Rot)
Nicht-weiße Pixel: ~18 ✓
```

### Beispiel 2: Smiley

```
Visuelle Darstellung:
  0 1 2 3 4 5 6 7
  ─────────────────
0 │· 8 8 8 8 8 8 ·│
1 │8 · · · · · · 8│
2 │8 · 0 · · 0 · 8│
3 │8 · · · · · · 8│
4 │8 · · · · · · 8│
5 │8 · 2 · · 2 · 8│
6 │8 · · 2 2 · · 8│
7 │· 8 8 8 8 8 8 ·│

Legende: · = 1 (Weiß), 8 = Gelb, 0 = Schwarz, 2 = Rot

HEX-STRING: "1888888881111118810110188111111881111118812112188112211818888881"

Verwendete Farben: 1, 8, 0, 2
Nicht-weiße Pixel: ~30 ✓
```

### Beispiel 3: Stern

```
Visuelle Darstellung:
  0 1 2 3 4 5 6 7
  ─────────────────
0 │· · · 8 · · · ·│
1 │· · · 8 8 · · ·│
2 │· · 8 8 8 8 · ·│
3 │8 8 8 8 8 8 8 8│
4 │· 8 8 8 8 8 8 ·│
5 │· · 8 8 8 8 · ·│
6 │· 8 8 · · 8 8 ·│
7 │8 8 · · · · 8 8│

HEX-STRING: "1118111111188111118888818888888818888881118888111881188188111188"

Verwendete Farben: 1 (Weiß), 8 (Gelb)
Nicht-weiße Pixel: ~32 ✓
```

### Beispiel 4: Geist (Ghost)

```
Visuelle Darstellung:
  0 1 2 3 4 5 6 7
  ─────────────────
0 │· · · · · · · ·│
1 │· · · · · · · ·│
2 │· · · F F · · ·│
3 │· · F F F F · ·│
4 │· F · · F · · ·│
5 │· F F F F F F ·│
6 │· F · F · F · ·│
7 │· F · F · F · ·│

Legende: · = 1 (Weiß), F = Tan/Hautfarbe

HEX-STRING: "1111111111111111111FF11111FFFF111F11F1111FFFFFF11F1F1F111F1F1F1"

Verwendete Farben: 1 (Weiß), F (Tan)
Nicht-weiße Pixel: ~22 ✓
```

### Beispiel 5: Baum

```
Visuelle Darstellung:
  0 1 2 3 4 5 6 7
  ─────────────────
0 │· · · 4 4 · · ·│
1 │· · 4 4 4 4 · ·│
2 │· 4 4 4 4 4 4 ·│
3 │4 4 4 4 4 4 4 4│
4 │· · · A A · · ·│
5 │· · · A A · · ·│
6 │· · · A A · · ·│
7 │· · A A A A · ·│

Legende: · = 1 (Weiß), 4 = Grün, A = Braun

HEX-STRING: "1114411111444411144444444444444411AA11111AA111111AA111111AAAA11"

Verwendete Farben: 1, 4, A
Nicht-weiße Pixel: ~30 ✓
```

---

## 8. Thematische Farbzuordnungen

### Emotionen

| Emotion | Primärfarbe | Sekundärfarbe | Beispiel-Motiv |
|---------|-------------|---------------|----------------|
| Glücklich | 8 (Gelb) | B (Pink) | Smiley, Sonne |
| Traurig | 6 (Blau) | 7 (Dunkelblau) | Träne, Regen |
| Wütend | 2 (Rot) | 3 (Dunkelrot) | Flamme, Blitz |
| Liebe | 2 (Rot) | B (Pink) | Herz |
| Angst | 7 (Dunkelblau) | C (Lila) | Geist, Schatten |

### Natur

| Element | Farbpalette |
|---------|-------------|
| Wald | 4, 5, A (Grün, Dunkelgrün, Braun) |
| Ozean | 6, 7, D, 1 (Blau, Dunkelblau, Cyan, Weiß) |
| Wüste | F, 8, 9, A (Tan, Gelb, Orange, Braun) |
| Himmel | 6, D, 1, 8 (Blau, Cyan, Weiß, Gelb) |
| Feuer | 2, 9, 8, 0 (Rot, Orange, Gelb, Schwarz) |
| Eis | D, 6, 1, 7 (Cyan, Blau, Weiß, Dunkelblau) |

### Objekte

| Kategorie | Typische Farben |
|-----------|-----------------|
| Essen | F, 9, 8, 2, 4 (Tan, Orange, Gelb, Rot, Grün) |
| Werkzeuge | E, A, 0, 8 (Grau, Braun, Schwarz, Gelb) |
| Schätze | 8, 9, C, D (Gelb, Orange, Lila, Cyan) |
| Kleidung | Variabel, oft 6, 2, 4 + 0 für Konturen |

### Charaktere

| Charakter-Element | Empfohlene Farben |
|-------------------|-------------------|
| Haut | F (Tan), 9 (dunkler), oder stilisiert |
| Augen | 0 (Schwarz), 6 (Blau), 4 (Grün) |
| Haare | 0, A, 8, 9, 2 |
| Mund | 2 (Rot), B (Pink) |

---

## 9. Häufige Muster und Techniken

### Muster 1: Zentrierung (für Icons)

```
Zentriertes Motiv in 6x6 Kernbereich:

  0 1 2 3 4 5 6 7
0 │· · · · · · · ·│  ← Rand
1 │· X X X X X X ·│
2 │· X X X X X X ·│
3 │· X X X X X X ·│  ← Kern (6x6)
4 │· X X X X X X ·│
5 │· X X X X X X ·│
6 │· X X X X X X ·│
7 │· · · · · · · ·│  ← Rand
```

### Muster 2: Kreuz-Form

```
Kreuz für Plus, Medizin, Zielkreuz:

  0 1 2 3 4 5 6 7
0 │· · · X · · · ·│
1 │· · · X · · · ·│
2 │· · · X · · · ·│
3 │X X X X X X X X│
4 │X X X X X X X X│
5 │· · · X · · · ·│
6 │· · · X · · · ·│
7 │· · · X · · · ·│
```

### Muster 3: Diagonale Symmetrie

```
Diagonale für Blitze, Pfeile:

  0 1 2 3 4 5 6 7
0 │X · · · · · · ·│
1 │X X · · · · · ·│
2 │· X X · · · · ·│
3 │· · X X · · · ·│
4 │· · · X X · · ·│
5 │· · · · X X · ·│
6 │· · · · · X X ·│
7 │· · · · · · X X│
```

### Muster 4: Rahmen

```
Rahmen für Boxen, Fenster, Spiegel:

  0 1 2 3 4 5 6 7
0 │X X X X X X X X│
1 │X · · · · · · X│
2 │X · · · · · · X│
3 │X · · · · · · X│
4 │X · · · · · · X│
5 │X · · · · · · X│
6 │X · · · · · · X│
7 │X X X X X X X X│
```

### Muster 5: Schattierung (2-Farben-Depth)

```
Objekt mit Schatten für 3D-Effekt:

Hauptfarbe: X
Schatten: S (dunklere Variante)

  0 1 2 3 4 5 6 7
0 │· X X X X · · ·│
1 │X X X X X X · ·│
2 │X X X X X X · ·│
3 │X X X X X X S ·│
4 │· X X X X S S ·│
5 │· · S S S S · ·│
```

---

## 10. DO's und DON'Ts

### DO's (Mach das!)

#### Format und Validierung

✅ **Generiere IMMER exakt 64 Zeichen**
```
RICHTIG: "1111111111111111111111111111111111111111111111111111111111111111"
FALSCH:  "111111111111111111111111111111111111111111111111111111111111111"  (63)
FALSCH:  "11111111111111111111111111111111111111111111111111111111111111111" (65)
```

✅ **Verwende IMMER Großbuchstaben für A-F**
```
RICHTIG: "111AAAA111FFFF11"
FALSCH:  "111aaaa111ffff11"
```

✅ **Halte den String ohne Leerzeichen, Zeilenumbrüche oder Trennzeichen**
```
RICHTIG: "1111111111221221..."
FALSCH:  "1111 1111 1122 1221..."
FALSCH:  "11111111\n11221221..."
```

✅ **Platziere mindestens 5 nicht-weiße Pixel**
```
MINIMUM: 5 Pixel mit Wert != '1'
EMPFOHLEN: 15-40 Pixel für erkennbare Motive
```

#### Design

✅ **Wähle 3-5 Farben pro Motiv**
```
GUT: Herz mit 2 (Rot) + 1 (Weiß) = 2 Farben
GUT: Baum mit 4 (Grün) + A (Braun) + 1 (Weiß) = 3 Farben
OKAY: Charakter mit 5 Farben
```

✅ **Priorisiere Erkennbarkeit über Detailtreue**
```
BESSER: Einfache, klare Form
SCHLECHTER: Viele Details, die bei 8x8 verwischen
```

✅ **Nutze Symmetrie, wenn möglich**
```
Symmetrische Formen sind bei niedriger Auflösung leichter erkennbar
```

✅ **Verwende semantisch passende Farben**
```
Sonne → 8 (Gelb)
Wasser → 6 (Blau)
Gras → 4 (Grün)
```

✅ **Lasse Rand-Pixel oft weiß für "Atmung"**
```
BESSER: 1 Pixel weißer Rand um das Motiv
```

---

### DON'Ts (Vermeide das!)

#### Format und Validierung

❌ **NIEMALS weniger oder mehr als 64 Zeichen**
```
FALSCH: Jede Länge != 64
```

❌ **NIEMALS ungültige Zeichen**
```
FALSCH: "111G111H" (G und H sind keine Hex-Zeichen)
FALSCH: "111 111" (Leerzeichen)
FALSCH: "111.111" (Punkt)
```

❌ **NIEMALS nur weiße Pixel (oder weniger als 5 nicht-weiße)**
```
FALSCH: "1111111111111111111111111111111111111111111111111111111111111111"
        → 0 nicht-weiße Pixel, wird abgelehnt
```

❌ **NIEMALS Zeilenumbrüche oder Formatierung im String**
```
FALSCH:
"11111111
 11221221
 ..."
```

#### Design

❌ **NIEMALS mehr als 6-7 Farben verwenden**
```
FALSCH: Alle 16 Farben in einem Bild → chaotisch und unerkennbar
```

❌ **NIEMALS Anti-Aliasing oder Farbverläufe versuchen**
```
FALSCH: Versuchen, weiche Übergänge mit vielen ähnlichen Farben zu simulieren
Bei 8x8 funktioniert das nicht
```

❌ **NIEMALS zu viele Details**
```
FALSCH: Gesicht mit Augenbrauen, Wimpern, Pupillen, Nase, Lippen, Zähne
RICHTIG: Gesicht mit Augen (2 Pixel) + Mund (2-4 Pixel)
```

❌ **NIEMALS Text mit mehr als 1-2 Buchstaben**
```
FALSCH: "HELLO" in 8x8 → unlesbar
OKAY: "HI" oder einzelne Symbole
```

❌ **NIEMALS komplexe Szenen**
```
FALSCH: Landschaft mit Haus, Baum, Sonne und Person
RICHTIG: EIN Motiv pro Bild (nur Haus, oder nur Baum)
```

❌ **NIEMALS Farbe 0 (Schwarz) für große Flächen**
```
FALSCH: Schwarzer Hintergrund mit kleinem Motiv
RICHTIG: Weiß (1) als Hintergrund, Schwarz nur für Konturen
```

---

## 11. Ausgabeformat

### Standard-Ausgabe

Wenn du nach einem Pixel-Art gefragt wirst, antworte IMMER in diesem Format:

```
MOTIV: [Name des Motivs]
FARBEN: [Liste der verwendeten Farbindizes mit Namen]
PIXEL-STRING: "[64-stelliger Hex-String]"
```

### Beispiel-Ausgabe

```
MOTIV: Roter Apfel
FARBEN: 1 (Weiß), 2 (Rot), 4 (Grün), A (Braun)
PIXEL-STRING: "1111111111444111122222211222222112222221112222111112A111111A1111"
```

### Bei mehreren Varianten

```
MOTIV: Stern
VARIANTE 1 (Simpel, 2 Farben):
FARBEN: 1 (Weiß), 8 (Gelb)
PIXEL-STRING: "1118111111188111118888818888888818888881118888111881188188111188"

VARIANTE 2 (Mit Kontur, 3 Farben):
FARBEN: 1 (Weiß), 8 (Gelb), 9 (Orange)
PIXEL-STRING: "1118111111198911119889919988889919889891119889111991199199111199"
```

---

## 12. Testfälle zur Selbstvalidierung

### Teste deine Ausgabe mit diesen Prüfungen

#### Test 1: Längenprüfung

```
input = dein_pixel_string
assert len(input) == 64, "FEHLER: Nicht 64 Zeichen"
```

#### Test 2: Zeichensatzprüfung

```
valid_chars = set("0123456789ABCDEF")
for char in input:
    assert char in valid_chars, f"FEHLER: Ungültiges Zeichen '{char}'"
```

#### Test 3: Minimum-Pixel-Prüfung

```
non_white = sum(1 for char in input if char != '1')
assert non_white >= 5, f"FEHLER: Nur {non_white} nicht-weiße Pixel (min. 5)"
```

#### Test 4: Plausibilitätsprüfung

```
# Jede Zeile sollte mit Index 0-7, 8-15, ... beginnen
for row in range(8):
    row_start = row * 8
    row_data = input[row_start:row_start+8]
    # Prüfe, ob Zeile genau 8 Zeichen hat
    assert len(row_data) == 8, f"FEHLER: Zeile {row} hat nicht 8 Zeichen"
```

### Validierungstabelle für schnelle Checks

| Eigenschaft | Erwarteter Wert | Fehlerbehebung |
|-------------|-----------------|----------------|
| Länge | 64 | Zähle Zeichen, füge '1' hinzu/entferne |
| Kleinbuchstaben | 0 | Konvertiere zu Großbuchstaben |
| Ungültige Zeichen | 0 | Ersetze durch '1' |
| Nicht-weiße Pixel | ≥5 | Füge mehr farbige Pixel hinzu |
| Leerzeichen | 0 | Entferne alle Whitespace |

---

## 13. Prompt-Vorlagen für verschiedene Kategorien

### Kategorie: Tiere

```
AUFGABE: Erstelle ein 8x8 Pixel-Art von [TIER].

RICHTLINIEN:
- Fokussiere auf die erkennbarsten Merkmale des Tieres
- Verwende maximal 4 Farben
- Die Silhouette muss klar erkennbar sein
- Bei Tieren mit Gesicht: Augen = 2 schwarze Pixel

FARB-VORSCHLÄGE:
- Fell/Körper: F (Tan), A (Braun), E (Grau)
- Augen: 0 (Schwarz)
- Akzente: Je nach Tier

BEISPIEL-OUTPUT:
MOTIV: [Tier]
FARBEN: [Liste]
PIXEL-STRING: "[64 Zeichen]"
```

### Kategorie: Essen

```
AUFGABE: Erstelle ein 8x8 Pixel-Art von [ESSEN].

RICHTLINIEN:
- Zeige das Essen von der erkennbarsten Perspektive
- Typische Essen-Farben: F (Tan/Brot), 2 (Rot/Tomaten), 8 (Gelb/Käse), 4 (Grün/Salat)
- Vereinfache komplexe Speisen auf ihre Hauptbestandteile

FARB-VORSCHLÄGE:
- Brot/Teig: F, 9
- Früchte: 2, 4, 9, 8
- Fleisch: 3, A
- Gemüse: 4, 5

BEISPIEL-OUTPUT:
MOTIV: [Essen]
FARBEN: [Liste]
PIXEL-STRING: "[64 Zeichen]"
```

### Kategorie: Natur-Elemente

```
AUFGABE: Erstelle ein 8x8 Pixel-Art von [NATUR-ELEMENT].

RICHTLINIEN:
- Nutze die passenden Natur-Farbpaletten
- Bei dynamischen Elementen (Feuer, Wasser): Suggeriere Bewegung durch Form
- Wolken, Berge, Bäume sollten ikonisch vereinfacht sein

FARB-VORSCHLÄGE:
- Feuer: 8, 9, 2 (Gelb→Orange→Rot von innen nach außen)
- Wasser: D, 6, 7 (Cyan→Blau→Dunkelblau für Tiefe)
- Erde: A, 5, 4 (Braun→Dunkelgrün→Grün)

BEISPIEL-OUTPUT:
MOTIV: [Element]
FARBEN: [Liste]
PIXEL-STRING: "[64 Zeichen]"
```

### Kategorie: Emojis/Symbole

```
AUFGABE: Erstelle ein 8x8 Pixel-Art von [EMOJI/SYMBOL].

RICHTLINIEN:
- Symbole sollten zentriert sein
- Nutze maximal 2-3 Farben für Klarheit
- Standard-Emoji-Farben als Referenz nehmen

FARB-VORSCHLÄGE:
- Gesichter: 8 (Gelb) + 0 (Augen/Mund)
- Herzen: 2 (Rot) oder B (Pink)
- Sterne: 8 (Gelb)
- Gesten: F (Haut)

BEISPIEL-OUTPUT:
MOTIV: [Symbol]
FARBEN: [Liste]
PIXEL-STRING: "[64 Zeichen]"
```

### Kategorie: Fantasy/Magie

```
AUFGABE: Erstelle ein 8x8 Pixel-Art von [FANTASY-OBJEKT].

RICHTLINIEN:
- Magische Elemente: C (Lila), B (Pink), D (Cyan) für Magie
- Schätze: 8 (Gold), D (Diamant), C (Amethyst)
- Monster: Übertriebene Features für Erkennbarkeit

FARB-VORSCHLÄGE:
- Tränke: C, 4, 2 (Lila, Grün, Rot)
- Schwerter: E (Klinge), A (Griff), 8 (Gold-Akzente)
- Kristalle: D, C, B

BEISPIEL-OUTPUT:
MOTIV: [Fantasy-Objekt]
FARBEN: [Liste]
PIXEL-STRING: "[64 Zeichen]"
```

---

## Anhang A: Schnell-Referenz-Karte

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPRITEPOINT 8x8 CHEAT SHEET                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PALETTE:                                                       │
│  0=Schwarz  1=Weiß    2=Rot     3=DunkelRot                     │
│  4=Grün     5=DGrün   6=Blau    7=DBlau                         │
│  8=Gelb     9=Orange  A=Braun   B=Pink                          │
│  C=Lila     D=Cyan    E=Grau    F=Hautfarbe                     │
│                                                                 │
│  FORMAT: 64 Hex-Zeichen, Row-Major, Großbuchstaben              │
│                                                                 │
│  MINIMUM: 5 nicht-weiße Pixel                                   │
│                                                                 │
│  GRID:                                                          │
│  Index = y*8 + x                                                │
│  (0,0)=0  (7,0)=7  (0,7)=56  (7,7)=63                           │
│                                                                 │
│  FARBEN PRO BILD: 3-5 (nie mehr als 7)                          │
│                                                                 │
│  OUTPUT: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
│          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
│          Zeile0    Zeile1    Zeile2    ...    Zeile7            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Anhang B: Häufige Fehler und Lösungen

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| "Länge != 64" | Pixel vergessen/überzählig | Zeile für Zeile prüfen (8 Zeichen pro Zeile) |
| "Ungültiges Zeichen" | Kleinbuchstaben, G-Z, Sonderzeichen | Nur 0-9 und A-F verwenden |
| "Zu wenig Pixel" | Nur 1-4 nicht-weiße | Mehr farbige Details hinzufügen |
| "Motiv unerkennbar" | Zu viele Details | Vereinfachen, auf Silhouette fokussieren |
| "Farben chaotisch" | Zu viele/unpassende Farben | Auf 3-5 semantisch passende beschränken |
| "Falsche Reihenfolge" | Column-Major statt Row-Major | Erst x (0-7), dann nächste Zeile |

---

## Anhang C: Beispiel-Galerie

### Natur
```
Sonne:    "1118811111888811188888881888888818888888118888111188811111181111"
Wolke:    "1111111111111111111111111166611116666661116666611111111111111111"
Regen:    "1161161111111111111111111666666116666661116611611166116111611611"
Blume:    "111BB111111BB11111BBBB111B44B1111144111111441111114AA41111AAAA11"
```

### Tiere
```
Katze:    "1110011111100111111111110110011011011011101111011011110111111111"
Vogel:    "1111111111111111111110111110001111000011100111111001111111111111"
Fisch:    "1111111111166111116666111666661116666611116611111111111111111111"
```

### Objekte
```
Haus:     "1112211111222211112222111AAAAAA1A1AA1AA1A1AA1AA1AAAAAAAA1AAAAAA1"
Münze:    "1188881118888881888888818888888188888881888888811888881111888811"
Schwert:  "111E111111E111111E111111E1111111E111111EEE11111A111111AA1111111"
```

### Emotionen
```
Glücklich: "1888888181111118810110188111111881111118812112188112211818888881"
Traurig:   "1666666161111116610110166111111661221166612112166116611616666661"
Wütend:    "1222222121111112210110122111111221111122211112221111112212222221"
```

---

**Ende der Dokumentation**

*Diese Anleitung wurde für die Generierung von SpriteBox-kompatiblen 8x8 Pixel-Art-Grafiken erstellt.*
