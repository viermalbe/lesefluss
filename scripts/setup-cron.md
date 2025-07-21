# Automatischer Feed-Sync Setup

## 🔄 Optionen für automatischen Feed-Sync

### Option 1: Vercel Cron Jobs (Empfohlen)
Wenn du auf Vercel deployst, kannst du Vercel Cron Jobs verwenden:

1. **Erstelle `vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/sync-feeds",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

2. **Deploy auf Vercel:**
```bash
vercel --prod
```

### Option 2: GitHub Actions (Kostenlos)
Für GitHub-gehostete Projekte:

1. **Erstelle `.github/workflows/sync-feeds.yml`:**
```yaml
name: Sync Feeds
on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync Feeds
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/sync-feeds" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

### Option 3: Externe Cron-Services

#### UptimeRobot (Kostenlos)
- Erstelle HTTP(s) Monitor
- URL: `https://deine-app.vercel.app/api/sync-feeds`
- Intervall: 30 Minuten
- HTTP Method: POST

#### Cron-job.org (Kostenlos)
- URL: `https://deine-app.vercel.app/api/sync-feeds`
- Intervall: `*/30 * * * *`
- HTTP Method: POST

### Option 4: Supabase Edge Function + External Trigger

#### Setup:
1. **Deploy Edge Function:**
```bash
supabase functions deploy sync-feeds
```

2. **Externe Trigger-URL:**
```
https://your-project.supabase.co/functions/v1/sync-feeds
```

3. **Verwende einen der externen Services oben**

## 🎯 Empfohlene Konfiguration

### Intervalle:
- **Newsletter**: 30-60 Minuten
- **News-Feeds**: 15-30 Minuten  
- **Blog-Posts**: 60-120 Minuten

### Standard: **30 Minuten**
- Gute Balance zwischen Aktualität und Server-Load
- Nicht zu häufig für Newsletter
- Ausreichend für die meisten Use Cases

## 🔧 Implementation Steps

1. **Wähle eine Option oben**
2. **Konfiguriere den Service**
3. **Teste manuell:** `POST /api/sync-feeds`
4. **Überwache Logs**
5. **Adjustiere Intervall bei Bedarf**

## 📊 Monitoring

### Supabase Dashboard:
- Subscription `last_sync_at` Timestamps
- Entry-Counts pro Tag
- Error-Logs in `last_error` Feldern

### Logs prüfen:
```bash
# Vercel
vercel logs

# Supabase Edge Functions  
supabase functions logs sync-feeds
```

## 🚨 Troubleshooting

### Häufige Probleme:
1. **Timeout**: Erhöhe Timeout in Edge Function
2. **Rate Limiting**: Reduziere Frequenz
3. **Memory Issues**: Limitiere Entries pro Feed
4. **Auth Errors**: Prüfe Service Role Key

### Debug Commands:
```bash
# Test lokale API
curl -X POST http://localhost:3000/api/sync-feeds

# Test Edge Function
supabase functions invoke sync-feeds
```
