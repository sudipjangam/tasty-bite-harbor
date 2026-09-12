# Technology Stack

**Analysis Date:** 2026-09-12

## Languages

**Primary:**
- TypeScript 5.5.3 - All application source code, type definitions, route definitions, and configuration (`src/**/*.ts`, `src/**/*.tsx`)

**Secondary:**
- JavaScript / ESM - Build scripts, Capacitor sync, version management, service worker (`public/sw.js`, `scripts/*.js`, `eslint.config.js`)
- SQL / PL/pgSQL - Supabase database schemas, functions, triggers, and Row Level Security (RLS) policies (`supabase/migrations/*.sql`)
- HTML5 / CSS3 - Base markup and styling primitives (`index.html`, `src/index.css`, `src/App.css`, Tailwind utility classes)

## Runtime

**Environment:**
- Node.js >=20.x - Development server, build pipelines, and maintenance scripting
- Modern Evergreen Web Browsers - Chrome, Edge, Safari, Firefox (supporting ES2022, CSS Grid, WebSockets, Service Workers, IndexedDB)
- Android WebView / Native Hybrid - Android 8.0+ (API Level 26+) running via Capacitor 8.3.0 container
- Deno (Supabase Edge Functions runtime) - Serverless backend functions in `supabase/functions/`

**Package Manager:**
- npm 10.x & Bun - Dependency management
- Lockfiles: `package-lock.json` and `bun.lock` present in root

## Frameworks

**Core:**
- React 18.3.1 - Component-based UI library
- Vite 7.3.5 - Next-generation frontend tooling and bundler
- React Router DOM 6.26.2 - Client-side SPA routing and nested layouts (`src/components/Auth/Routes.tsx`, `src/components/Auth/AppRoutes.tsx`)
- TanStack React Query 5.56.2 - Asynchronous server state caching, background synchronization, and optimistic updates
- Tailwind CSS 3.4.11 - Utility-first CSS framework with typography and animation plugins (`tailwind.config.ts`, `postcss.config.js`)
- Radix UI Primitives (`@radix-ui/*`) & shadcn/ui - Accessible, headless component foundations (`src/components/ui/`)

**Mobile & Hardware:**
- Capacitor 8.3.0 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`) - Native mobile runtime bridge
- `@capacitor/push-notifications` 8.1.2 & `@capacitor/local-notifications` 8.2.1 - Native push and local notification handling
- `@aparajita/capacitor-biometric-auth` 10.0.0 - Hardware biometric authentication (fingerprint/face recognition) for POS staff login
- `cordova-plugin-bluetooth-serial` 0.4.7 - Bluetooth serial communication for thermal receipt and KOT printers

**Visualizations & Graphics:**
- Recharts 2.12.7 & Highcharts 12.1.2 (`highcharts-react-official` 3.2.1) - Financial analytics and business intelligence charts
- Pixi.js 8.6.6 & Three.js 0.184.0 (`react-force-graph-3d` 1.29.1) - 2D canvas rendering and 3D digital twin floor maps
- Framer Motion 12.40.0 - Interactive UI micro-animations and page transitions

**Testing:**
- Vitest 4.0.15 - Blazing fast unit and integration test runner (`vite.config.ts`, `src/tests/setup.ts`)
- JSDOM 27.3.0 - DOM simulation environment for headless component testing
- Testing Library (`@testing-library/react` 16.3.0, `@testing-library/jest-dom` 6.9.1) - UI assertion matchers

**Build/Dev:**
- `@vitejs/plugin-react-swc` 3.5.0 - Fast React compilation via Speedy Web Compiler (SWC)
- TypeScript Compiler 5.5.3 (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`)
- ESLint 9.9.0 (`eslint.config.js`) with React hooks and refresh plugins
- `lovable-tagger` 1.1.7 - Development environment UI element inspector

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.49.1 - Database connection, Auth sessions, Storage buckets, and Realtime WebSocket channels (`src/integrations/supabase/client.ts`)
- `@tanstack/react-query` 5.56.2 - Primary server state management layer with cache invalidation policies
- `zod` 3.25.76 - Runtime schema validation and form parsing (`src/types/`, `src/components/`)
- `react-hook-form` 7.53.0 & `@hookform/resolvers` 3.9.0 - Form state management and schema resolution
- `idb` 8.0.3 - Promised IndexedDB wrapper powering offline order caching and menu availability (`src/hooks/useOfflineCache.ts`)

**Infrastructure & Utilities:**
- `lucide-react` 0.462.0 - Icon system across entire navigation and UI
- `date-fns` 3.6.0 - Date math, formatting, and scheduling calculations
- `jspdf` 4.2.1, `jspdf-autotable` 5.0.7, `html2canvas` 1.4.1, `html2pdf.js` 0.14.0 - Client-side receipt, KOT, and invoice PDF generation
- `exceljs` 4.4.0 & `xlsx` 0.20.2 - Excel workbook export and import processing for reports and inventory
- `qrcode` 1.5.4 & `jsqr` 1.4.0 - Dynamic QR code generation for payments and QR code camera scanning
- `dompurify` 3.2.6 - XSS protection for rendered HTML templates

## Configuration

**Environment:**
- `.env` and `.env.example` - Client environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_VERSION`)
- `supabase/functions/.env` - Server-side secrets for Edge functions (Payment API keys, WhatsApp tokens, Gemini API keys)

**Build:**
- `vite.config.ts` - Bundle chunking configuration, ISP proxy routing, Service Worker cache-busting, and test runner setup
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` - Path alias `@/* -> ./src/*`, strict typechecking rules
- `capacitor.config.ts` - Mobile app ID (`com.swadeshisolutions.app`), app name (`Tasty Bite Harbor`), and native webview settings
- `nginx.conf` - Web production reverse proxy and static routing configuration
- `docker-compose.yml` & `Dockerfile` - Containerized deployment configuration

## Platform Requirements

**Development:**
- Windows, macOS, or Linux with Node.js 20+ and npm or Bun
- Android Studio (Electric Eel or newer) with Android SDK 34+ for mobile APK builds
- Supabase CLI (`supabase` 2.101.0) for local database migrations and edge function development

**Production:**
- Web Hosting: Netlify, Vercel, or custom Docker container on Nginx
- Database & Backend: Supabase Managed Cloud (PostgreSQL 15+, Supabase Auth, Storage, Edge Functions)
- Mobile App: Android 8.0+ devices (distributed as debug/release APKs via `scripts/publish-apk.js`)

---

*Stack analysis: 2026-09-12*
*Update after major dependency changes*
