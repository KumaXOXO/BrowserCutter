# Wichtige Regeln

- Vermeide wann immer möglich die Duplizierung von Code – das bedeutet, dass du prüfen solltest, ob es bereits ähnliche Funktionalitäten in anderen Teilen des Codes gibt

- Sei sorgfältig und nimm nur Änderungen vor, die angefordert wurden oder bei denen du sicher bist, dass sie gut verstanden sind und zur Änderung passen

- Wenn du einen Fehler behebst, führe keine neuen Muster oder Technologien ein, bevor du nicht alle Optionen der bestehenden Implementierung ausgeschöpft hast. Und wenn du es doch tust, stelle sicher, dass du die alte Implementierung danach entfernst, damit wir keine doppelte Logik haben

- Halte den Code sauber und gut organisiert

- Vermeide es, Skripte in Dateien zu schreiben, wenn möglich – besonders wenn das Skript wahrscheinlich nur einmal ausgeführt wird

- Refaktoriere wenn es sinnvoll ist

- Schreibe Code und Kommentare immer auf Englisch und verwende keine Emogjis außer es wird ausdrücklich gefordert

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health