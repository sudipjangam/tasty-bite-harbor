# Tasty Bite Harbor - Mermaid Flow Diagrams

Last updated: 2026-06-04

## 0. Super Diagram: End-to-End Application Flow (Login to Logout)

```mermaid
graph TD
  Start(["User opens App"]) --> AuthCheck{Session active?}
  AuthCheck -->|No| Login["Auth Page /login"]
  Login --> InputCredentials[Input Email/Password or OTP]
  InputCredentials --> Submit[Submit Login]
  Submit --> AuthSuccess{"Auth successful?"}
  AuthSuccess -->|No| Login
  AuthSuccess -->|Yes| SetSession[Set Session Cookie / Token]
  
  AuthCheck -->|Yes| LoadProfile[Load User Profile & Subscription]
  SetSession --> LoadProfile
  
  LoadProfile --> SubCheck{Subscription active?}
  SubCheck -->|No| SubExpired[Show Subscription Required Page]
  SubExpired --> UpgradePay[Select Plan & Checkout Razorpay/Paytm]
  UpgradePay --> SubCheck
  
  SubCheck -->|Yes| RoleGate{User Role?}
  
  %% Platform Admin Flow
  RoleGate -->|Platform Admin| PlatNav[Platform Admin Dashboard]
  PlatNav --> PlatRest[Manage Restaurants]
  PlatNav --> PlatSubs[Manage Subscription Plans]
  PlatNav --> PlatUsers[Manage Platform Users]
  PlatNav --> PlatTemplates[Review WhatsApp Templates]
  PlatRest & PlatSubs & PlatUsers & PlatTemplates --> PlatLogout[Logout -> Clear Session]
  
  %% Franchise Owner Flow
  RoleGate -->|Franchise Owner| FranNav[Franchise Owner Dashboard]
  FranNav --> FranBranch[Manage Branches]
  FranNav --> FranSync[Menu & Inventory Sync]
  FranNav --> FranStaff[Cross-Branch Staffing]
  FranNav --> FranPnL[Cross-Branch P&L Reports]
  FranBranch & FranSync & FranStaff & FranPnL --> FranLogout[Logout -> Clear Session]
  
  %% Branch Owner / Manager / Staff Flow
  RoleGate -->|Branch Owner / Manager / Staff| SidebarNav[Sidebar Navigation]
  
  %% Operations Section
  SidebarNav --> Operations[Operations Modules]
  Operations --> POSModule["POS / QSR POS / QuickServe"]
  POSModule --> BuildOrder["Build Order & Map Customer"]
  BuildOrder --> HoldOrder["Hold / Recall Order"]
  BuildOrder --> CashCheckout["Cash/Card Payment"]
  BuildOrder --> DigitalPayment["Razorpay/Paytm Dynamic QR"]
  BuildOrder --> SplitBill["Split Billing by Seat/Amount"]
  BuildOrder --> SendKitchen[Send to Kitchen DKS]
  SendKitchen --> KitchenStatus{Kitchen Prep}
  KitchenStatus -->|New| Preparing[Preparing]
  Preparing -->|Done| Ready[Ready for Service]
  Ready --> Fulfill[Fulfill & Complete Order]
  
  %% Guest Services Section
  SidebarNav --> GuestServices[Guest Services Modules]
  GuestServices --> RoomMgmt["Rooms & Reservations"]
  RoomMgmt --> BookRoom["Book Room / Check-In"]
  BookRoom --> RoomBill[Room Service billing]
  BookRoom --> RoomMove["Room Move / Checkout"]
  GuestServices --> Housekeeping["Housekeeping & Maintenance"]
  Housekeeping --> UpdateStatus["Dirty/Clean/Maintenance status"]
  
  %% Inventory Section
  SidebarNav --> Inventory["Inventory & Menu"]
  Inventory --> InvItems[Inventory Stock Control]
  InvItems --> AutoAlert["Low Stock Alert -> Auto PO suggestions"]
  Inventory --> Recipes[Recipe Costing]
  Recipes --> YieldCalc["Ingredient Costing & Yields"]
  Recipes --> DeductInv[Deduct Inventory on Prep]
  
  %% Analytics & CRM Section
  SidebarNav --> ReportsCRM["Reports, CRM & Marketing"]
  ReportsCRM --> Reports["Business Intelligence & P&L"]
  Reports --> Financials["Default/Custom Reports & P&L"]
  Reports --> NCOrders[Non-Chargeable Orders Tracking]
  ReportsCRM --> CRM["Customer Database & Loyalty"]
  CRM --> EnrollLoyalty[Enroll in Loyalty Tier]
  CRM --> Marketing["WhatsApp Campaigns / Templates"]
  
  %% Staff Section
  SidebarNav --> StaffSection["Staff & Shifts"]
  StaffSection --> TimeClock["Time Clock: Clock In / Clock Out"]
  TimeClock --> AutoClockOut[Auto-Clock-Out cron job]
  StaffSection --> ShiftSchedules["Shift Schedules & Leave Requests"]
  
  %% AI Assistant
  SidebarNav --> AIAssistant[AI Assistant chatbot]
  
  %% Settings & Security
  SidebarNav --> SettingsSection["System Settings & Security"]
  SettingsSection --> ConfigStore["Store Operating Hours, Currency, etc."]
  SettingsSection --> AuditLogs[View Security Audit Logs]
  
  %% Global Logout Action
  Fulfill & RoomMove & UpdateStatus & AutoAlert & YieldCalc & Financials & NCOrders & EnrollLoyalty & AutoClockOut & AIAssistant & ConfigStore & AuditLogs --> LogoutBtn[Click Logout Button]
  LogoutBtn --> ClearSession[Clear Supabase Auth Session]
  ClearSession --> RedirectAuth["Redirect to /auth"]
  RedirectAuth --> End([Exit])
```

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

