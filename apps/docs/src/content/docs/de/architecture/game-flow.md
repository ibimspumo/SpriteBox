---
title: Spielablauf
description: Phasen-System und Spielschleife
---

## Spielmodi

SpriteBox unterstützt mehrere Spielmodi mit unterschiedlichem Ablauf:

| Modus | Beschreibung | Spielerzahl |
|-------|--------------|-------------|
| `pixel-battle` | Klassisch: Prompts zeichnen, Kunstwerke bewerten | 5-100 |
| `copy-cat` | Memory: Referenzbild nachzeichnen | 2 (1v1) |
| `copy-cat-solo` | Solo Memory-Training: Bilder alleine nachzeichnen | 1 (Solo) |
| `pixel-guesser` | Pictionary: Einer zeichnet, andere raten | 2-20 |
| `pixel-survivor` | Roguelike: Zeichne um 30 Tage zu überleben | 1 (Solo) |
| `zombie-pixel` | Infektionsspiel: Zombies jagen Überlebende | 1-100 (Bots füllen) |

## Phasen-Überblick (Pixel Battle)

```
┌─────────┐    ┌───────────┐    ┌─────────┐    ┌────────┐
│  Lobby  │───>│ Countdown │───>│ Drawing │───>│ Voting │
└─────────┘    └───────────┘    └─────────┘    └────┬───┘
     ▲                                              │
     │         ┌─────────┐    ┌────────┐           │
     └─────────│ Results │<───│ Finale │<──────────┘
               └─────────┘    └────────┘
```

## Phasen-Details

### 1. Lobby
- Spieler treten bei (min. 5, max. 100)
- Host kann Spiel starten (private Räume)
- Öffentliche Räume starten automatisch

### 2. Countdown (5 Sekunden)
- Prompt wird enthüllt
- Spieler bereiten sich vor
- Kein Zeichnen möglich

### 3. Drawing (60 Sekunden)
- 8x8 Pixel-Canvas
- 16-Farben-Palette
- Zeichnung wird automatisch gesendet

### 4. Voting (2-7 Runden, je 5 Sekunden)
- Elo-basierte Paarauswahl
- Spieler wählen das bessere Bild
- Ratings werden aktualisiert

### 5. Finale (15 Sekunden)
- Top 10% treten gegeneinander an
- Letzte Abstimmungsrunde
- Finale Rankings werden berechnet

### 6. Results (10 Sekunden)
- Gewinner werden angezeigt
- Galerie aller Einreichungen
- Zurück zur Lobby

## Timing-Konfiguration

```typescript
const PHASE_TIMERS = {
  countdown: 5000,      // 5 Sekunden
  drawing: 60000,       // 60 Sekunden
  voting: 5000,         // 5 Sekunden pro Runde
  finale: 15000,        // 15 Sekunden
  results: 10000,       // 10 Sekunden
};
```

## Elo-System

### Grundformel

```
Erwarteter Score = 1 / (1 + 10^((Rb - Ra) / 400))
Neues Rating = Ra + K * (Ergebnis - Erwarteter Score)
```

### K-Faktor

- **K = 32** für normale Spieler
- Höhere K-Werte für volatile Rankings

### Paarauswahl

1. Spieler nach Rating sortieren
2. Ähnliche Ratings paaren
3. Zufällige Variation hinzufügen
4. Wiederholte Paare vermeiden

## Server-Autorität

Alle Phasenübergänge werden vom Server kontrolliert:

```typescript
// Server steuert Timing
setTimeout(() => {
  transitionToPhase('voting');
  broadcastToInstance('phase-changed', { phase: 'voting' });
}, PHASE_TIMERS.drawing);
```

## CopyCat-Modus

CopyCat ist ein 1v1 Memory-basierter Spielmodus mit anderem Phasenablauf.

### Phasenablauf

