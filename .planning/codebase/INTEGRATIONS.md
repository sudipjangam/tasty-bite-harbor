# External Integrations

**Analysis Date:** 2026-09-12

## APIs & External Services

**Payment Processing:**
- **Razorpay:**
  - Used for: Online bill payments, customer QR checkout, franchise subscriptions, and automated refunds.
  - SDK / Integration: Edge Functions (`supabase/functions/create-razorpay-order`, `supabase/functions/verify-razorpay-payment`, `supabase/functions/process-razorpay-refund`) via REST API.
  - Auth: `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` stored in Supabase secrets.
  - Flow: Frontend calls Edge function -> Order created on Razorpay -> Client opens Razorpay Checkout modal -> Server verifies HMAC signature on return.
- **Paytm Payment Gateway & UPI QR:**
  - Used for: Dynamic QR code generation for counter/table billing and instant POS settlement.
  - SDK / Integration: Edge functions (`supabase/functions/create-paytm-qr`, `supabase/functions/check-paytm-status`, `supabase/functions/paytm-webhook`).
  - Auth: `PAYTM_MID`, `PAYTM_MERCHANT_KEY` in environment secrets.
  - Webhook: `supabase/functions/paytm-webhook` receives async transaction status callbacks and updates `orders` / `payments`.
- **UPI Dynamic Deep-linking:**
  - Used for: Zero-fee direct UPI payments (GPay, PhonePe, Paytm) via intent URLs and dynamic QR codes (`src/utils/billCalculation.ts`, `supabase/functions/create-payment-qr`).

**Messaging & Communications:**
- **Meta WhatsApp Cloud API / MSG91:**
  - Used for: Transactional WhatsApp bills, order confirmation alerts, customer loyalty updates, and automated marketing campaigns.
  - SDK / Integration: Direct HTTPS requests via Edge functions (`supabase/functions/send-whatsapp-unified`, `supabase/functions/send-whatsapp-cloud`, `supabase/functions/send-msg91-whatsapp`, `supabase/functions/create-msg91-template`, `supabase/functions/meta-whatsapp-templates`).
  - Auth: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `MSG91_AUTH_KEY` in Edge function secrets; per-restaurant credentials configurable in `components/Admin/WhatsAppProviderAdmin.tsx`.
  - Inbound Webhook: `supabase/functions/whatsapp-webhook` parses delivery status and customer replies.
- **Transactional Email (Resend / SMTP):**
  - Used for: Digital PDF invoice emails, staff daily summary reports, and subscription receipts.
  - SDK / Integration: Edge functions (`supabase/functions/send-email`, `supabase/functions/send-email-bill`, `supabase/functions/send-daily-report`).
  - Auth: `RESEND_API_KEY` or SMTP configuration stored in environment secrets.

**Artificial Intelligence & Machine Learning:**
- **Google Gemini API:**
  - Used for: Natural language analytics queries, smart business insights, automated customer chat assistant, and AI chart generation.
  - SDK / Client: `@google/genai` 1.33.0 and Edge function `supabase/functions/chat-with-gemini`.
  - Auth: `GEMINI_API_KEY` passed to Edge function / client environment.
  - Features: `src/components/AI/AiCapabilities.tsx`, `src/components/Analytics/AIChartBuilder.tsx`.

**Hardware & Native Peripherals:**
- **Thermal ESC/POS Printers (Bluetooth & Network):**
  - Used for: Automated Kitchen Order Ticket (KOT) and customer bill printing.
  - Integration: `cordova-plugin-bluetooth-serial` on native Android (`src/utils/escpos.ts`, `src/components/Orders/Receipt/ThermalReceipt.tsx`); browser `window.print()` and HTML canvas rendering for desktop.
- **Hardware Biometrics:**
  - Used for: Touch ID / Face recognition staff shift clock-in and manager overrides.
  - Integration: `@aparajita/capacitor-biometric-auth` bridging Android BiometricPrompt API (`src/hooks/useAutoClockOut.tsx`, `src/components/Staff/ClockInOutDialog.tsx`).

**Aggregators & OTAs:**
- **Channel Manager Sync:**
  - Used for: Online travel agencies and delivery aggregators (Zomato, Swiggy, Booking.com, Airbnb).
  - Integration: `supabase/functions/sync-channels`, mapping tables `channel_room_mapping`, `channel_inventory`, `ota_bookings`.

## Data Storage

