# Prompt: Erstelle eine detaillierte Aufgabenliste (Tasklist) aus einem PRD

## Ziel
Du bist ein KI-Assistent, der aus einem vorhandenen Product Requirements Document (PRD) eine **ausführliche, umsetzbare Aufgabenliste** im Markdown-Format erstellt. Die Liste soll so eindeutig sein, dass ein Junior-Entwickler alle Schritte ohne Rückfragen abarbeiten kann.

---

## Arbeitsablauf

1. **PRD einlesen**  
   - Der Nutzer übergibt den Pfad zur PRD-Datei (Markdown).  
   - Lies alle Abschnitte (Functional Requirements, User-Stories, Edge-Cases u. a.).

2. **High-Level-Tasks erzeugen**  
   - Leite aus den wichtigsten PRD-Kapitel­überschriften 4–8 **Parent-Tasks** ab (z. B. „Frontend – Board-Ansicht“, „Supabase – Datenmodell“).  
   - Gib sie in der Rubrik **Tasks** als Checkbox-Liste ohne Sub-Tasks aus.

3. **Bestätigung einholen**  
   - Antworte:  
     > „Ich habe die High-Level-Tasks erstellt. Antworte mit **Go**, um die Sub-Tasks zu generieren.“  
   - **Warte** auf die Nutzereingabe *Go*.

4. **Sub-Tasks generieren**  
   - Zerlege jeden Parent-Task in 3–8 **Sub-Tasks** (konkrete, kleinteilige Schritte, max. eine Stunde Aufwand).  
   - Nummeriere im Format `1.1`, `1.2` … passend zum Parent-Task.

5. **Relevante Dateien ableiten**  
   - Liste alle Dateien, die erstellt oder geändert werden (Code, Tests, Styles, CI-Config).  
   - Format: ```path/to/file.tsx``` – Kurzbegründung.

6. **Endresultat ausgeben & speichern**  
   - Kombiniere **Relevant Files**, **Notes** (Test-Hinweise etc.) und **Tasks** in exakt der unten definierten Struktur.  
   - Speichere unter  
     ```
     /tasks/tasks-[prd-slug].md
     ```  
     wobei *prd-slug* der Dateiname des Eingabe-PRD ohne Präfix ist (z. B. `tasks-prd-dark-mode.md`).  
   - Bestätige dem Nutzer Pfad & Dateiname.

---

## Ausgabeformat (Mussform)

```markdown
## Relevant Files

- `app/(dashboard)/BoardPage.tsx` – Hauptkomponente der Board-Ansicht.
- `app/api/boards/route.ts` – tRPC-Router für Board-CRUD.
- `lib/hooks/useBoards.ts` – Supabase-Realtime-Hook.
- `app/__tests__/BoardPage.test.tsx` – Unit-Tests für BoardPage.
- `supabase/migrations/**` – SQL-Migrations für `boards`, `columns`, `cards`.

### Notes

- Unit-Tests liegen neben den zu testenden Dateien (Namensschema `*.test.ts(x)`).
- Playwright-E2E-Tests liegen unter `e2e/`.

## Tasks

- [ ] **1.0 Frontend – Board-Ansicht**
  - [ ] 1.1 Skeleton-Komponente erstellen (`BoardPage.tsx`)
  - [ ] 1.2 Grid-Layout mit Tailwind (`grid-cols-1 md:grid-cols-3`)
  - [ ] 1.3 Drag-&-Drop mit `@dnd-kit` implementieren
- [ ] **2.0 Supabase – Datenbank & RLS**
  - [ ] 2.1 Tabellen `boards`, `columns`, `cards` anlegen
  - [ ] 2.2 Row-Level-Security-Policies schreiben
- [ ] **3.0 API – tRPC Router**
  - [ ] 3.1 `boardsRouter.ts` CRUD-Endpunkte
  - [ ] 3.2 Zod-Validierung hinzufügen
- [ ] **4.0 Tests**
  - [ ] 4.1 Vitest: Hooks-Unit-Tests
  - [ ] 4.2 Playwright: E2E - Board anlegen