```
  LOBBY                    COUNTDOWN (5s)           MEMORIZE (5s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  2 Spieler  │  Auto    │   Bereit    │          │  Referenz-  │
  │  treten bei │ ───────► │   machen    │ ───────► │  bild wird  │
  │  (1v1)      │  start   │             │          │  gezeigt    │
  └─────────────┘          └─────────────┘          └─────────────┘
                                                           │
       ┌───────────────────────────────────────────────────┘
       │
       ▼
  DRAWING (30s)            ERGEBNIS (10s)           REVANCHE?
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  Aus dem    │          │  Genauigkeit│   Vote   │  Beide      │
  │  Gedächtnis │ ───────► │  vergleichen│ ───────► │  stimmen    │
  │  zeichnen   │          │  Sieger     │          │  ab         │
  └─────────────┘          └─────────────┘          └─────────────┘
```

### CopyCat-Phasen

| Phase | Dauer | Beschreibung |
|-------|-------|--------------|
| Lobby | Bis 2 Spieler | Sofortstart bei 2. Spieler |
| Countdown | 5 Sekunden | Spieler bereiten sich vor |
| Memorize | 5 Sekunden | Referenzbild wird gezeigt |
| Drawing | 30 Sekunden | Aus dem Gedächtnis nachzeichnen |
| Ergebnis | 10 Sekunden | Genauigkeitsvergleich |
| Revanche | 15 Sekunden | Optional: für neue Runde abstimmen |

### Genauigkeitsberechnung

```typescript
genauigkeit = (übereinstimmendePixel / gesamtPixel) × 100
// Höhere Genauigkeit gewinnt
// Bei Gleichstand: schnellere Einreichung gewinnt
```

## CopyCat Solo Modus

CopyCat Solo ist ein Einzelspieler-Übungsmodus für memory-basierte Pixelkunst-Nachzeichnung.

### CopyCat Solo Phasenablauf

```text
  LOBBY                    MEMORIZE (5s)            DRAWING (30s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  Spieler    │ Sofort   │  Referenz-  │          │  Aus dem    │
  │  tritt bei  │ ───────► │  bild wird  │ ───────► │  Gedächtnis │
  │  (Solo)     │  start   │  gezeigt    │          │  zeichnen   │
  └─────────────┘          └─────────────┘          └─────────────┘
                                                           │
       ┌───────────────────────────────────────────────────┘
       │
       ▼
  ERGEBNIS (8s)             NÄCHSTE RUNDE
  ┌─────────────┐           ┌─────────────┐
  │  Genauigkeit│  Nochmal  │  Zurück     │
  │  angezeigt  │ ─────────►│  zur Lobby  │
  │             │  spielen  │             │
  └─────────────┘           └─────────────┘
```

### CopyCat Solo Phasen

| Phase | Dauer | Beschreibung |
|-------|-------|--------------|
| Lobby | Sofort | Spiel startet sofort wenn Spieler beitritt |
| Memorize | 5 Sekunden | Referenzbild wird gezeigt |
| Drawing | 30 Sekunden | Aus dem Gedächtnis nachzeichnen |
| Ergebnis | 8 Sekunden | Genauigkeit wird angezeigt |

### Unterschiede zum 1v1 CopyCat

- **Keine Countdown-Phase**: Startet sofort
- **Kein Gegner**: In eigenem Tempo üben
- **Kürzere Ergebnis-Phase**: 8s statt 10s
- **Keine Revanche-Abstimmung**: Einfach nochmal spielen
- **Keine privaten Räume**: Solo-Modus nutzt nur öffentliche Warteschlange

## Pixel Guesser Modus

Pixel Guesser ist ein Pictionary-artiges Spiel, bei dem ein Spieler zeichnet während andere raten.

### Pixel Guesser Phasenablauf

