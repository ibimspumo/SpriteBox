---
title: Schnellstart
description: SpriteBox in 2 Minuten starten
---

## Entwicklungsserver

```bash
# Beide Server starten
pnpm dev
```

Öffne http://localhost:5173 in deinem Browser.

## Erstes Spiel spielen

1. **Namen eingeben** - Wähle einen Anzeigenamen
2. **Raum beitreten** - "Öffentlich spielen" für automatisches Matchmaking
3. **Warte auf Spieler** - Mindestens 5 Spieler werden benötigt
4. **Zeichne!** - Du hast 60 Sekunden um deinen Prompt zu zeichnen
5. **Abstimmen** - Bewerte die Kunstwerke anderer Spieler
6. **Ergebnisse** - Sieh wer gewonnen hat!

## Privaten Raum erstellen

1. Klicke auf "Raum erstellen"
2. Wähle einen optionalen Raumnamen
3. Setze ein optionales Passwort
4. Teile den 4-Buchstaben-Code mit Freunden
5. Starte das Spiel wenn alle bereit sind

## Verfügbare Befehle

```bash
# Entwicklung
pnpm dev          # Beide Server starten
pnpm dev:web      # Nur Frontend
pnpm dev:server   # Nur Backend

# Produktion
pnpm build        # Produktions-Build
pnpm start        # Produktions-Server starten

# Qualität
pnpm lint         # ESLint ausführen
pnpm typecheck    # TypeScript-Prüfung
```

## Nächste Schritte

- [Spielablauf](/docs/de/architecture/game-flow/) - Verstehe wie das Spiel funktioniert
- [Socket-Events](/docs/de/api/socket-events/) - Echtzeit-Kommunikation erkunden
