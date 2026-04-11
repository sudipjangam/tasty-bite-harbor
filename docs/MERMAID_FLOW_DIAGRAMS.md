# Tasty Bite Harbor - Mermaid Flow Diagrams

Last updated: 2026-04-11

## 1. End-to-End System Context

```mermaid
flowchart LR
  U["User (Web/Mobile Browser)"] --> FE["React + Vite SPA"]
  FE --> SW["Service Worker (PWA Cache + Sync Trigger)"]
  FE --> RQ["TanStack Query Cache"]
  FE --> SBJS["Supabase JS Client"]
  SBJS --> AUTH["Supabase Auth"]
  SBJS --> RT["Supabase Realtime"]
  SBJS --> DB["Postgres (RLS + Policies)"]
  SBJS --> EF["Supabase Edge Functions"]
  EF --> DB
  EF --> EXT1["Razorpay / Paytm"]
  EF --> EXT2["Twilio / WhatsApp"]
  EF --> EXT3["Gemini API"]
  FE --> IDB["IndexedDB (offlineDB + writeQueue)"]
  SW --> IDB
  RT --> RQ
```

## 2. Frontend Boot and Provider Initialization

```mermaid
flowchart TD
  A["main.tsx"] --> B["App.tsx"]
  B --> C["QueryClientProvider"]
  C --> D["ThemeProvider"]
  D --> E["TooltipProvider"]
  E --> F["AuthProvider"]
  F --> G["AccessProvider"]
  G --> H["CurrencyProvider"]
  H --> I["NetworkStatusProvider"]
  I --> J["ErrorBoundary"]
  J --> K["BrowserRouter"]
  K --> L["AppWithRealtime"]
  L --> M["useRealtimeAnalytics()"]
  L --> N["useOfflineCache()"]
  L --> O["registerServiceWorker()"]
  L --> P["Routes"]
```

## 3. Auth and Routing Decision Flow

```mermaid
flowchart TD
  A["App Loads"] --> B["useAuth.loading?"]
  B -->|Yes| C["Show Spinner"]
  B -->|No| D["user exists?"]
  D -->|No| E["Public Routes"]
  E --> E1["Landing / Auth / Public Bill / Public Order / Invoice"]
  D -->|Yes| F["Authenticated Router"]
  F --> G["/subscription direct page (standalone)"]
  F --> H["Dashboard Routes"]
  H --> I["SubscriptionGate"]
  I -->|Active| J["AppRoutes (Sidebar + Pages)"]
  I -->|Expired| K["Redirect to /subscription"]
```

## 4. Layered Access Control Model

```mermaid
flowchart TD
  A["User navigates to protected route"] --> B["SubscriptionGate check"]
  B -->|Fail| X["Redirect /subscription"]
  B -->|Pass| C["PermissionGuard route check"]
  C --> D["Map route to subscription component key"]
  D --> E["useSubscriptionAccess()"]
  E -->|No access| Y["Feature Not Available screen"]
  E -->|Access| F["useAuth.hasPermission()"]
  F -->|Denied| Z["Permission denied / fallback"]
  F -->|Allowed| G["Render page"]
  G --> H["Nested FeatureLock checks"]
  H -->|Locked| I["Show lock overlay + upgrade toast"]
  H -->|Unlocked| J["Allow interaction"]
```

## 5. Subscription and Feature Entitlement Flow

```mermaid
flowchart LR
  A["restaurant_subscriptions"] --> B["active plan_id"]
  B --> C["subscription_plans.components[]"]
  C --> D["useSubscriptionAccess.hasSubscriptionAccess(component)"]
  C --> E["useFeatureGate.hasFeatureAccess(featureKey)"]
  D --> F["PermissionGuard route-level allow/deny"]
  E --> G["FeatureLock UI-level allow/lock"]
  H["Platform Admin: SubscriptionManager / FeaturePermissions"] --> C
```

## 6. Frontend to Backend Data Request Flow

```mermaid
sequenceDiagram
  participant UI as "React Component"
  participant HK as "Custom Hook"
  participant RQ as "TanStack Query"
  participant SB as "Supabase JS"
  participant DB as "Postgres"
  UI->>HK: "Request data / trigger mutation"
  HK->>RQ: "useQuery / useMutation"
  RQ->>SB: "from(...).select()/insert()/update()"
  SB->>DB: "SQL via PostgREST"
  DB-->>SB: "Rows / Error (RLS enforced)"
  SB-->>RQ: "Result"
  RQ-->>HK: "Cache update + status"
  HK-->>UI: "Render data / toast / loading"
```

## 7. Realtime Update and Cache Invalidation Flow

```mermaid
flowchart TD
  A["DB row change (orders / kitchen_orders / inventory / etc.)"] --> B["Supabase Realtime Event"]
  B --> C["useRealtimeAnalytics / useRealtimeSubscription listener"]
  C --> D["queryClient.invalidateQueries(queryKey)"]
  D --> E["Affected hooks refetch"]
  E --> F["UI refreshes with latest data"]
```