```text
  LOBBY                    COUNTDOWN (3s)           GUESSING (45s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  2-20       │  Auto    │   Nächste   │          │  Künstler   │
  │  Spieler    │ ───────► │   Runde     │ ───────► │  zeichnet   │
  │  treten bei │  start   │   beginnt   │          │  Andere raten│
  └─────────────┘          └─────────────┘          └─────────────┘
                                                           │
       ┌───────────────────────────────────────────────────┘
       │
       ▼
  REVEAL (5s)              NÄCHSTE RUNDE?           RESULTS (15s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  Lösung +   │   Mehr   │  Zurück zu  │   Spiel  │  Finale     │
  │  Punkte     │ ───────► │  Countdown  │ ───────► │  Rangliste  │
  │             │  Runden  │             │   vorbei │             │
  └─────────────┘          └─────────────┘          └─────────────┘
```

### Pixel Guesser Phasen

| Phase | Dauer | Beschreibung |
|-------|-------|--------------|
| Lobby | Bis 2+ Spieler | Auto-Start bei Schwellenwert |
| Countdown | 3 Sekunden | Vorbereitung auf nächste Runde |
| Guessing | 45 Sekunden | Künstler zeichnet, andere raten das Wort |
| Reveal | 5 Sekunden | Lösung und Rundenpunkte anzeigen |
| Results | 15 Sekunden | Finale Rangliste nach allen Runden |

### So funktioniert's

1. **Künstler-Rotation**: Jeder Spieler ist einmal der Künstler
2. **Geheimes Prompt**: Künstler sieht ein Wort zum Zeichnen (lokalisiert EN/DE)
3. **Live-Zeichnen**: Canvas-Updates werden in Echtzeit gestreamt
4. **Raten**: Spieler tippen Vermutungen, werden gegen beide Sprachen geprüft
5. **Punkte**: Schnellere richtige Antworten = mehr Punkte

### Punktesystem

| Zeit zum Raten | Punkte |
|----------------|--------|
| Unter 10s | 100 + Positions-Bonus |
| Unter 20s | 75 + Positions-Bonus |
| Unter 30s | 50 + Positions-Bonus |
| Über 30s | 25 + Positions-Bonus |

**Positions-Bonus**: 1.: +20, 2.: +10, 3.: +5

**Künstler-Bonus**: 20% der Gesamtpunkte der Rater

## Pixel Survivor Modus

Pixel Survivor ist ein Einzelspieler-RPG, bei dem deine Pixelkunst die Stats, das Element und den Persönlichkeitszug deines Charakters bestimmt.

### Kernkonzept

- **Zeichne deinen Charakter**: Stats werden durch Pixelkunst-Eigenschaften bestimmt (Form, Farbe, Dichte)
- **Element-System**: Dominante Farben bestimmen die Element-Affinität (Feuer, Wasser, Erde, Luft, Licht, Dunkel)
- **Trait-System**: Zeichenstil bestimmt Persönlichkeitsmerkmale die das Gameplay beeinflussen
- **Engine-basiert**: Flexibles RPG-Engine mit Stats, Modifiern, Effekten und Würfelwürfen

### Pixel Survivor Phasenablauf

```text
  MENÜ                       CHARAKTER                GAMEPLAY
  ┌─────────────┐            ┌─────────────┐          ┌─────────────┐
  │  Neuer Run/ │  Start     │  Zeichne    │  Fertig  │  RPG        │
  │  Fortsetzen/│ ──────────►│  Charakter  │ ────────►│  Gameplay   │
  │  Statistik  │            │  (8x8 Grid) │          │  (Engine)   │
  └─────────────┘            └─────────────┘          └─────────────┘
        ▲                                                    │
        │                                                    │
        └────────────────── Exit / Game Over ────────────────┘
```

### Pixel Survivor Phasen

| Phase | Beschreibung |
|-------|--------------|
| Menü | Neuer Run, gespeicherten Run fortsetzen, oder Statistiken |
| Charakter | 8x8 Charakter zeichnen, Live-Stats-Vorschau |
| Gameplay | Aktives Gameplay mit erstelltem Charakter |

### Charakter-Erstellungssystem

Wenn du deinen Charakter zeichnest, analysiert die Engine die Pixelkunst in Echtzeit:

#### Stats aus Zeichnung

