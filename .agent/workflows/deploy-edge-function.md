---
description: Deploy a Supabase Edge Function
---

# Deploy Edge Function

## Prerequisites
- Supabase CLI access (via `npx supabase`)
- Logged in to Supabase (`npx supabase login`)
- Project ID from `.env` or Supabase dashboard

## Steps

1. Ensure function code is in `supabase/functions/<function-name>/index.ts`

2. Deploy the function:
```bash
npx supabase functions deploy <function-name> --project-ref <project-id>
```

3. Set any required secrets:
```bash
npx supabase secrets set SECRET_NAME=value --project-ref <project-id>
```

## Alternative: GitHub Integration
If CLI has permission issues (403 error):
1. Push changes to GitHub main branch
2. Supabase GitHub integration will auto-deploy
3. Check Supabase Dashboard → Edge Functions for deployment status

## Common Functions
- `send-email-bill` - Email billing (requires `RESEND_API_KEY`)
- `chat-with-gemini` - AI chat (requires `GOOGLE_AI_API_KEY`)
- `send-whatsapp` - WhatsApp (requires Twilio secrets)

## Troubleshooting
- 403 Error: Check organization permissions or use GitHub integration
- Lint errors for Deno: These only resolve in Supabase runtime, not locally
