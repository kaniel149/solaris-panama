# Security and Environment Notes

## Source of truth

- Production secrets live in Vercel project environment variables.
- Local secrets can live in `.env.local`, `.env.secrets.local`, or `.env.vercel-pull.local`.
- `.env.example` is the only environment file that should be committed.

## Sensitive files that must never be committed

- `.env`
- `.env.local`
- `.env.*.local`
- `whatsapp-bridge/.baileys_auth/`
- `whatsapp-bridge/.wwebjs_auth/`
- any Supabase `service_role` key
- any Meta, Google Ads, Twilio, Resend, or WhatsApp token

## If a secret was exposed

1. Rotate the key in the provider dashboard.
2. Update Vercel production and preview environments.
3. Update local `.env*` files.
4. Restart the WhatsApp bridge if the changed key is used there.

## Required production checks

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set for API routes.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set for the browser app.
- `CRON_SECRET` is set and Vercel cron requests use it.
- `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, and `META_WEBHOOK_VERIFY_TOKEN` are set before enabling Meta webhooks.
- `GOOGLE_LEADS_WEBHOOK_KEY` is set before enabling Google Lead Form webhooks.
- At least one watchdog fallback channel is configured: Twilio, Meta WhatsApp Cloud API, or Resend.