| Eigenschaft | Beeinflusster Stat | Funktionsweise |
|-------------|-------------------|----------------|
| Pixelanzahl | Max HP | Mehr gefüllte Pixel = mehr HP |
| Asymmetrie | Angriff | Asymmetrische Designs = höherer Angriff |
| Symmetrie | Verteidigung | Symmetrische, kompakte Designs = höhere Verteidigung |
| Dichte | Tempo | Spärliche/leichte Designs = höheres Tempo |
| Farbvielfalt | Glück | Mehr verwendete Farben = höheres Glück |

#### Element-Erkennung

Die dominanten Farben in deiner Zeichnung bestimmen deine Element-Affinität:

| Element | Farben | Stärken |
|---------|--------|---------|
| Feuer | Rot, Orange | Stark gegen Erde, schwach gegen Wasser |
| Wasser | Blau, Cyan | Stark gegen Feuer, schwach gegen Erde |
| Erde | Grün, Braun | Stark gegen Wasser, schwach gegen Luft |
| Luft | Weiß, Hellgrau | Stark gegen Erde, schwach gegen Feuer |
| Licht | Gelb, Gold | Stark gegen Dunkel |
| Dunkel | Lila, Schwarz | Stark gegen Licht |
| Neutral | Gemischt/Grau | Keine Schwächen, keine Stärken |

#### Trait-Erkennung

Dein Zeichenstil bestimmt Persönlichkeitsmerkmale:

| Trait | Erkennung | Effekt |
|-------|-----------|--------|
| Aggressiv | Hohe Asymmetrie, warme Farben | +Angriff, -Verteidigung |
| Defensiv | Hohe Symmetrie, kompakt | +Verteidigung, -Tempo |
| Flink | Geringe Dichte, spärlich | +Tempo, -HP |
| Glücklich | Hohe Farbvielfalt | +Glück, +Kritische Treffer |
| Ausgeglichen | Gleichmäßige Verteilung | Keine Boni oder Mali |
| Chaotisch | Komplexe Muster | Zufällige Stat-Variationen |

### Engine-Systeme

Das Spiel verwendet eine modulare RPG-Engine:

#### StatManager

Verwaltet alle Charakter-Stats mit Basiswerten und Modifiern:

- **Ressourcen**: HP, Mana, Schild
- **Kampf**: Angriff, Verteidigung, Tempo, Glück
- **Fortschritt**: Level, XP, XP bis nächstes Level

#### EffectProcessor

Verarbeitet Buffs, Debuffs und Statuseffekte:

- Zeitbasierte Effekte (Gift, Regeneration)
- Ausgelöste Effekte (bei Treffer, bei Kritisch)
- Stapelbare Modifier

#### DiceRoller

Verarbeitet Skill-Checks und Schadensberechnungen:

- D20-basierte Skill-Checks
- Schadenswürfe mit Modifiern
- Kritisches Treffen/Verfehlen System

### Kampfsystem

Der Gameplay-Loop dreht sich um rundenbasierte Kämpfe mit einem D20-Würfelsystem.

#### Kampfablauf

```text
  BEGEGNUNG                 SPIELERZUG               AUFLÖSUNG
  ┌─────────────┐           ┌─────────────┐          ┌─────────────┐
  │  Monster    │  Init     │  Aktion     │  Würfel  │  Schaden    │
  │  erscheint  │ ─────────►│  wählen     │ ───────► │  anwenden   │
  │             │           │             │          │             │
  └─────────────┘           └─────────────┘          └─────────────┘
                                                            │
       ┌────────────────────────────────────────────────────┘
       │
       ▼
  MONSTERZUG                PRÜFUNG                  ERGEBNIS
  ┌─────────────┐           ┌─────────────┐          ┌─────────────┐
  │  Monster    │           │  Sieg?      │   Ja     │  XP + Beute │
  │  greift an  │ ─────────►│  Niederlage?│ ───────► │  oder       │
  │             │           │  Weiter?    │          │  Game Over  │
  └─────────────┘           └─────────────┘          └─────────────┘
```

#### Kampfphasen

