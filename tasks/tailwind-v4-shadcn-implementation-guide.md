# Tailwind CSS v4 + shadcn/ui - Korrekte Implementierung

**⚠️ WICHTIG: Diese Anleitung basiert auf den offiziellen Dokumentationen und verhindert kostspielige Fehler bei der Migration.**

## Offizielle Quellen
- [Tailwind CSS v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4)
- [shadcn/ui Tailwind v4 Guide](https://ui.shadcn.com/docs/tailwind-v4)
- [Tailwind v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)

---

## 1. Grundlegende Architektur-Änderungen in v4

### CSS-First Configuration
- **v3**: Konfiguration in `tailwind.config.js`
- **v4**: Konfiguration direkt in CSS mit `@theme` Direktiven

### Neue Struktur
```css
@import "tailwindcss";

:root { /* CSS-Variablen mit hsl() Wrappern */ }
.dark { /* Dark Mode Variablen */ }
@theme inline { /* Tailwind-Referenzen */ }
```

---

## 2. Schritt-für-Schritt Installation (Neues Projekt)

### 2.1 Dependencies installieren
```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

### 2.2 PostCSS konfigurieren
**Datei: `postcss.config.mjs`**
```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
export default config;
```

### 2.3 globals.css korrekt strukturieren
**Datei: `src/app/globals.css`**
```css
@import "tailwindcss";

:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(222.2 84% 4.9%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(222.2 84% 4.9%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(222.2 84% 4.9%);
  --primary: hsl(222.2 47.4% 11.2%);
  --primary-foreground: hsl(210 40% 98%);
  --secondary: hsl(210 40% 96.1%);
  --secondary-foreground: hsl(222.2 47.4% 11.2%);
  --muted: hsl(210 40% 96.1%);
  --muted-foreground: hsl(215.4 16.3% 46.9%);
  --accent: hsl(210 40% 96.1%);
  --accent-foreground: hsl(222.2 47.4% 11.2%);
  --destructive: hsl(0 84.2% 60.2%);
  --destructive-foreground: hsl(210 40% 98%);
  --border: hsl(214.3 31.8% 91.4%);
  --input: hsl(214.3 31.8% 91.4%);
  --ring: hsl(222.2 84% 4.9%);
  --radius: 0.5rem;
}

.dark {
  --background: hsl(222.2 84% 4.9%);
  --foreground: hsl(210 40% 98%);
  --card: hsl(222.2 84% 4.9%);
  --card-foreground: hsl(210 40% 98%);
  --popover: hsl(222.2 84% 4.9%);
  --popover-foreground: hsl(210 40% 98%);
  --primary: hsl(210 40% 98%);
  --primary-foreground: hsl(222.2 47.4% 11.2%);
  --secondary: hsl(217.2 32.6% 17.5%);
  --secondary-foreground: hsl(210 40% 98%);
  --muted: hsl(217.2 32.6% 17.5%);
  --muted-foreground: hsl(215 20.2% 65.1%);
  --accent: hsl(217.2 32.6% 17.5%);
  --accent-foreground: hsl(210 40% 98%);
  --destructive: hsl(0 62.8% 30.6%);
  --destructive-foreground: hsl(210 40% 98%);
  --border: hsl(217.2 32.6% 17.5%);
  --input: hsl(217.2 32.6% 17.5%);
  --ring: hsl(212.7 26.8% 83.9%);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius: var(--radius);
}
```

### 2.4 Minimale tailwind.config.ts
**Datei: `tailwind.config.ts`**
```typescript
import type { Config } from "tailwindcss"

const config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

---

## 3. Migration von v3 zu v4

### 3.1 Upgrade Tool verwenden
```bash
npx @tailwindcss/upgrade@next
```

### 3.2 Manuelle Schritte nach dem Upgrade

1. **CSS-Variablen migrieren:**
   - Verschiebe `:root` und `.dark` aus `@layer base`
   - Füge `hsl()` Wrapper zu allen Farbwerten hinzu
   - Erstelle `@theme inline` Block mit `var()` Referenzen

2. **tailwind.config.ts bereinigen:**
   - Entferne alle Farbdefinitionen (jetzt in CSS)
   - Behalte nur Container, Animationen und Plugins

3. **PostCSS aktualisieren:**
   - Lösche alte `postcss.config.cjs`
   - Erstelle neue `postcss.config.mjs` mit `@tailwindcss/postcss`

### 3.3 shadcn/ui Komponenten aktualisieren
```bash
npx shadcn@latest add button dialog --overwrite
# Oder alle Komponenten:
npx shadcn@latest add --all --overwrite
```

---

## 4. Häufige Fehler und Lösungen

### ❌ Fehler 1: @tailwind Direktiven verwenden
```css
/* FALSCH - v3 Syntax */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```css
/* RICHTIG - v4 Syntax */
@import "tailwindcss";
```

### ❌ Fehler 2: Farben direkt in @theme definieren
```css
/* FALSCH */
@theme {
  --color-primary: 222.2 47.4% 11.2%;
}
```

```css
/* RICHTIG */
:root {
  --primary: hsl(222.2 47.4% 11.2%);
}

@theme inline {
  --color-primary: var(--primary);
}
```

### ❌ Fehler 3: hsl() Wrapper in @theme
```css
/* FALSCH */
@theme inline {
  --color-primary: hsl(var(--primary));
}
```

```css
/* RICHTIG */
@theme inline {
  --color-primary: var(--primary);
}
```

### ❌ Fehler 4: Alte PostCSS Konfiguration
```javascript
// FALSCH - .cjs Format
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

```javascript
// RICHTIG - .mjs Format
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
export default config;
```

---

## 5. Debugging und Troubleshooting

### Server Cache leeren
```bash
npm run dev -- --clear
```

### Häufige Warnungen (normal)
- `Unknown at rule @theme` in IDE → Verschwindet nach Server-Neustart
- `Unknown at rule @import` → Normal, wenn Tailwind noch lädt

### Prüfung der korrekten Implementation
1. **CSS-Variablen sind in :root/.dark definiert**
2. **@theme inline referenziert diese mit var()**
3. **Keine Farbdefinitionen in tailwind.config.ts**
4. **postcss.config.mjs verwendet @tailwindcss/postcss**

---

## 6. Checkliste für neue Projekte

- [ ] `npm install tailwindcss @tailwindcss/postcss postcss`
- [ ] `postcss.config.mjs` mit korrektem Plugin erstellt
- [ ] `globals.css` mit korrekter Struktur (:root, .dark, @theme inline)
- [ ] `tailwind.config.ts` minimal (keine Farben)
- [ ] shadcn/ui Komponenten installiert/aktualisiert
- [ ] Server mit `--clear` gestartet
- [ ] UI-Komponenten (Buttons, Modals) testen

---

## 7. Wichtige Erkenntnisse

1. **CSS-First ist der neue Standard** - Konfiguration gehört in CSS, nicht JS
2. **Drei-Schicht-Architektur**: :root/dark → @theme inline → Tailwind Classes
3. **hsl() Wrapper gehören in :root/.dark** - Nicht in @theme
4. **@theme inline ist korrekt** - Nicht @theme ohne inline
5. **Immer offizielle Dokumentation konsultieren** - Nicht auf veraltetes Wissen verlassen

---

**🎯 Resultat: Korrekt funktionierende Tailwind v4 + shadcn/ui Implementation mit konsistenten Farben in Light/Dark Mode**
