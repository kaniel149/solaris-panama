# Vercel Env Setup — Solaris Panamá (deploy ready 2026-04-17)

> אלה הסודות שצריכים להיות מוגדרים ב-Vercel **לפני** שמערכות ה-CAPI / Enhanced Conversions / Bridge Watchdog יעבדו.
> Project: `kaniels-projects-bcb66de8/landing` · Domain: `solaris-panama.com`

---

## ✅ כבר מוגדרים (אל תיגע)

```
GROQ_API_KEY · CRON_SECRET · META_PAGE_ID · META_PAGE_ACCESS_TOKEN
META_APP_SECRET · META_WEBHOOK_VERIFY_TOKEN · GOOGLE_LEADS_WEBHOOK_KEY
SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_URL · VITE_SUPABASE_ANON_KEY · VITE_POSTHOG_KEY · VITE_POSTHOG_HOST · VITE_CLARITY_ID
```

---

## 🔴 חסרים — חייב להוסיף

### 1. Meta CAPI (Conversions API) — קריטי

המודול `api/lib/meta-capi.ts` שולח Lead/Purchase events server-side. בלי הסודות האלה, ה-CAPI ייכשל בשקט וכל הקוד יחזור ל-pixel client-side בלבד (= 30% iOS loss).

```bash
cd ~/Desktop/projects/solar/panama/solaris-panama/platform

# Pixel ID — Events Manager → Settings → Dataset ID
vercel env add META_PIXEL_ID production
# ערך: 928138543031656  (כבר ידוע מה-CLAUDE.md)

# CAPI Access Token
# צור ב: Events Manager → Settings → Conversions API → Generate access token
# או: Business Settings → System Users → kaniel → Generate Token
#     permissions: ads_management, business_management
vercel env add META_CAPI_TOKEN production
# ערך: <System User token, EAAxxxxx... ארוך>

# (אופציונלי) Test Code לבדיקה ב-Events Manager → Test Events
vercel env add META_CAPI_TEST_CODE production
# ערך: TEST123456...   ← הסר אחרי שראית events ב-Test Events ועברו ל-prod
```

### 2. Bridge Watchdog Alert Channel — לפחות אחד

`api/cron/bridge-watchdog.ts` ישלח התראה אם ה-bridge מת. הוא ינסה את הערוצים בסדר הזה: Twilio → Meta WA Cloud → Resend (email). הגדר **לפחות אחד**.

#### אופציה A — Twilio (מומלץ — הכי אמין)
```bash
vercel env add TWILIO_ACCOUNT_SID production    # ACxxxxx...
vercel env add TWILIO_AUTH_TOKEN production     # ארוך 32 תווים
vercel env add TWILIO_WA_FROM production        # whatsapp:+14155238886 (sandbox) או הנומבר שאישרו לך
```

#### אופציה B — Meta WhatsApp Cloud API (חינם עד 1000 שיחות/חודש)
```bash
vercel env add META_WA_TOKEN production         # System User token עם whatsapp_business_messaging
vercel env add META_WA_PHONE_ID production      # Phone Number ID מ-WA Manager
```

#### אופציה C — Resend (email fallback — לפחות תקבל מייל)
```bash
vercel env add RESEND_API_KEY production        # re_xxxxx...
```

### 3. Google Ads Offline Conversions — דורש קצת עבודה ב-Google Ads UI

`api/cron/upload-google-conversions.ts` מעלה ventas cerradas (status='won' + gclid + deal_value) ל-Google Ads כל 6 שעות. **זה הROI הכי גדול** — Smart Bidding מתחיל לעבוד אמיתי.

#### לפני שמוסיפים env vars, צריך ליצור 2 דברים ב-UI:

**א. Conversion Action חדש**
1. Google Ads → Tools → Conversions → New
2. בחר "Import" → "Other data sources or CRM"
3. שם: `Solaris — Lead Won (Offline)`
4. Category: `Lead`, Value: `Use different values for each conversion`, Count: `One`
5. Click-through window: 90 days, View-through: 1 day
6. **שמור את ה-Conversion ID** (מספר 10-ספרתי) — זה ה-`GOOGLE_ADS_CONVERSION_ACTION_ID`

**ב. OAuth Refresh Token**
1. צור OAuth client ב-GCP Console → Credentials → Create OAuth Client ID → Desktop app
2. הורד את client_secret.json
3. הריץ:
```bash
# Install once
pip3 install google-ads
# Generate refresh token
python3 -m google_ads.examples.authentication.generate_user_credentials \
  --client_secret_path=/path/to/client_secret.json
# פותח דפדפן, מאשרים, מחזיר refresh_token
```