| Phase | Beschreibung |
|-------|--------------|
| `player_turn` | Spieler wählt eine Aktion |
| `player_rolling` | D20-Würfel-Animation |
| `player_attack` | Angriffsanimation |
| `monster_turn` | Monster-KI entscheidet |
| `monster_attack` | Monster-Angriffsanimation |
| `victory` | Spieler hat das Monster besiegt |
| `defeat` | Spieler wurde besiegt |
| `fled` | Spieler ist erfolgreich geflohen |

#### Kampfaktionen

| Aktion | Beschreibung |
|--------|--------------|
| `attack` | Basisangriff mit Stats |
| `defend` | Verteidigungshaltung (+Verteidigung) |
| `ability` | Spezialfähigkeit nutzen |
| `flee` | Fluchtversuch (40% Basischance) |

#### D20 Schadensmodifikatoren

Der D20-Wurf modifiziert den verursachten Schaden:

| Wurf | Kategorie | Schadensmodifikator |
|------|-----------|---------------------|
| 1 | Kritischer Fehlschlag | -50% Schaden |
| 2-5 | Schwach | -20% Schaden |
| 6-14 | Normal | Kein Modifikator |
| 15-19 | Gut | +20% Schaden |
| 20 | Kritischer Treffer | +50% Schaden |

#### Schadensformel

```typescript
// 1. Basisschaden (fester Wert + Eigenschaftsbonus)
// Spieler: 5 + Eigenschaftsbonus (offensiv +1, defensiv -1, utility 0)
// Monster: 5
basisSchaden = 5 + eigenschaftsBonus

// 2. D20-Modifikator anwenden
d20Modifiziert = basisSchaden × d20Multiplikator

// 3. Fähigkeits-Multiplikator anwenden (bei Spezialfähigkeit)
nachFähigkeit = d20Modifiziert × fähigkeitsMultiplikator

// 4. Angriffswert-Multiplikator anwenden (1 + angriff/100)
// Beispiele: 40 Angriff = 1.4×, 100 Angriff = 2.0×
nachAngriff = nachFähigkeit × (1 + angriffswert / 100)

// 5. Verteidigungs-Multiplikator anwenden (1 - verteidigung/100, gedeckelt)
// Verteidigung ist standardmäßig auf 50% Reduktion begrenzt
verteidigungsMultiplikator = max(0.1, 1 - min(verteidigung, 50) / 100)
nachVerteidigung = nachAngriff × verteidigungsMultiplikator

// 6. Element-Multiplikator anwenden
endSchaden = max(1, nachVerteidigung × elementMultiplikator)
```

### Monstersystem

Monster sind die primären Gegner in Pixel Survivor.

#### Monster-Eigenschaften

| Eigenschaft | Beschreibung |
|-------------|--------------|
| `element` | Feuer, Wasser, Erde, Luft, Licht, Dunkel, Neutral |
| `rarity` | common, uncommon, rare, epic, legendary, boss |
| `behavior` | aggressive, defensive, balanced, berserker, tactical |
| `size` | tiny, small, medium, large, huge |

#### Monster-Seltenheitseffekte

| Seltenheit | Spawnrate | XP-Multiplikator | Stat-Bonus |
|------------|-----------|------------------|------------|
| Common | Hoch | 1.0× | Keiner |
| Uncommon | Mittel | 1.25× | +10% |
| Rare | Niedrig | 1.5× | +25% |
| Epic | Sehr niedrig | 2.0× | +50% |
| Legendary | Selten | 3.0× | +100% |
| Boss | Geskriptet | 5.0× | +200% |

#### Zonensystem

Monster spawnen basierend auf Zonen und Rundenfortschritt:

```typescript
interface ZoneDefinition {
  id: string;           // 'forest', 'cave', 'volcano'
  startRound: number;   // Wann Zone verfügbar wird
  endRound: number;     // Wann Zone endet (-1 = unbegrenzt)
  monsterIds: string[]; // Welche Monster spawnen können
  environmentElement?: ElementType; // Element-Bonus
}
```

