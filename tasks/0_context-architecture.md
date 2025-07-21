# KI-Rules & Architektur-Context für AI-gestützte Webapp-Entwicklung

Dieses Dokument wird **immer** im Kontext der KI mitgeliefert, damit sie die Projektarchitektur, Tools und Workflows versteht.

---

## 1. Kernarchitektur

- **Frontend:**

  - **Next.js 15 (App Router)** – React 19 + Server Components
  - **TypeScript (strict)** – maximale Typ-Sicherheit
  - **TailwindCSS** – Utility-first Styling, Design Tokens in `tailwind.config.ts`
  - **shadcn/ui + Radix** – zugängliche, modular erweiterbare UI-Komponenten
  - **Storybook** – UI-Isolation und visuelle Dokumentation

- **Backend & Datenhaltung:**

  - **Supabase** (Postgres) – Auth (Email/GitHub OAuth), Datenbank, Realtime-Subscriptions
  - **supabase-js v2** + **@supabase/auth-helpers-nextjs** – Client/Server-Integration
  - **Row Level Security (RLS)** – Policies sichern Datenzugriff auf Owner-Ebene

- **API Layer:**

  - **tRPC** – End-to-End-Types, Validierung via `zod`
  - **Server Actions (Next.js)** – Servernahe Logik ohne REST-Overhead

- **Tooling:**
  - **pnpm** – schneller Package-Manager
  - **ESLint & Prettier** – Codequalität und Formatierung
  - **Vitest & Playwright** – Unit- & E2E-Tests
  - **GitHub Actions** – CI (Lint, Test, Build, Preview Deploy)
  - **Vercel** – Hosting (Preview & Production)

---

## 2. Entwicklungsprozess

1. **PRD-Erstellung** – Features werden als Markdown-PRDs definiert (mit User-Flows, KPIs, Edge-Cases).
2. **Tasklist-Generierung** – KI erzeugt eine detaillierte Markdown-Checkliste (Front-End, Supabase, Testing, DevOps).
3. **Scaffolding** – Projekt wird via CLI (`pnpm create next-app`, `npx shadcn-ui@latest init`) erzeugt.
4. **UI-Skeleton** – Components aus shadcn/ui und Tailwind-Utilities; Responsiveness mobile-first.
5. **DB & Auth** – Supabase SQL-Schema, Policies, Hooks (e.g., `useBoards()`).
6. **API-Implementierung** – tRPC-Router, Input-Validation via `zod`.
7. **Tests & CI** – Vitest für Logik, Playwright für User-Flows, GitHub Actions für automatisierte Checks.
8. **Deploy** – Vercel Preview für PRs, Supabase Branch-Migrations für Production.

---

## 3. Technische Prinzipien

- **Type Safety first:** Alle API-Calls, Hooks und Components müssen typsicher sein (kein `any`).
- **Modularisierung:** UI-Components klein & wiederverwendbar (Atomic Design).
- **Convention over Configuration:** Next.js Dateistruktur (`app/`, `components/`, `lib/`).
- **Realtime by Design:** Supabase Realtime (Postgres Changes) für Updates.
- **CI/CD:** Jeder Merge → Lint, Tests, Build, Preview-Deploy.
- **A11y & UX:** Radix-Komponenten und `@axe-core/react` prüfen Accessibility.

---

## 4. Prompts & Arbeitsweise

- **Schreibe immer TSX/TS Code**, es sei denn, JS ist explizit gefordert.
- **Nutze bestehende Tokens/Komponenten** (z. B. `Button` von shadcn) statt Custom-HTML.
- **Verweise auf Dateien klar und exakt** (z. B. `app/(dashboard)/board/page.tsx`).
- **Validiere Code gegen bestehende Linter- und TS-Regeln.**

---

## 5. Tools & Engines Kurzüberblick

- **React 19:** Aktuelle Hooks (z. B. `useOptimistic`, `use` für Server Components).
- **Next.js 15:** File-based Routing, `app/`-Router, Streaming SSR.
- **Supabase:** Postgres mit Auth, RLS, Realtime, Edge Functions.
- **TailwindCSS:** Responsive Utilities (`sm:`, `md:`, `xl:`), `@layer components`.
- **shadcn/ui:** CLI-basiertes Komponentengerüst mit Radix-Primitive.
- **tRPC:** Typsichere RPC-Aufrufe, Router-Files im `server/routers/`.
- **Vitest:** Schnelle TS-kompatible Tests.
- **Playwright:** Browser-automatisierte Tests (Chrome/Firefox/WebKit).
- **Vercel:** Zero-Config Deployment für Next.js.
- **GitHub Actions:** YAML-Workflows für CI/CD.

---

## 6. Checkliste für jede KI-Output-Session

- [ ] Ist der Code TypeScript-strict-kompatibel?
- [ ] Sind Tailwind-Utilities und Tokens konsistent?
- [ ] Nutzt der Code Supabase-Client korrekt (Server vs. Client)?
- [ ] Sind Tests vorhanden oder skizziert?
- [ ] Erfüllt der Code Accessibility-Standards?
- [ ] Ist die Dateistruktur Next.js-konform?

---

_Dieses Dokument dient als dauerhafter technischer Kontext._