**Developer Token**: Google Ads → Tools → API Center → request approval (בסיס L0 פעיל לחשבונות test, צריך L1 ל-prod traffic)

#### ואז:
```bash
vercel env add GOOGLE_ADS_DEVELOPER_TOKEN production       # 22 תווים אלפנומריים
vercel env add GOOGLE_ADS_CLIENT_ID production             # מ-GCP Credentials
vercel env add GOOGLE_ADS_CLIENT_SECRET production         # מ-GCP Credentials
vercel env add GOOGLE_ADS_REFRESH_TOKEN production         # מהcommand למעלה
vercel env add GOOGLE_ADS_CUSTOMER_ID production           # 2386814319 (Solaris Panama)
vercel env add GOOGLE_ADS_LOGIN_CUSTOMER_ID production     # 3253159193 (MCC kaniel tord)
vercel env add GOOGLE_ADS_CONVERSION_ACTION_ID production  # מהשלב 1.א
```

---

## ⚡ One-shot script — הוסף הכל

הכן את הערכים בקובץ `.env.production.local` (אל תcommit!) ואז הריץ:

```bash
cd ~/Desktop/projects/solar/panama/solaris-panama/platform
# pull existing
vercel env pull .env.production.local

# ערוך את הקובץ והוסף את החדשים, אז:
while IFS='=' read -r key value; do
  [[ "$key" =~ ^# ]] && continue
  [[ -z "$key" ]] && continue
  echo "$value" | vercel env add "$key" production --force
done < <(grep -E '^(META_PIXEL_ID|META_CAPI_|TWILIO_|RESEND_|GOOGLE_ADS_|META_WA_)' .env.production.local)

# Trigger redeploy
vercel --prod
```

---

## 🧪 וריפיקציה — אחרי הdeploy

### CAPI live?
```bash
# שלח test lead דרך LP
curl -s https://solaris-panama.com/api/leads/intake \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test CAPI","phone":"50760000001","source":"lp_azuero","event_id":"test-'$(date +%s)'"}'

# בדוק ב-Events Manager → Test Events (אם הגדרת META_CAPI_TEST_CODE)
# או בלוג Supabase:
```
```sql
SELECT source, status_code, error, created_at
FROM webhook_logs
WHERE source IN ('capi','enhanced_conv','intake')
ORDER BY created_at DESC LIMIT 10;
```

### Bridge watchdog live?
```bash
# בדוק שcron רץ:
curl -s https://solaris-panama.com/api/cron/bridge-watchdog \
  -H "Authorization: Bearer $CRON_SECRET" | jq

# צריך להחזיר { status: 'healthy', minutesSinceLastPing: 0.x }
```

### Google Offline Conversions ready?
```bash
# בעבודה ידנית: עדכן lead ל-won + הוסף deal_value ב-CRM
# חכה 6 שעות (או הריץ ידנית):
curl -s https://solaris-panama.com/api/cron/upload-google-conversions \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

---

## 📋 Quick Status Checklist

| Env var | Status | Where to get |
|---------|--------|--------------|
| `META_PIXEL_ID` | ❌ הוסף | `928138543031656` (ידוע) |
| `META_CAPI_TOKEN` | ❌ הוסף | Events Manager → Settings |
| `META_CAPI_TEST_CODE` | ⚪ אופציונלי | Test Events tab |
| `TWILIO_*` (3) או `META_WA_*` (2) או `RESEND_API_KEY` | ❌ לפחות אחד | Twilio Console / Meta WA Manager / resend.com |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | ❌ הוסף | Google Ads → Tools → API Center |
| `GOOGLE_ADS_CLIENT_ID` + `CLIENT_SECRET` | ❌ הוסף | GCP Console → Credentials |
| `GOOGLE_ADS_REFRESH_TOKEN` | ❌ הוסף | run `generate_user_credentials` script |
| `GOOGLE_ADS_CUSTOMER_ID` | ❌ הוסף | `2386814319` |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | ❌ הוסף | `3253159193` |
| `GOOGLE_ADS_CONVERSION_ACTION_ID` | ❌ הוסף | אחרי יצירת conversion action חדש |

---

*Last updated: 2026-04-17 — שלב 2 שיפורים*