#### Monster-Fähigkeiten

Monster können Spezialfähigkeiten haben:

| Fähigkeitstyp | Beispiel | Effekt |
|---------------|----------|--------|
| Schaden | Biss | 1.5× Schadensmultiplikator |
| Buff | Heulen | Erhöht eigenen Angriff |
| Heilung | Regeneration | HP über Zeit wiederherstellen |
| Debuff | Gift | Schaden über Zeit verursachen |

### Technische Hinweise

- **Einzelspieler**: Läuft komplett clientseitig
- **LocalStorage**: Charakter- und Run-Daten lokal gespeichert
- **Keine Server-Räume**: Als Spielmodus registriert für Konsistenz
- **Echtzeit-Vorschau**: Stats aktualisieren sich während des Zeichnens

## Zombie Pixel Modus

Zombie Pixel ist ein Echtzeit-Infektionsspiel auf einer 50x50 Gitter-Arena. Ein Spieler startet als Zombie und muss alle Überlebenden infizieren, bevor die Zeit abläuft.

### Zombie Pixel Phasenablauf

```text
  LOBBY                    COUNTDOWN (3s)           GAMEPLAY (90s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  Spieler    │  Bots    │   Rollen    │          │  Zombies    │
  │  beitreten  │ ───────► │   zuweisen  │ ───────► │  jagen      │
  │  (1-100)    │  füllen  │             │          │  Überleb.   │
  └─────────────┘          └─────────────┘          └─────────────┘
                                                           │
       ┌───────────────────────────────────────────────────┘
       │
       ▼
  ERGEBNISSE
  ┌─────────────┐
  │  Gewinner + │
  │  Statistik  │
  └─────────────┘
```

### Zombie Pixel Phasen

| Phase | Dauer | Beschreibung |
|-------|-------|--------------|
| Lobby | Bis bereit | Bots füllen auf 100 Spieler, Auto-Start |
| Countdown | 3 Sekunden | Rollen zugewiesen, Positionen enthüllt |
| Gameplay | 90 Sekunden | Echtzeit-Bewegung und Infektion |
| Ergebnisse | 10 Sekunden | Gewinner mit Spielstatistiken angezeigt |

### So funktioniert es

1. **Bot-Auffüllung**: Lobby füllt sich mit KI-Bots bis zu 100 Spielern
2. **Rollenzuweisung**: Ein zufälliger Spieler startet als Zombie
3. **Bewegung**: 8-Richtungen via Tastatur, Touch-Joystick oder Wischen
4. **Infektion**: Zombies infizieren Überlebende durch Berührung auf dem Gitter
5. **Siegbedingung**: Letzter Überlebender gewinnt, oder Zombies gewinnen wenn alle infiziert

### Steuerung

| Eingabe | Methode |
|---------|---------|
| Tastatur | Pfeiltasten oder WASD für 8-Richtungs-Bewegung |
| Touch | Virtueller Joystick oder Wisch-Gesten |
| Gamepad | D-Pad oder linker Stick |

### Spielmechaniken

- **Gittergröße**: 50x50 Zellen
- **Sichtfeld**: 13x13 sichtbarer Bereich zentriert auf Spieler
- **Infektion**: Zombie und Überlebender auf gleicher Zelle = Infektion
- **Bewegungsrate**: Server-kontrollierte Tick-Rate (100ms)
- **Bot-KI**: Zombies jagen nächsten Überlebenden, Überlebende fliehen vor Zombies

### Technische Hinweise

- **Echtzeit**: Nutzt Socket.io für latenzarme Spielzustands-Synchronisation
- **Server-autoritativ**: Alle Bewegungen auf Server validiert
- **Bot-System**: Server-seitige KI füllt leere Plätze
- **Rate-limitiert**: Bewegungsbefehle rate-limitiert gegen Spam

## Nächste Schritte

- [Backend-Architektur](/docs/de/architecture/backend/) - Implementierungsdetails
- [Socket-Events](/docs/de/api/socket-events/) - Echtzeit-Kommunikation