## 16. Reports Dashboard and Tab-Level Gating Flow

```mermaid
flowchart TD
  A["User clicks Reports /reports"] --> B["Route PermissionGuard check (analytics.view)"]
  B -->|Denied| C["Access Denied / Redirect"]
  B -->|Allowed| D["Load Reports Page Dashboard"]
  D --> E["Render Tabs with FeatureLock checks"]
  
  E --> E1["Advanced Analytics Tab Trigger"]
  E --> E2["Default Reports Tab Trigger"]
  E --> E3["Custom Builder Tab Trigger"]
  E --> E4["Export Center Tab Trigger"]
  E --> E5["NC Orders Tab Trigger"]
  
  E1 -->|Locked| L1["Show lock overlay / Upgrade toast"]
  E1 -->|Unlocked| U1["Render AdvancedAnalytics (lazy)"]
  
  E5 -->|FeatureGate: orders.nc_orders Locked| L5["Show lock overlay / Upgrade toast"]
  E5 -->|FeatureGate: orders.nc_orders Unlocked| U5["Render NCOrdersReport (lazy)"]
  
  U5 --> F["Fetch unified orders with NC filters (no 30-day cap)"]
  F --> G["Date Range Picker selection (Presets / Custom)"]
  G --> H["Update useReportsData queries"]
  H --> I["Display 3D Glassmorphic UI metric cards"]
  H --> J["Display Reason Breakdown chart & Trend chart"]
  H --> K["Search/sort/filter list view + detailed modal view"]
```

## 17. POS Order & Billing Flow

