---
title: Einführung
description: Was ist SpriteBox und warum wurde es entwickelt?
---

SpriteBox ist ein **kostenloses, browserbasiertes Multiplayer-Spiel**, bei dem du basierend auf kreativen Prompts um die beste 8x8 Pixel Art konkurrierst. Stell dir *Gartic Phone* vor, kombiniert mit *Pixel Art* und einem kompetitiven Elo-basierten Ranking-System.

## Kernphilosophie

- **100% Open Source** - MIT-lizenziert, alles einsehbar und änderbar
- **Keine externe Datenbank** - Alle Daten leben im Arbeitsspeicher
- **Keine Secrets nötig** - Zero-Configuration-Deployment
- **Ein Befehl zum Starten** - `pnpm dev` und du bist live

## Tech-Stack

| Ebene | Technologie | Zweck |
|-------|-------------|-------|
| **Frontend** | Svelte 5 + Vite | Reaktive UI mit winzigen Bundles |
| **Backend** | Node.js + Express | HTTP-Server + statische Dateien |
| **Echtzeit** | Socket.io | WebSocket-Kommunikation |
| **Validierung** | Zod | Runtime-Typsicherheit |
| **Kompression** | LZ-String | Effizienter Transfer großer Galerien |
| **Paketmanager** | pnpm | Schnelles Monorepo-Management |

## Spielmodi

SpriteBox bietet **4 einzigartige Spielmodi**:

| Modus | Spieler | Beschreibung |
|-------|---------|--------------|
| **Pixel Battle** | 5-100 | Klassischer Modus: Prompts zeichnen, Elo-basierte Abstimmung |
| **CopyCat** | 2 (1v1) | Gedächtnisduell: Referenzbild merken und nachzeichnen |
| **Pixel Guesser** | 2-20 | Pictionary-Stil: Einer zeichnet, andere raten das Wort |
| **Pixel Survivor** | 1 (solo) | Roguelike: Charakter zeichnen und 30 Tage überleben |

Jeder Modus unterstützt **öffentliches Matchmaking** oder **private Räume** (4-Buchstaben-Codes).

## Nächste Schritte

- [Installationsanleitung](/docs/de/getting-started/installation/) - Entwicklungsumgebung einrichten
- [Schnellstart](/docs/de/getting-started/quick-start/) - SpriteBox lokal starten
- [Architektur-Überblick](/docs/de/architecture/overview/) - Verstehen wie es funktioniert
