# 🔐 GitHub Secrets Setup für Automatischen Feed-Sync

## 📋 Benötigte Secrets

Für den automatischen Feed-Sync via GitHub Actions benötigst du diese Secrets:

### 1. **APP_URL**
- **Name:** `APP_URL`
- **Wert:** `https://deine-app.vercel.app` (oder deine Domain)
- **Beschreibung:** URL deiner deployed Lesefluss-App

### 2. **SUPABASE_SERVICE_ROLE_KEY**
- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Wert:** Dein Supabase Service Role Key
- **Beschreibung:** Für Backend-API-Zugriff ohne User-Auth

## 🔧 Setup-Schritte

### 1. Supabase Service Role Key finden:
1. Gehe zu [Supabase Dashboard](https://app.supabase.com)
2. Wähle dein Projekt
3. Gehe zu **Settings** → **API**
4. Kopiere den **service_role** Key (nicht den anon key!)

### 2. GitHub Secrets hinzufügen:
1. Gehe zu deinem GitHub Repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Klicke **New repository secret**
4. Füge beide Secrets hinzu:

```
Name: APP_URL
Value: https://lesefluss.vercel.app

Name: SUPABASE_SERVICE_ROLE_KEY  
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ⚡ Workflow Aktivierung

### Automatisch:
- **Intervall:** Alle 30 Minuten
- **Startet:** Nach dem ersten Push/Merge
- **Läuft:** 24/7 automatisch

### Manuell:
1. Gehe zu **Actions** Tab in GitHub
2. Wähle "🔄 Automatic Feed Sync"
3. Klicke **Run workflow**
4. Optional: Aktiviere "Force sync all feeds"

## 📊 Monitoring

### Workflow-Logs ansehen:
1. **Actions** Tab → **🔄 Automatic Feed Sync**
2. Klicke auf einen Workflow-Run
3. Schaue dir die Logs an

### Erfolgreiche Sync-Ausgabe:
```
✅ Feed sync completed successfully!
🎯 Total entries synced: 15 across 3 subscriptions
📊 Sync completed at Mon Jul 21 20:47:08 UTC 2025
⏰ Next sync scheduled in 30 minutes
```

### Fehler-Ausgabe:
```
❌ Feed sync failed with status 500
Error: {"error": "Database connection failed"}
🚨 Feed sync failed at Mon Jul 21 20:47:08 UTC 2025
🔍 Check the logs above for details
```

## 🎯 Vorteile GitHub Actions

### ✅ **Kostenlos:**
- 2000 Minuten/Monat für private Repos
- Unbegrenzt für public repos
- Unser Workflow braucht ~1 Minute alle 30 Min = ~48 Min/Tag

### ✅ **Zuverlässig:**
- GitHub-Infrastructure
- Automatische Retry bei Fehlern
- Detaillierte Logs

### ✅ **Flexibel:**
- Einfach Intervall ändern
- Manueller Trigger möglich
- Conditional Logic für verschiedene Szenarien

## 🔧 Anpassungen

### Intervall ändern:
```yaml
schedule:
  # Alle 15 Minuten
  - cron: '*/15 * * * *'
  
  # Jede Stunde
  - cron: '0 * * * *'
  
  # Nur werktags 9-17 Uhr
  - cron: '0 9-17 * * 1-5'
```

### Timeout anpassen:
```yaml
jobs:
  sync-feeds:
    timeout-minutes: 15  # Erhöhe bei vielen Feeds
```

## 🚨 Troubleshooting

### Häufige Probleme:

1. **401 Unauthorized:**
   - Prüfe `SUPABASE_SERVICE_ROLE_KEY`
   - Stelle sicher, dass es der service_role key ist

2. **404 Not Found:**
   - Prüfe `APP_URL`
   - Stelle sicher, dass die App deployed ist

3. **Timeout:**
   - Erhöhe `timeout-minutes`
   - Reduziere Anzahl parallel verarbeiteter Feeds

4. **Rate Limiting:**
   - Reduziere Sync-Frequenz
   - Implementiere exponential backoff

### Debug-Befehle:
```bash
# Teste API lokal
curl -X POST http://localhost:3000/api/sync-feeds

# Teste deployed API
curl -X POST https://deine-app.vercel.app/api/sync-feeds \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## 🎉 Fertig!

Nach dem Setup läuft der automatische Feed-Sync:
- ⏰ **Alle 30 Minuten**
- 🔄 **Vollautomatisch**
- 📊 **Mit detaillierten Logs**
- 🚨 **Fehler-Benachrichtigungen**

Deine Newsletter werden jetzt automatisch synchronisiert! 🚀