## 8. Offline Queue and Sync Recovery Flow

```mermaid
flowchart TD
  A["User action (write)"] --> B["Network online?"]
  B -->|Yes| C["Write directly to Supabase"]
  B -->|No| D["enqueueWrite() to IndexedDB writeQueue"]
  D --> E["UI shows pending/offline state"]
  E --> F["Connectivity restored OR SW sync event"]
  F --> G["flushQueue()"]
  G --> H["Replay writes in timestamp order"]
  H --> I["Conflict check (last-write-wins)"]
  I --> J["Success -> remove queue item"]
  I --> K["Server newer -> log conflictLog"]
  J --> L["Invalidate/refetch queries"]
```

## 9. POS to Kitchen to Order Lifecycle

```mermaid
stateDiagram-v2
  [*] --> BuildingOrder
  BuildingOrder --> Held: "Hold order"
  Held --> BuildingOrder: "Recall"
  BuildingOrder --> SentToKitchen: "Send to kitchen"
  SentToKitchen --> KitchenNew: "kitchen_orders.status = new"
  KitchenNew --> Preparing: "Kitchen starts prep"
  Preparing --> Ready: "Prep complete"
  Ready --> Completed: "Order fulfilled + paid"
  Completed --> [*]
```

## 10. Reservation Flow (Table and Room)

```mermaid
flowchart TD
  A["Create Reservation Request"] --> B["Type?"]
  B -->|Table| C["Insert table_reservations"]
  B -->|Room| D["Insert reservations"]
  D --> E["Update room status (occupied/available)"]
  C --> F["UnifiedReservationsList"]
  E --> F
  F --> G["Status update actions"]
  G --> H["Mutations + query invalidation"]
  H --> I["Realtime updates reflected"]
```

## 11. Inventory Low Stock and Purchase Intelligence Flow

```mermaid
flowchart LR
  A["Inventory item changes"] --> B["Inventory page query/refetch"]
  B --> C["Low stock condition met?"]
  C -->|Yes| D["Invoke check-low-stock edge function"]
  D --> E["Generate alerts / notification actions"]
  B --> F["PO tab + Suggestions tab"]
  F --> G["Create purchase_order + purchase_order_items"]
  G --> H["Stock received -> lots + transactions"]
  H --> I["inventory_items quantity updates"]
```

## 12. Subscription Payment Activation Flow (Razorpay)

```mermaid
sequenceDiagram
  participant FE as "Subscription UI"
  participant E1 as "create-razorpay-order"
  participant RZ as "Razorpay"
  participant E2 as "verify-razorpay-payment"
  participant DB as "Postgres"
  FE->>E1: "planId + restaurantId"
  E1->>RZ: "Create order"
  RZ-->>E1: "order_id"
  E1->>DB: "upsert restaurant_subscriptions status=pending"
  E1-->>FE: "order + key_id"
  FE->>RZ: "Open checkout"
  RZ-->>FE: "payment_id + signature"
  FE->>E2: "Verify payment payload"
  E2->>E2: "HMAC signature validation"
  E2->>DB: "upsert restaurant_subscriptions status=active"
  E2->>DB: "set current_period_start/end"
  E2-->>FE: "Success + active subscription details"
```

## 13. AI Assistant Flow

```mermaid
sequenceDiagram
  participant UI as "AI Page / Chat UI"
  participant EF as "chat-with-gemini"
  participant SA as "Supabase Auth (token)"
  participant DB as "Postgres"
  participant AI as "Gemini API"
  UI->>EF: "messages + auth header"
  EF->>SA: "Validate token"
  EF->>DB: "Fetch user profile -> restaurant_id"
  EF->>DB: "Fetch restaurant domain data"
  EF->>AI: "Prompt + contextualized data"
  AI-->>EF: "Generated analysis"
  EF-->>UI: "Chat response / predictions"
```

## 14. Platform Admin Onboarding and Control Flow

```mermaid
flowchart TD
  A["Platform Admin"] --> B["Create Restaurant"]
  B --> C["Insert restaurants record"]
  C --> D["Assign subscription plan"]
  D --> E["Create restaurant_subscriptions row"]
  B --> F["Invoke user-management edge fn (owner user)"]
  B --> G["Seed system roles"]
  A --> H["SubscriptionManager"]
  H --> I["Manage plan metadata"]
  H --> J["Manage components/feature entitlements"]
  J --> K["subscription_plans.components[] updated"]
  K --> L["Runtime gating changes take effect"]
```

## 15. Deployment and Network Proxy Flow

```mermaid
flowchart LR
  U["Browser"] --> APP["Vite SPA (Netlify/Vercel)"]
  APP --> API["/api/supabase/* proxy path"]
  API --> SB["https://<project>.supabase.co/*"]
  APP --> SW["/sw.js + /version.json"]
  SW --> CACHE["Runtime cache/version control"]
```