**Databases:**
- **PostgreSQL 15+ (Supabase Managed):**
  - Connection: Supabase Client SDK (`src/integrations/supabase/client.ts`) querying REST/PostgREST (`/rest/v1`) and Realtime (`/realtime/v1`).
  - Direct connection string `DATABASE_URL` used for migrations and CLI operations.
  - Schema: 126+ relational tables with strict Foreign Keys and Row Level Security (RLS) policies on every table.
  - Migrations: Managed via Supabase CLI in `supabase/migrations/`.
- **Client Offline Storage (IndexedDB):**
  - Library: `idb` 8.0.3 via `src/hooks/useOfflineCache.ts`.
  - Caches: Offline menus, pending local orders, customer profiles, and active table statuses to guarantee POS continuity during network disconnects.

**File Storage:**
- **Supabase Storage Buckets:**
  - Buckets: `restaurant-assets`, `bills`, `menu-items`, `staff-documents`, `reports`.
  - Client: `supabase.storage.from('bucket-name')`.
  - Access: RLS policies restricting file uploads and reads per `restaurant_id`.
- **Image Hosting Fallbacks:**
  - Edge functions `supabase/functions/freeimage-upload` and `supabase/functions/google-drive-upload` provide secondary offsite asset storage.

## Authentication & Identity

**Auth Provider:**
- **Supabase Auth (GoTrue):**
  - Implementation: `supabase.auth` in `src/hooks/useAuth.tsx`.
  - Mechanism: Email/password authentication, magic links, and password reset flows (`supabase/functions/reset-password`, `supabase/functions/forgot-password`).
  - Session Storage: `localStorage` with auto-refresh JWT tokens.
  - User Profiles: `profiles` table automatically linked to `auth.users(id)` via database triggers.
- **OAuth Providers:**
  - Google OAuth: Redirects directly to `https://clmsoetktmvhazctlans.supabase.co/auth/v1/authorize?provider=google` to bypass local ISP proxies (`src/integrations/supabase/client.ts`).
  - Deep Link Callback: Handled via Capacitor `appUrlOpen` event (`com.swadeshisolutions.app://#access_token=...`) on Android (`src/App.tsx`).

## Monitoring & Observability

**Error Tracking & Diagnostics:**
- Custom Error Boundary: `src/components/ui/error-boundary.tsx` captures unhandled React render errors with recovery options.
- Error Monitoring Hook: `src/hooks/useErrorMonitoring.tsx` logs critical runtime anomalies.
- Database Audit Logging: `audit_logs` table records staff privilege escalation, manual bill discounts, and sensitive data changes (`src/hooks/useAuditLog.ts`).

**Mobile Push Diagnostics:**
- Firebase Cloud Messaging (FCM) integration via `firebase-service-account.json` and `@capacitor/push-notifications`.
- Android device logs tracked via `logcat_push.txt` and `logcat_full.txt` during hardware testing.

## CI/CD & Deployment

**Hosting & Infrastructure:**
- **Web App:** Deployed on Netlify / Vercel with automated Git continuous deployment on pushes to `main`.
  - SPA Rewrites: Configured in `netlify.toml` (`/* -> /index.html 200`) and `nginx.conf`.
  - Reverse Proxy: Configured to route `/api/supabase/*` to Supabase endpoints, neutralizing regional ISP DNS filters in India.
- **Android App:** Built via Gradle inside `android/` directory using npm scripts (`npm run build:apk`, `npm run build:apk:release`).
  - Release distribution managed via `scripts/publish-apk.js`.
- **Edge Functions:** Deployed to Supabase Cloud via Supabase CLI (`npx supabase functions deploy <function-name>`).

## Environment Configuration

**Client-Side (.env):**
- `VITE_SUPABASE_URL`: URL to Supabase project instance (or relative proxy `/api/supabase`).
- `VITE_SUPABASE_ANON_KEY`: Public anonymous API key for browser client authentication.
- `VITE_APP_VERSION`: Current semantic version matching `package.json`.

**Server-Side (Supabase Edge Function Secrets):**
- `SUPABASE_SERVICE_ROLE_KEY`: Elevated administrative database key for background operations and user management.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`: Razorpay gateway API keys.
- `PAYTM_MID`, `PAYTM_MERCHANT_KEY`: Paytm merchant credentials.
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`: Meta Cloud API credentials.
- `MSG91_AUTH_KEY`: MSG91 SMS/WhatsApp gateway credentials.
- `GEMINI_API_KEY`: Google AI Studio API key.
- `RESEND_API_KEY`: Transactional email delivery token.

---

*Integrations analysis: 2026-09-12*
*Update after major dependency changes*