```mermaid
flowchart TD
  Start(["Select POS Mode: Dine-In / QSR / QuickServe"]) --> Menu["Browse Menu Items & Categories"]
  Menu --> Select["Select item variant / Add customization modifiers"]
  Select --> Cart["Add to Cart / Update quantities"]
  
  Cart --> CustomerMap["Search/Add Customer (for CRM & Loyalty points)"]
  CustomerMap --> Action{Order Type?}
  
  Action -->|Dine-In| TableMap["Assign Table / Seat number"]
  TableMap --> HoldOrder["Hold Order (Keep table bill open)"]
  HoldOrder --> PrintKOT["Send KOT (Kitchen Order Ticket) to Kitchen Display"]
  
  Action -->|QSR / Takeaway| DirectPay["Trigger Checkout"]
  
  HoldOrder --> RecallOrder["Recall Order (Add more items)"]
  RecallOrder --> Cart
  
  %% Billing Actions
  PrintKOT --> BillRequest["Generate Bill Request"]
  BillRequest --> SplitBill{Split Bill needed?}
  SplitBill -->|Yes| SplitMethod["Split by Seat / Equal Parts / Custom Amounts"]
  SplitMethod --> ProcessCheckout["Process individual payments"]
  SplitBill -->|No| ProcessCheckout
  DirectPay --> ProcessCheckout
  
  ProcessCheckout --> PayMethod{Payment Method?}
  PayMethod -->|Cash / Card| CloseBill["Record payment & print invoice receipt"]
  PayMethod -->|Digital QR| SupaQR["Supabase Edge Function: create-payment-qr / create-paytm-qr"]
  SupaQR --> ShowQR["Render Dynamic UPI QR on terminal screen"]
  ShowQR --> PollPayment["Poll/Webhook payment status (verify-razorpay-payment / paytm-webhook)"]
  PollPayment -->|Success| CloseBill
  
  CloseBill --> RewardPoints["Credit Loyalty points based on tier conversion rate"]
  RewardPoints --> CloseOrder["Set orders_unified status = completed"]
  CloseOrder --> DBUpdate["Update DB -> Invalidate query cache"]
  DBUpdate --> End(["End"])
```

## 18. Room Booking & Housekeeping Lifecycle

```mermaid
stateDiagram-v2
  [*] --> Available : Room default state
  Available --> Reserved : Guest Books Room (reservations table)
  Reserved --> Occupied : Guest Check-In (create check_ins & room_billings)
  Occupied --> StayActive : Room Service & Food Orders (add to room_billings)
  StayActive --> SplitBill : Check-out -> Process payments / Split invoice
  SplitBill --> Dirty : Check-out complete (guest leaves)
  Dirty --> CleaningInProgress : Housekeeper starts task (room_cleaning_schedules)
  CleaningInProgress --> MaintenanceRequired : Issue found -> Log room_maintenance_requests
  MaintenanceRequired --> CleaningInProgress : Maintenance resolves issue
  CleaningInProgress --> Cleaned : Housekeeper finishes task
  Cleaned --> InspectionsPassed : Supervisor inspects room
  InspectionsPassed --> Available : Reset room status to Available
```

## 19. Recipe Costing & Inventory Flow

```mermaid
flowchart TD
  AddRecipe["Create Recipe (recipes table)"] --> AddIngredient["Link Inventory Items as Ingredients (recipe_ingredients)"]
  AddIngredient --> SetQuantity["Specify quantity needed + yield percentage"]
  SetQuantity --> CalcCost["System calculates unit ingredient cost"]
  CalcCost --> SumCost["Sum ingredient costs to determine Total Prep Cost"]
  SumCost --> ProfitMargin["Analyze markup / Set target sales price"]
  
  %% Trigger event
  KitchenPrep["Kitchen finishes preparing item / Order is completed"] --> TriggerDeduct["Supabase Edge Function: deduct-inventory-on-prep"]
  TriggerDeduct --> MatchRecipe["Find recipe associated with menu_item"]
  MatchRecipe --> LoopIngredients["Loop through each ingredient"]
  LoopIngredients --> DeductQty["Subtract (ingredient quantity * order quantity / yield) from inventory_items"]
  DeductQty --> LogTransaction["Log record in inventory_transactions (type = deduction)"]
  
  LogTransaction --> CheckStock["Check if quantity < reorder_level"]
  CheckStock -->|Yes| TriggerAlert["Create inventory_alerts (status = active)"]
  TriggerAlert --> SendNotification["Trigger check-low-stock notification"]
  CheckStock -->|No| End(["Done"])
```

## 20. Staff Shifts & Shift Automation Flow

