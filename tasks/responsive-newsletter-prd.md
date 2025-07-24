# 📄 Product Requirements Document (PRD)  
## Projekt: Responsive Newsletter Viewer  
### Ziel: Newsletter originalgetreu anzeigen (View Mode) + klare Leseansicht (Read Mode) mit GPT-Unterstützung

---

## 1. 🎯 Zielsetzung

Die Anwendung zeigt E-Mail-Newsletter an, die über [kill-the-newsletter.com](https://kill-the-newsletter.com) abonniert und per RSS-Feed als HTML abgerufen werden.  
Zwei Anzeige-Modi stehen zur Verfügung:

1. **View Mode**:  
   - Zeigt das HTML-Original möglichst originalgetreu an (wie im Mail-Client).
   - Mobilgeräte erhalten ein angepasstes, aber nicht übermäßig gestrecktes Layout.
   - Desktop-Ansicht bleibt nahe am ursprünglichen Design – keine erzwungene Breitenanpassung.
2. **Read Mode**:  
   - Zeigt die Inhalte des Newsletters als klar strukturierten Lesetext an (semantisches HTML).
   - Das Layout wird verworfen, der Fokus liegt auf Fließtext, Bildern und Links.
   - Die Transformation erfolgt automatisiert durch GPT-4 via OpenAI API beim Import.

Die zuletzt gewählte Ansicht wird **global (nicht pro Newsletter)** gespeichert (in `localStorage`), sodass neue Newsletter im bevorzugten Modus direkt angezeigt werden.

---

## 2. 🧱 Architektur & Stack

| Komponente       | Technologie              |
|------------------|--------------------------|
| Frontend         | TypeScript, Tailwind CSS |
| Backend / Parsing| Node.js (Truescript)     |
| Hosting          | Vercel                   |
| Datenbank        | Supabase (Storage + DB)  |
| LLM API          | OpenAI (GPT-4 Turbo)     |
| Import-Automatisierung | GitHub Action via RSS Feed (Kill the Newsletter) |

---

## 3. 📦 Funktionale Anforderungen

### 🧾 FR-01: HTML-Original (View Mode) anzeigen – geräteadaptiert
- Das HTML wird per RSS aus Kill-the-Newsletter geladen (z. B. `description` oder `content:encoded`) und in Supabase gespeichert.
- Das Original-HTML wird **geparst und transformiert**:
  - Ziel: Erhalt des Layouts auf Desktop
  - Mobilgeräte: keine horizontalen Scrollbars, anpassbare Bilder

#### Parsing- & Transformationstools
Verwendet wird:
- [`cheerio`](https://cheerio.js.org/) (Node.js DOM-Parser)
- ggf. zusätzlich `posthtml` für komplexere Transformationen

#### Transformationsregeln (Beispiel)
```ts
$('table').removeAttr('width').css('width', '100%');
$('img').removeAttr('width').removeAttr('height')
        .css({ maxWidth: '100%', height: 'auto', display: 'block' });
$('td, th').css('word-break', 'break-word');
```

#### Optionales CSS
```css
body {
  max-width: 100vw;
  overflow-x: hidden;
}
```

#### Einbettung in responsiven Container
Das bereinigte HTML wird in folgendem Container gerendert:
```html
<div class="newsletter-wrapper">
  <!-- transformed HTML -->
</div>
```

Mit zugehörigem CSS:
```css
.newsletter-wrapper {
  all: unset;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
  max-width: 100%;
}

.newsletter-wrapper img {
  max-width: 100%;
  height: auto;
  display: block;
}

.newsletter-wrapper table {
  width: 100%;
  border-collapse: collapse;
}
```

---

### 🧾 FR-02: Read Mode generieren (LLM)

- Beim **automatisierten Import per GitHub Action** wird der Newsletter-HTML direkt an GPT-4 übergeben.
- Das Modell wandelt das HTML in sauberes, semantisches Leselayout um (z. B. `<h2>`, `<p>`, `<img>`, `<a>`).
- Das Ergebnis wird in Supabase gespeichert als `read_mode_html`.

#### LLM-Prompt (Beispiel)
```text
Transform the following raw HTML newsletter into clean, mobile-friendly HTML content:
- Remove all layout tables, decorative images, and branding.
- Retain only main content: headings, paragraphs, images, and links.
- Group related text logically.
- Output semantic, readable HTML without inline styles.
```

---

### 🧾 FR-03: Anzeige-Modus-Umschaltung (View / Read)
- Nutzer kann über einen Toggle zwischen beiden Modi wechseln.
- Die gewählte Ansicht wird **einmalig global** im `localStorage` gespeichert:
  ```js
  localStorage.setItem('preferredNewsletterMode', 'view' | 'read');
  ```
- Beim Öffnen eines Newsletters wird dieser Modus angewendet.
- Neue Newsletter werden direkt im bevorzugten Modus angezeigt (kein manuelles Umschalten nötig).

---

### 🧾 FR-04: Fehlerhandling & Fallbacks
- Wenn GPT-Transformation fehlschlägt:
  - Zeige Hinweis im UI
  - Fallback: `sanitize-html`-basierter Clean-Modus ohne GPT
- Logging der Fehler für Developer-Review

---

## 4. 📋 Datenmodell (Supabase)

### Tabelle: `newsletters`

| Spalte           | Typ       | Beschreibung                                |
|------------------|-----------|---------------------------------------------|
| `id`             | UUID      | Primärschlüssel                             |
| `title`          | Text      | Titel der Newsletterausgabe                 |
| `source_id`      | UUID      | Referenz auf Feed/Quelle                    |
| `published_at`   | TIMESTAMP | Veröffentlichungsdatum                      |
| `raw_html`       | Text      | Original HTML aus Feed                      |
| `read_mode_html` | Text      | HTML-Version für Read Mode (LLM-generiert)  |

---

## 5. 🧠 Nichtfunktionale Anforderungen

| Kriterium         | Anforderung                                      |
|-------------------|--------------------------------------------------|
| Gerätekompatibilität | Responsive auf Smartphone, Tablet, Desktop   |
| Performance       | View Mode: schnell (DOM only), Read Mode: vorab generiert |
| Sicherheit        | Keine Ausführung von Scripts oder Styles aus fremden Quellen |
| Wiederverwendbarkeit | Alle Transformationsfunktionen modularisiert  |

---

## 6. ✅ Erfolgskriterien

| Metrik                              | Ziel                                  |
|-------------------------------------|---------------------------------------|
| Original-HTML auf Desktop ansehbar  | Layout wie im Mailclient              |
| Kein horizontales Scrollen mobil    | 100% erfüllt                          |
| Lesemodus sichtbar nach Import      | LLM-Response innerhalb von Sekunden   |
| Persistente Nutzerpräferenz         | Wird in `localStorage` erhalten       |

---

## 7. 📅 MVP-Zeitplan (Vorschlag)

| Phase              | Deliverables                         | Dauer |
|--------------------|--------------------------------------|-------|
| 1. RSS Sync        | GitHub Action + Supabase Import      | 1 Tag |
| 2. HTML-Parser     | Cheerio-basierte Transformation      | 2 Tage|
| 3. View Mode       | Wrapper + Styles + mobile Anpassung  | 1 Tag |
| 4. Read Mode (LLM) | GPT-Call, Caching, Fehlerhandling    | 2 Tage|
| 5. UI / Toggle     | Modus-Umschaltung, localStorage      | 1 Tag |
| 6. QA & Testing    | Feed-Fälle, Mobilgeräte              | 1 Tag |

---

## 8. 🔚 Erweiterungen nach MVP

- Dark Mode automatisch im Read Mode
- Tags, Extraktion von Autor & Themen durch LLM
- Notizen oder Favoriten-Funktion
- Multi-User-Unterstützung mit Supabase Auth
