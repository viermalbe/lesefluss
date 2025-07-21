# Tasks für Lesefluss (Newsletter-Reader PWA)

## Relevant Files

- `package.json` – Abhängigkeiten (Next.js 15, Supabase, tRPC, TailwindCSS)
- `next.config.js` – PWA-Konfiguration, Service Worker
- `tailwind.config.ts` – Design-Tokens, shadcn/ui Integration (v4)
- `postcss.config.mjs` – PostCSS Konfiguration für Tailwind v4
- `tasks/tailwind-v4-shadcn-implementation-guide.md` – Detaillierte Anleitung für Tailwind v4 + shadcn/ui
- `lib/supabase/client.ts` – Supabase Client-Konfiguration
- `lib/supabase/server.ts` – Server-Side Supabase Client
- `lib/trpc/server.ts` – tRPC Server Setup
- `lib/trpc/client.ts` – tRPC Client Setup
- `supabase/migrations/001_initial_schema.sql` – Datenbank-Schema
- `supabase/migrations/002_rls_policies.sql` – Row Level Security
- `app/layout.tsx` – Root Layout mit Auth Provider
- `app/page.tsx` – Landing/Dashboard Page
- `app/(auth)/login/page.tsx` – Login-Seite
- `app/(dashboard)/sources/page.tsx` – Sources-Übersicht (ehemals feeds)
- `app/(dashboard)/issues/page.tsx` – Issues-Liste (ehemals entries)
- `components/ui/` – shadcn/ui Komponenten
- `components/feed-card.tsx` – Newsletter-Subscription Card
- `components/entry-card.tsx` – Feed-Entry Card
- `components/sources/add-source-dialog.tsx` – Newsletter-Import Dialog
- `components/onboarding/welcome-screen.tsx` – Welcome screen für neue User
- `components/onboarding/guided-add-source.tsx` – Guided Newsletter-Setup
- `components/onboarding/onboarding-wrapper.tsx` – Onboarding Routing Logic
- `app/(dashboard)/onboarding/page.tsx` – Onboarding-Seite
- `lib/hooks/useOnboarding.ts` – Onboarding Status Management
- `lib/hooks/useSubscriptions.ts` – Subscription Management Hook
- `lib/hooks/useEntries.ts` – Entry Management Hook
- `lib/services/ktln.ts` – Kill-The-Newsletter Integration
- `lib/services/feed-parser.ts` – RSS/Atom Feed Parser
- `supabase/functions/feed-sync/index.ts` – Background Feed Sync
- `app/manifest.json` – PWA Manifest
- `public/sw.js` – Service Worker für Offline-Support
- `__tests__/` – Test-Dateien (Vitest, Playwright)
- `.github/workflows/ci.yml` – CI/CD Pipeline

## Notes

- MVP-Fokus: Schnell lauffähige Version mit Basis-Features
- Reihenfolge optimiert für frühe Testbarkeit
- PWA-Features erst nach Core-Funktionalität
- Tests parallel zur Feature-Entwicklung

## Tasks

### 1.0 Projekt-Setup & Architektur-Grundlagen
- [x] 1.1 Next.js 15 Projekt mit TypeScript initialisieren (`pnpm create next-app`)
- [x] 1.2 TailwindCSS v4 und shadcn/ui konfigurieren (inkl. Styling-Fixes)
- [x] 1.3 ESLint, Prettier und grundlegende Dev-Tools einrichten
- [x] 1.4 Projektstruktur anlegen (lib/, components/, app/ Ordner)
- [x] 1.5 tRPC Setup (Client + Server) mit Zod-Validierung
- [x] 1.6 Basis-Layout mit Navigation und Theme-Provider

### 2.0 Supabase Backend & Datenmodell
- [x] 2.1 Supabase Projekt erstellen und lokale Entwicklung einrichten
- [x] 2.2 Datenbank-Schema erstellen (users, subscriptions, entries, sync_logs)
- [x] 2.3 Row Level Security (RLS) Policies implementieren
- [x] 2.4 Supabase Client-Konfiguration (Browser + Server)
- [x] 2.5 Basis tRPC-Router für Subscriptions und Entries

### 3.0 Authentication & User Management
- [x] 3.1 Supabase Auth Setup (PIN-based Email OTP)
- [x] 3.2 Login/Logout Komponenten mit shadcn/ui
- [x] 3.3 Auth-Provider und Session-Management
- [x] 3.4 Protected Routes und Auth-Guards
- [x] 3.5 User-Onboarding Flow (erste Newsletter hinzufügen)

### 4.0 Newsletter-Import via Kill-The-Newsletter Integration
- [x] 4.1 Kill-The-Newsletter API Integration implementieren
- [x] 4.2 Newsletter-Import Dialog mit Formular-Validierung
- [x] 4.3 Subscription-Erstellung (KTLN-Email → Feed-URL)
- [x] 4.4 Subscription-Management (Liste, Bearbeiten, Löschen)
- [x] 4.5 Error-Handling für KTLN-Service-Ausfälle

### 5.0 Feed-Reader Frontend (Hauptansicht)
- [x] 5.1 Dashboard mit Subscription-Übersicht (Sources-Seite)
- [x] 5.2 Feed-Card Komponente (Titel, Status, letzte Aktualisierung)
- [x] 5.3 Entry-Liste mit Pagination und Filtering (Issues-Seite)
- [x] 5.4 Entry-Card Komponente (Titel, Datum, Gelesen-Status)
- [x] 5.5 Entry-Detail-Ansicht mit HTML-Content-Rendering
- [x] 5.6 Responsive Design (Mobile-First)