```mermaid
flowchart TD
  ClockIn["Staff Clocks In (useAutoClockOut / record-clock-entry)"] --> RecordEntry["Create staff_time_clock entry"]
  RecordEntry --> ActiveShift["Status set to Active"]
  
  %% Daily operations
  ActiveShift --> DayPasses["Shift duration passes"]
  
  %% Clock out flows
  ActiveShift --> ManualOut["Staff manually Clocks Out"]
  ManualOut --> CompleteEntry["Set clock_out time & calculate total hours"]
  
  ActiveShift --> Forgotten["Staff forgets to Clock Out"]
  Forgotten --> CronTrigger["Supabase Edge Function Cron: check-missed-clocks / auto-clock-out"]
  CronTrigger --> FindMissed["Query active time clocks older than shift threshold (e.g., 12h)"]
  FindMissed --> AutoOut["Force clock_out to scheduled shift end & mark auto_clocked_out = true"]
  
  CompleteEntry & AutoOut --> ShiftSummary["Log shift summary & update staff_shift_assignments"]
  ShiftSummary --> End(["End"])
```

## 21. CRM, WhatsApp Campaigns & Marketing

```mermaid
sequenceDiagram
  participant Owner as Marketing Dashboard
  participant DB as Supabase DB
  participant EF as send-msg91-whatsapp / send-whatsapp
  participant MSG as MSG91 / Twilio API
  participant Cust as Customer Phone
  
  Owner->>DB: Create whatsapp_templates (name, type, body, parameters)
  Owner->>EF: Submit template to MSG91/Meta for approval
  EF->>MSG: Submit Template API
  MSG-->>EF: Pending status
  EF->>DB: Update template status = pending
  
  Note over Owner, DB: Background Sync Cron (sync-msg91-template-status)
  
  Owner->>DB: Create promotion_campaigns (segment criteria, template selection)
  Owner->>EF: Trigger send campaign
  EF->>DB: Fetch customers matching segment (e.g., active in 30 days, high tier)
  DB-->>EF: List of customer phone numbers
  
  loop Every Target Customer
    EF->>MSG: Send template message with dynamic parameters
    MSG->>Cust: Deliver WhatsApp Message
    MSG-->>EF: Delivery Status callback
    EF->>DB: Log to whatsapp_campaign_sends (status = sent/delivered)
    EF->>DB: Insert customer_activities (type = marketing_msg)
  end
  
  EF-->>Owner: Campaign completed report
```

## 22. Detailed Inventory Replenishment & Supplier Flow

```mermaid
flowchart TD
  Alert["Inventory Item quantity falls below reorder_level"] --> Trigger["Generate low-stock alert"]
  Trigger --> ViewInv["Manager views Inventory Alerts screen"]
  ViewInv --> AutoPO["System suggests replenishment quantity & Supplier based on supplier_orders history"]
  
  AutoPO --> CreatePO["Create Purchase Order (purchase_orders table)"]
  CreatePO --> AddPOItems["Add items and costs (purchase_order_items table)"]
  AddPOItems --> SendPO["Send PO to Supplier (Email / WhatsApp PDF)"]
  
  SendPO --> SupplierDeliver["Supplier delivers stock items"]
  SupplierDeliver --> RecvPO["Receive PO in system"]
  
  RecvPO --> CreateLot["Create Inventory Batch/Lot record"]
  CreateLot --> UpdateInv["Increment inventory_items quantity (on-hand stock)"]
  UpdateInv --> LogTrans["Log inventory_transactions (type = replenishment)"]
  LogTrans --> AccountsPayable["Generate supplier invoice billing in accounts payable"]
  AccountsPayable --> End(["End"])
```

## 23. Detailed Recipe & Preparation Deductions Flow

```mermaid
flowchart TD
  EventSource{Trigger Event?}
  
  EventSource -->|POS Direct Checkout| POSCheckout["Order completed in QSR/QuickServe"]
  EventSource -->|Kitchen KDS Done| KDSPrep["Chef marks kitchen_orders item as 'Ready'"]
  EventSource -->|Manual Production| BatchProd["Chef logs Batch Production (batch_productions table)"]
  
  POSCheckout & KDSPrep --> EdgeFn["Invoke deduct-inventory-on-prep edge function"]
  
  EdgeFn --> CheckRecipe{"Does Menu Item have a recipe?"}
  CheckRecipe -->|No| NoDeduct["No stock deduction (Direct retail item)"]
  CheckRecipe -->|Yes| FetchIngredients["Fetch ingredients from recipe_ingredients"]
  
  FetchIngredients --> DeductOnHand["Deduct (ingredient quantity * item quantity / yield) from inventory_items"]
  
  BatchProd --> FetchPrepRecipe["Fetch prep recipe (e.g. sauce recipe)"]
  FetchPrepRecipe --> DeductPrepIngredients["Deduct base raw ingredients from inventory_items"]
  DeductPrepIngredients --> AddPrepItem["Add finished prep item (e.g. 5L Marinara Sauce) to inventory_items"]
  
  DeductOnHand & AddPrepItem --> LogInvTrans["Create inventory_transactions record"]
  LogInvTrans --> CheckAlerts{"Stock < reorder_level?"}
  CheckAlerts -->|Yes| SetAlert["Create active inventory_alerts record"]
  CheckAlerts -->|No| Done(["Done"])
```

