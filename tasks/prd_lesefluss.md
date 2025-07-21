# Newsletter‑Reader Webapp (Email‑to‑RSS): Lesefluss

## 1. Überblick

"Lesefluss" ist eine eine progressive Web‑App (PWA), die E‑Mail‑Newsletter mithilfe von _kill‑the‑newsletter.com_ (KTLN) automatisch in RSS‑Feeds umwandelt, sammelt und wie ein klassischer Feed‑Reader darstellt. Nutzer:innen behalten so eine aufgeräumte Inbox, können Ausgaben offline lesen und komfortabel verwalten.

## 2. Ziele

- **G1** Eliminierung von Newsletter‑Clutter in der persönlichen E‑Mail‑Inbox.
- **G2** Schneller, mobiler Zugriff auf alle Newsletter in einem einheitlichen Feed.
- **G3** Persistente Archivierung & Volltext‑Suche aller abonnierten Ausgaben.
- **G4** Nahtlose, barrierefreie UX (WCAG 2.1 AA) mit PWA‑Funktionalität.

## 3. Erfolgskriterien / KPIs

| KPI                                                 | Zielwert                 |
| --------------------------------------------------- | ------------------------ |
| Onboarding‑Completion‑Rate (Newsletter hinzugefügt) | ≥ 85 %                   |
| Ø Zeit bis „Inbox Zero“ nach Einrichtung            | ≤ 5 Min.                 |
| Wöchentliche Aktive Nutzer (WAU)                    | ≥ 30 % der Registrierten |
| Sync‑Fehlerquote pro Feed‑Abruf                     | ≤ 0.5 %                  |

## 4. Zielgruppe & Use‑Cases

### 4.1 Personas

| Persona                                         | Bedarf                         | Schmerzpunkt                                         |
| ----------------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| _Ingrid Inbox‑Zero_<br>32 J., Content‑Strategin | Ordnung ohne Newsletter‑Spam   | Newsletter verstopfen Mail‑Client & Mobile‑Data      |
| _Thomas Tech‑Reader_<br>24 J., CS‑Student       | Offline‑Lesen & Volltext‑Suche | Mehrere Geräte, schlechte Mobil‑UX vieler Newsletter |
| _Anna Archivarin_<br>41 J., Research‑Analystin  | Langanhaltender Zugriff & Tags | Newsletter‑Ausgaben verschwinden aus Feeds           |

### 4.2 User‑Stories

- Als **Mobile‑User** möchte ich _Newsletter per Klick importieren_, um sie außerhalb meiner Inbox zu lesen.
- Als **Leser** möchte ich _Ausgaben als Favorit markieren_, um sie später schneller wiederzufinden.
- Als **Power‑User** möchte ich _Newsletter löschen können_, um meine Abos aktuell zu halten.

## 5. Funktionale Anforderungen

1. Das System **MUSS** den Import‑Flow via KTLN unterstützen (E‑Mail‑Adresse generieren → Feed‑URL speichern).
2. Das System **MUSS** RSS‑/Atom‑Feeds zyklisch abrufen, Einträge deduplizieren und persistieren.
3. Das System **MUSS** Einträge als _gelesen_, _favorisiert_ oder _archiviert_ markieren können.
4. Das System **MUSS** Offline‑Lesen per Service‑Worker (Cache + IndexedDB) erlauben.
5. Das System **MUSS** Responsiveness sicherstellen (≤250 ms TTI auf 3G‑Netz, Lighthouse PWA ≥90).
6. Das System **MUSS** Supabase‑Auth (Email, GitHub) verwenden und RLS‑Policies pro User durchsetzen.
7. Das System **SOLL** Realtime‑Updates (Postgres Changes) für neue Einträge liefern.
8. Das System **SOLL** Barrierefreiheit nach WCAG 2.1 AA erfüllen (u. a. Tastatur‑Navigation, ARIA‑Labels).

## 6. Nicht‑Ziele / Out‑of‑Scope

- KI‑Gestützte Zusammenfassungen oder Text‑to‑Speech (Post‑MVP).
- Native iOS/Android‑Apps (PWA ausreichend für MVP).
- Import / Sync generischer OPML‑Dateien (nach MVP).

## 7. UX / Design

- Mobile‑first Layout, umgesetzt in TailwindCSS + shadcn/ui, Farben über Design‑Tokens.
- Gesten: Swipe‑Links → „Gelesen“, Swipe‑Rechts → „Favorit“.
- Dark‑/Light‑Mode via `class="dark"` Toggle.
- Großzügige Typografie (16 px Basis, 1.5 line‑height) für Lesbarkeit.
- Figma‑Link: _wird in Ticket #UX‑42 hinterlegt_.

## 8. Technische Überlegungen

| Layer           | Technologie                                                | Begründung                                         |
| --------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| **Frontend**    | **Next.js 15 (App Router), React 19, TypeScript (strict)** | SSR + Streaming, Server Components, Typ‑Sicherheit |
| Styling         | **TailwindCSS**, **shadcn/ui**                             | Utility‑First + zugängliche Radix‑Primitives       |
| State / Data    | **tRPC + zod**                                             | End‑to‑End‑Types, Validation                       |
| **Backend**     | **Supabase (Postgres + Edge Functions)**                   | Daten, Auth, Realtime, Cron Feeds                  |
| Background Jobs | Supabase _Scheduled Functions_ (Vercel Cron Fallback)      | Period. Feed‑Polling, Cleanup                      |
| CI / CD         | GitHub Actions → Vercel Preview/Prod                       | Automatisierte Lint, Test, Deploy                  |
| Testing         | **Vitest** (Unit), **Playwright** (E2E)                    | Schnelle Tests + Browser‑Flows                     |
| Tooling         | **pnpm**, ESLint, Prettier, Storybook                      | Konsistente Dev‑XP                                 |

## 9. Datenmodell & Schnittstellen

### Tabellen (Supabase)

- `users` — id, email, onboarding_complete_at
- `subscriptions` — id, user_id (FK), title, feed_url, ktln_email, created_at
- `entries` — id, subscription_id (FK), guid_hash, title, content_html, published_at, status(enum: unread|read), starred(bool), archived(bool)
- `sync_logs` — id, subscription_id, fetched_at, status_code, error_msg

### Beispiel‑tRPC Endpunkte

- **subscription.create** `(title, email_forward)` → erstellt KTLN‑Adresse, speichert feed_url
- **entry.list** `(filter, cursor)` → paginierte Feed‑Items
- **entry.updateStatus** `(entry_id, status)`

### Edge Function: `/feed-sync` (cron, 15 min)

```ts
for (const sub of activeSubscriptions) {
  const feed = await fetch(sub.feed_url);
  // … XML → JSON → Insert deduped entries …
}
```

## 10. Risiken & Edge‑Cases

- **KTLN‑Downtime** → Retry‑Queue, Webhook Alert.
- **Feed‑Truncation** → Persist Volltext beim Erst‑Abruf, danach diff‑Insert.
- **Datenwachstum** → Partitionierung `entries` (monatsweise) ab 10 M Rows.
- **Duplicate GUIDs** in Feeds → Hash(title + pubDate) als Fallback.
- **Security** → RLS, Row‑Level Tenant Isolation, OWASP top‑10 Audit.

## 11. Offene Fragen

1. Sollen Push‑Notifications (WebPush) Teil des MVP sein? (Abhängig von Vercel / Supabase Edge Support)
2. Bevorzugte Analytics‑Lösung für KPI‑Tracking (umfasst PII)?
