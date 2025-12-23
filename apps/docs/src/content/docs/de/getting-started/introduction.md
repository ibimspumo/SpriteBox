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

| Modus | Spieler | Beschreibung |
|-------|---------|--------------|
| **Öffentlich** | 5-100 | Auto-Matchmaking mit Fremden |
| **Privat** | 5-100 | 4-Buchstaben-Raumcode, Host startet manuell |

## Nächste Schritte

- [Installationsanleitung](/docs/de/getting-started/installation/) - Entwicklungsumgebung einrichten
- [Schnellstart](/docs/de/getting-started/quick-start/) - SpriteBox lokal starten
- [Architektur-Überblick](/docs/de/architecture/overview/) - Verstehen wie es funktioniert