## 24. Franchise Menu Sync Flow

```mermaid
flowchart TD
  Parent["Franchise Owner creates menu_items on parent branch"] --> SelectBranches["Select child branches to sync to"]
  SelectBranches --> ClickSync["Click Sync Menu button"]
  
  ClickSync --> SupaSync["Invoke sync-channels / menu-sync function"]
  SupaSync --> FetchChildren["Fetch active child branch restaurant IDs"]
  
  FetchChildren --> LoopBranches["Loop through each child branch"]
  LoopBranches --> MatchItems{"Check if menu_item exists on child?"}
  
  MatchItems -->|Yes| UpdateItem["Update child menu_items / menu_item_variants matching franchise_parent_id"]
  MatchItems -->|No| CreateItem["Insert new menu_items / menu_item_variants copying details"]
  
  UpdateItem & CreateItem --> InvalidateCache["Invalidate child branch queryCache on active client sessions"]
  InvalidateCache --> SyncSuccess["Log Sync status to sync_logs table"]
  SyncSuccess --> End(["Sync complete"])
```

**Description:**
The franchise menu sync ensures menu consistency across branches. Parent items are pushed using unique identifiers (`franchise_parent_id`) allowing update and insert operations.

## 25. Offline PWA IndexedDB Write Queue Sync Flow

```mermaid
flowchart TD
  UserAction["User performs action (e.g. Save Order) when offline"] --> SWCheck{"Service Worker checks network status"}
  SWCheck -->|Offline| Enqueue["Insert transaction into IndexedDB writeQueue table"]
  Enqueue --> UI["Update UI with local cache & show offline badge"]
  
  UI --> NetworkRestored["Device gains network connection"]
  NetworkRestored --> TriggerSync["Service Worker triggers sync event (flushQueue)"]
  
  TriggerSync --> ReadQueue["Read transactions from IndexedDB in timestamp order"]
  ReadQueue --> SubmitServer["Post items to Supabase DB endpoints"]
  SubmitServer --> ConflictCheck{"Conflict / Version mismatch?"}
  
  ConflictCheck -->|No| RemoveQueue["Delete transaction from IndexedDB writeQueue"]
  ConflictCheck -->|Yes| ResolveConflict["Resolve using Last-Write-Wins or flag for Manager review"]
  
  RemoveQueue & ResolveConflict --> ClearOffline["Clear offline UI badges and trigger query refetch"]
  ClearOffline --> End(["Queue fully synced"])
```

**Description:**
Enables full offline operations in remote areas. All write operations are queued in local IndexedDB until connection is restored.

## 26. Paytm Webhook & Payment Processing Flow

```mermaid
sequenceDiagram
  participant Client as POS Terminal / Customer Order App
  participant EF as Paytm Webhook Edge Function
  participant PT as Paytm Payment Gateway
  participant DB as Supabase Postgres Database
  
  Client->>PT: Initiate payment request (amount, transaction_id)
  PT-->>Client: Generate Dynamic UPI Intent String / QR Code
  Client->>Client: Render QR on screen / User scans
  
  Note over Client, PT: User authenticates and authorizes UPI transaction
  
  PT->>EF: HTTP POST Webhook (Transaction Status Callback)
  EF->>EF: Verify Request Signature (HMAC validation using merchant key)
  
  alt Signature Verified & Status is SUCCESS
    EF->>DB: Update payments / payment_transactions table (status = success)
    EF->>DB: Update orders_unified table (status = completed, payment_status = paid)
    EF-->>PT: HTTP 200 OK (Acknowledge callback)
    DB-->>Client: Realtime notification (Supabase Broadcast Channel)
    Client->>Client: Close billing screen and print invoice receipt
  else Signature Verification Failed or Status is FAILED
    EF->>DB: Update payments table (status = failed)
    EF-->>PT: HTTP 400 Bad Request
    DB-->>Client: Realtime alert message (Payment Failed)
  end
```

