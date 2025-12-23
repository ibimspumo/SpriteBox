---
title: Richtlinien
description: Wie du zu SpriteBox beitragen kannst
---

## Willkommen!

SpriteBox ist ein Open-Source-Projekt und wir freuen uns über jeden Beitrag. Diese Richtlinien helfen dir, effektiv mitzuwirken.

## Verhaltenskodex

- Sei respektvoll und inklusiv
- Konstruktives Feedback geben
- Auf die Sache konzentrieren, nicht auf die Person
- Fehler anderer geduldig korrigieren

## Arten von Beiträgen

### Bugs melden

1. Prüfe ob der Bug bereits gemeldet wurde
2. Erstelle ein Issue mit:
   - Klare Beschreibung des Problems
   - Schritte zum Reproduzieren
   - Erwartetes vs. tatsächliches Verhalten
   - Browser/OS-Information

### Features vorschlagen

1. Eröffne eine Diskussion im Repository
2. Beschreibe das Feature und den Nutzen
3. Warte auf Feedback bevor du implementierst

### Code beitragen

1. Fork das Repository
2. Erstelle einen Feature-Branch
3. Schreibe sauberen, getesteten Code
4. Öffne einen Pull Request

## Code-Standards

### TypeScript

- Strikte Typisierung verwenden
- Keine `any` ohne guten Grund
- Zod für Runtime-Validierung

### Svelte

- Atomic Design-Prinzipien befolgen
- Design-Tokens verwenden
- i18n für alle sichtbaren Texte

### Commits

```
feat: neues Feature hinzufügen
fix: Bug beheben
docs: Dokumentation aktualisieren
style: Formatierung ändern
refactor: Code umstrukturieren
test: Tests hinzufügen
chore: Wartungsarbeiten
```

## Pull Request Prozess

1. **Branch erstellen**
   ```bash
   git checkout -b feature/mein-feature
   ```

2. **Änderungen machen**
   - Code schreiben
   - Tests hinzufügen
   - Dokumentation aktualisieren

3. **Lokal testen**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm dev
   ```

4. **PR öffnen**
   - Klare Beschreibung
   - Screenshots bei UI-Änderungen
   - Verlinke relevante Issues

5. **Review-Prozess**
   - Auf Feedback reagieren
   - Änderungen einarbeiten
   - Geduldig sein

## Nächste Schritte

- [Entwicklungsumgebung](/docs/de/contributing/development/) - Projekt einrichten
- [Architektur](/docs/de/architecture/overview/) - Code verstehen