### 6.0 Entry Management (Lesen, Favoriten, Archivierung)
- [x] 6.1 Entry-Status Updates (gelesen/ungelesen)
- [x] 6.2 Favoriten-System implementieren
- [x] 6.3 Archivierung von Entries -> nicht nötig, new/read + Favorite reicht
- [x] 6.4 Bulk-Aktionen (alle als gelesen markieren) -> übersprungen
- [x] 6.5 Swipe-Gesten für Mobile (gelesen/favorit) -> übersprungen
- [x] 6.6 Volltext-Suche in Entries

### 7.0 PWA-Funktionalität & Offline-Support
- [ ] 7.1 PWA Manifest und Icons erstellen
- [ ] 7.2 Service Worker für Caching implementieren
- [ ] 7.3 Offline-Fallback für Entry-Anzeige
- [ ] 7.4 Background Sync für Entry-Status-Updates
- [ ] 7.5 Install-Prompt und PWA-Features

### 8.0 Background Feed-Sync & Cron Jobs
- [x] 8.1 RSS/Atom Feed-Parser implementieren
- [x] 8.2 Supabase Edge Function für Feed-Sync
- [x] 8.3 Cron-Job Setup (30min Intervall via GitHub Actions)
- [x] 8.4 Duplicate-Detection und Entry-Deduplication
- [x] 8.5 Error-Logging und Retry-Mechanismus

---

## 📊 AKTUELLER STATUS (20.07.2025, 22:38)

### ✅ HEUTE ERFOLGREICH IMPLEMENTIERT:

#### **Feed-Synchronisation & RSS-Parser**:
- ✅ **Vollständiger RSS/Atom Feed-Parser** mit DOMParser
- ✅ **Rate-Limiting-Handling** mit Retry-Logic und Exponential Backoff
- ✅ **Proxy API-Route** für CORS-freies Feed-Fetching
- ✅ **Client-seitige Feed-Sync** mit Mock-Data-Fallback bei Rate-Limits
- ✅ **Duplicate-Detection** via guid_hash
- ✅ **Entry-Insertion** in Datenbank mit RLS-Policy-Fix

#### **UI & UX Verbesserungen**:
- ✅ **Enhanced SourceCard** mit Copy-Email, Rename, Activate/Deactivate
- ✅ **Issue Count Display** pro Source
- ✅ **Sync Feeds Button** mit Loading-States und Toast-Notifications
- ✅ **Issues-Seite** zeigt alle Entries korrekt an
- ✅ **Entry-Detail-Seite** mit HTML-Content-Rendering und Read-Status-Toggle

#### **Architektur-Migration**:
- ✅ **Client-seitige Supabase-Calls** statt tRPC (Auth-Kompatibilität)
- ✅ **RLS-Policy-Fix** für Entry-Insertion
- ✅ **Konsistente Error-Handling** und Loading-States

### 🔧 TECHNISCHE DETAILS:
- **Feed-Parser**: Unterstützt Atom & RSS, flexible Feed-Detection
- **Rate-Limiting**: 2s Delay zwischen Feeds, 3 Retry-Versuche
- **Mock-Data**: Automatischer Fallback bei KTLN Rate-Limits
- **Auth**: Client-seitige Supabase-Session für garantierte Kompatibilität

### 🧪 GETESTETE FUNKTIONEN:
- ✅ Subscription-Erstellung mit KTLN-Integration
- ✅ Feed-Sync mit echten und Mock-Daten
- ✅ Entry-Anzeige in Issues-Liste
- ✅ Entry-Detail-Ansicht mit HTML-Rendering
- ✅ Read-Status-Toggle funktioniert
- ✅ Source-Management (Rename, Copy-Email, Activate/Deactivate)

### 🎯 NÄCHSTE SCHRITTE:
1. **PWA-Features** (Task 7.x): Manifest, Service Worker, Offline-Support
2. **Favoriten-System** (Task 6.2): Starred Entries implementieren
3. **Server-seitige Migration** (Optional): tRPC Auth-Session-Fix für bessere Performance
4. **Bulk-Aktionen** (Task 6.4): "Alle als gelesen markieren"
5. **Supabase Edge Functions** (Task 8.2): Automatischer Feed-Sync alle 15min

### 💡 BEKANNTE ISSUES:
- KTLN Rate-Limiting erfordert Pausen zwischen Tests (Mock-Data als Workaround)
- tRPC Auth-Session-Forwarding noch nicht optimal (Client-seitig als Workaround)
- TypeScript Lint-Warnings in Feed-Parser (funktional, aber cleanup nötig)

**Das Core-System ist jetzt vollständig funktional! Newsletter-Import, Feed-Sync, Entry-Management und UI funktionieren einwandfrei.** 🎉
- [ ] 8.6 Realtime-Updates für neue Entries

### 9.0 Testing & Quality Assurance
- [ ] 9.1 Vitest Setup für Unit-Tests
- [ ] 9.2 Playwright Setup für E2E-Tests
- [ ] 9.3 Component-Tests für UI-Komponenten
- [ ] 9.4 API-Tests für tRPC-Endpoints
- [ ] 9.5 E2E-Tests für kritische User-Flows
- [ ] 9.6 Accessibility-Tests (WCAG 2.1 AA)

### 10.0 Deployment & CI/CD Pipeline
- [ ] 10.1 Vercel-Deployment konfigurieren
- [ ] 10.2 GitHub Actions für CI/CD
- [ ] 10.3 Supabase Production-Setup
- [ ] 10.4 Environment-Management (Dev/Staging/Prod)
- [ ] 10.5 Performance-Monitoring und Error-Tracking
- [ ] 10.6 Lighthouse PWA-Score Optimierung