**Description:**
Secures and automates UPI digital payments by subscribing to Paytm transaction hooks, validating payload signatures, and updating order status in real time.

## 27. Hotel Night Audit & Ledger Reconciliation Flow

```mermaid
flowchart TD
  TriggerAudit["Cron trigger / Manual launch of Night Audit"] --> CloseDay["Lock all transaction entries for previous calendar day"]
  CloseDay --> ProcessShow["Auto-charge No-Shows / Cancel expired bookings"]
  ProcessShow --> PostRoomCharge["Post room rates & taxes to active check_ins (generate room_billings lines)"]
  
  PostRoomCharge --> Summarize["Calculate Daily Revenue stats (daily_revenue_stats)"]
  Summarize --> ReconCash["Compare physical cash/card drops against system journal entries"]
  
  ReconCash --> MatchLedger{"Reconciliation balance matches?"}
  MatchLedger -->|Yes| SuccessAudit["Close Day & increment hotel accounting date"]
  MatchLedger -->|No| FlagAudit["Flag discrepancy in night_audit_logs & notify GM"]
  
  SuccessAudit & FlagAudit --> GenerateReport["Create daily_summary_reports record"]
  GenerateReport --> End(["Night Audit complete"])
```

**Description:**
Ensures hotel account accuracy at the end of each day by posting room charges, tracking active occupancy metrics, and generating financial reconciliations.

## 28. OTA Channel Management & Parity Sync Flow

```mermaid
flowchart TD
  UpdateRoom["Room status / Inventory updates in local PMS"] --> ChannelSync["Trigger channel-sync edge function"]
  ChannelSync --> FetchOTA["Fetch registered OTA credentials (ota_credentials)"]
  FetchOTA --> DirectOTA["Send rate & availability updates to OTAs (Booking.com, Expedia, etc.)"]
  
  DirectOTA --> ParityJob["Background Cron: rate_parity_checks"]
  ParityJob --> ScrapeOTA["Fetch live prices from booking channels"]
  ScrapeOTA --> VerifyParity{"Are prices identical to local PMS rates?"}
  VerifyParity -->|Yes| End(["No action"])
  VerifyParity -->|No| AlertParity["Create rate_parity_checks alert & email warning to manager"]
```

**Description:**
Maintains rate consistency across different online travel agencies (OTAs) and direct booking channels to prevent OTA penalties and ensure maximum profit margins.

## 29. Split Billing & Invoice Calculation Flow

```mermaid
flowchart TD
  RequestSplit["Request Split Bill from POS screen"] --> CheckMethod{Split Method?}
  
  CheckMethod -->|Split by Seat| MapSeat["Group order_items by target customer seat number"]
  CheckMethod -->|Equal Split| CalcDivide["Divide total bill amount equally by N portions"]
  CheckMethod -->|Custom Amount| CustomInput["Manager inputs manual amounts for each portion"]
  
  MapSeat & CalcDivide & CustomInput --> CreateSplit["Create split_bills record"]
  CreateSplit --> CreatePortions["Create split_bill_portions records (status = unpaid)"]
  
  CreatePortions --> ProcessPay["Collect payment for a portion"]
  ProcessPay --> UpdatePortion["Mark split_bill_portions status = paid & link payment_id"]
  
  UpdatePortion --> AllPaid{"Are all portions paid?"}
  AllPaid -->|No| WaitPay["Hold main order status = open / partially_paid"]
  AllPaid -->|Yes| CloseMain["Mark parent orders_unified status = completed & paid"]
  CloseMain --> End(["End"])
```

**Description:**
Handles complex dining scenarios by allowing a single table invoice to be split into multiple payments (either equally, by seat, or custom amounts) while keeping track of paid/unpaid status.


