# 🏗️ Developer Architecture Guide

> **⚠️ LOCAL-ONLY DOCUMENTATION**  
> This file is gitignored and for developer reference only. Do not commit to version control.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Application Flow](#application-flow)
3. [Module Dependencies](#module-dependencies)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Authentication & Authorization Flow](#authentication--authorization-flow)
6. [Order Processing Flow](#order-processing-flow)
7. [Kitchen Display System Flow](#kitchen-display-system-flow)
8. [Reservation System Flow](#reservation-system-flow)
9. [Room Management Flow](#room-management-flow)
10. [Inventory Management Flow](#inventory-management-flow)
11. [Payment Processing Flow](#payment-processing-flow)
12. [Real-time Subscriptions](#real-time-subscriptions)
13. [Edge Function Architecture](#edge-function-architecture)
14. [Component Hierarchy](#component-hierarchy)
15. [Database Entity Relationships](#database-entity-relationships)

---

## System Architecture

```mermaid
---
id: 0512bb6a-4963-4bf1-be6b-0ca8e5cd5581
---
graph TB
    subgraph Client["🖥️ Frontend - React + TypeScript"]
        App[App.tsx]
        
        subgraph Providers["Context Providers"]
            QC[QueryClient Provider]
            Theme[ThemeProvider]
            Auth[AuthProvider]
            Access[AccessProvider]
            Tooltip[TooltipProvider]
        end
        
        subgraph Routing["Routing Layer"]
            Router[BrowserRouter]
            AppRoutes[AppRoutes.tsx]
            PermGuard[PermissionGuard]
        end
        
        subgraph Pages["34 Pages"]
            Dashboard[Dashboard]
            Orders[Orders]
            POS[POS]
            Kitchen[Kitchen]
            Menu[Menu]
            Inventory[Inventory]
            Rooms[Rooms]
            Staff[Staff]
            Analytics[Analytics]
            More[... 25 more]
        end
        
        subgraph Components["350+ Components"]
            UI[Shadcn UI - 72 components]
            Domain[Domain Components]
            Layout[Layout Components]
        end
        
        subgraph Hooks["41 Custom Hooks"]
            DataHooks[Data Hooks]
            AuthHooks[Auth Hooks]
            UtilHooks[Utility Hooks]
        end
    end
    
    subgraph Backend["☁️ Supabase Backend"]
        subgraph Auth_Backend["Authentication"]
            SupaAuth[Supabase Auth]
            JWT[JWT Tokens]
            RLS[Row Level Security]
        end
        
        subgraph Database["PostgreSQL Database"]
            Tables[(Tables)]
            Views[(Views)]
            Functions[(DB Functions)]
        end
        
        subgraph EdgeFunctions["25+ Edge Functions"]
            AI_Fn[AI Functions]
            WhatsApp_Fn[WhatsApp Functions]
            Inventory_Fn[Inventory Functions]
            Staff_Fn[Staff Functions]
        end
        
        subgraph Storage["File Storage"]
            Images[Images Bucket]
            Documents[Documents Bucket]
        end
        
        Realtime[Realtime Subscriptions]
    end
    
    subgraph External["🔌 External Services"]
        Gemini[Google Gemini AI]
        Twilio[Twilio WhatsApp]
        Email[Email Service]
        FreeImage[FreeImage Host]
        GDrive[Google Drive]
    end
    
    App --> Providers
    Providers --> Routing
    Routing --> Pages
    Pages --> Components
    Pages --> Hooks
    Hooks --> Backend
    EdgeFunctions --> External
    Components --> UI
```

---

## Application Flow

```mermaid
flowchart TD
    Start([User Visits App]) --> CheckAuth{Authenticated?}
    
    CheckAuth -->|No| AuthPage[Auth Page]
    AuthPage --> Login[Login Form]
    AuthPage --> Signup[Signup Form]
    Login --> SupaAuth[Supabase Auth]
    Signup --> SupaAuth
    SupaAuth --> CreateSession[Create Session]
    CreateSession --> StoreJWT[Store JWT Token]
    StoreJWT --> FetchProfile[Fetch User Profile]
    
    CheckAuth -->|Yes| FetchProfile
    FetchProfile --> LoadRole[Load Role & Permissions]
    LoadRole --> CheckRole{User Role?}
    
    CheckRole -->|Owner/Admin| FullDashboard[Full Dashboard Access]
    CheckRole -->|Manager| ManagerDash[Manager Dashboard]
    CheckRole -->|Chef| KitchenView[Kitchen Display]
    CheckRole -->|Waiter| WaiterView[Orders + Tables]
    CheckRole -->|Staff| StaffLanding[Staff Landing Page]
    CheckRole -->|Viewer| ViewerDash[View-Only Dashboard]
    
    FullDashboard --> MainApp[Main Application]
    ManagerDash --> MainApp
    KitchenView --> MainApp
    WaiterView --> MainApp
    StaffLanding --> MainApp
    ViewerDash --> MainApp
    
    MainApp --> Navigation[Sidebar Navigation]
    Navigation --> PermCheck{Has Permission?}
    PermCheck -->|Yes| LoadPage[Load Requested Page]
    PermCheck -->|No| AccessDenied[Permission Denied Dialog]
    
    LoadPage --> FetchData[Fetch Data via Hooks]
    FetchData --> ReactQuery[React Query Cache]
    ReactQuery --> RenderUI[Render UI Components]
```

---

## Module Dependencies

```mermaid
graph LR
    subgraph Core["Core Modules"]
        Auth[Authentication]
        Dashboard[Dashboard]
    end
    
    subgraph Operations["Operations"]
        Orders[Orders]
        POS[POS]
        Kitchen[Kitchen]
        Menu[Menu]
        Tables[Tables]
    end
    
    subgraph Resources["Resources"]
        Inventory[Inventory]
        Recipes[Recipes]
        Suppliers[Suppliers]
    end
    
    subgraph Hospitality["Hospitality"]
        Reservations[Reservations]
        Rooms[Rooms]
        Housekeeping[Housekeeping]
    end
    
    subgraph People["People"]
        Staff[Staff]
        Customers[CRM]
    end
    
    subgraph Finance["Finance"]
        Analytics[Analytics]
        Financial[Financial]
        Reports[Reports]
        Expenses[Expenses]
    end
    
    subgraph Marketing["Marketing"]
        Campaigns[Campaigns]
        Loyalty[Loyalty]
    end
    
    Auth --> Dashboard
    Dashboard --> Operations
    Dashboard --> Finance
    
    Orders --> Kitchen
    Orders --> Menu
    Orders --> Tables
    Orders --> Inventory
    
    POS --> Orders
    POS --> Menu
    POS --> Customers
    
    Menu --> Recipes
    Recipes --> Inventory
    
    Reservations --> Tables
    Reservations --> Customers
    
    Rooms --> Housekeeping
    Rooms --> Orders
    
    Inventory --> Suppliers
    
    Financial --> Analytics
    Reports --> Analytics
    
    Campaigns --> Customers
    Loyalty --> Customers
```

---

## Data Flow Architecture

```mermaid
flowchart TB
    subgraph UI["UI Layer"]
        Component[React Component]
        Form[Form Input]
        Table[Data Table]
        Chart[Chart Component]
    end
    
    subgraph HookLayer["Hook Layer"]
        CustomHook[Custom Hook - useXxxData]
        ReactQuery[React Query - useQuery/useMutation]
    end
    
    subgraph StateLayer["State Management"]
        QueryCache[Query Cache]
        LocalState[Local State - useState]
        Context[Context State - useContext]
    end
    
    subgraph APILayer["API Layer"]
        SupaClient[Supabase Client]
        EdgeFn[Edge Functions]
    end
    
    subgraph Backend["Backend Layer"]
        DB[(PostgreSQL)]
        RLS[Row Level Security]
        Realtime[Realtime]
    end
    
    Component --> CustomHook
    Form --> CustomHook
    
    CustomHook --> ReactQuery
    ReactQuery --> QueryCache
    ReactQuery --> SupaClient
    
    SupaClient --> DB
    SupaClient --> EdgeFn
    DB --> RLS
    
    Realtime --> QueryCache
    QueryCache --> Component
    QueryCache --> Table
    QueryCache --> Chart
    
    LocalState --> Component
    Context --> Component
```

---

## Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as Auth Form
    participant S as Supabase Auth
    participant P as profiles table
    participant R as roles table
    participant C as components table
    participant App as Application
    
    U->>A: Enter Credentials
    A->>S: signInWithPassword
    S-->>A: Session + JWT Token
    A->>P: Fetch user profile
    P-->>A: Profile with role_id
    A->>R: Fetch role details
    R-->>A: Role with permissions
    
    alt Custom Role
        A->>C: Fetch accessible components
        C-->>A: Component list
    end
    
    A->>App: Set Auth Context
    App->>App: Initialize PermissionGuard
    
    Note over App: Route Protection Active
    
    U->>App: Navigate to /analytics
    App->>App: Check permission analytics.view
    
    alt Has Permission
        App-->>U: Render Analytics Page
    else No Permission
        App-->>U: Show Access Denied
    end
```

---

## Order Processing Flow

```mermaid
stateDiagram-v2
    [*] --> Draft: Create Order
    
    Draft --> Pending: Submit Order
    Draft --> Cancelled: Cancel
    
    Pending --> Confirmed: Confirm Order
    Pending --> Cancelled: Cancel
    
    Confirmed --> Preparing: Start Prep
    Confirmed --> Cancelled: Cancel
    
    Preparing --> Ready: Complete Prep
    Preparing --> Confirmed: Pause Prep
    
    Ready --> Completed: Serve/Deliver
    Ready --> Preparing: Needs Rework
    
    Completed --> [*]
    Cancelled --> [*]
    
    note right of Draft
        POS creates draft order
        Add items and modifiers
    end note
    
    note right of Preparing
        Visible in Kitchen Display
        Chef working on order
    end note
    
    note right of Ready
        Food ready - Notify waiter
    end note
```

---

## Kitchen Display System Flow

```mermaid
flowchart LR
    subgraph POS["POS System"]
        CreateOrder[Create Order]
        SubmitOrder[Submit to Kitchen]
    end
    
    subgraph Kitchen["Kitchen Display"]
        NewOrders["🔴 New Orders"]
        Preparing["🟡 Preparing"]
        Ready["🟢 Ready"]
    end
    
    subgraph Actions["Actions"]
        Accept[Accept Order]
        StartPrep[Start Preparing]
        MarkReady[Mark Ready]
        Serve[Served]
    end
    
    subgraph Notifications["Notifications"]
        Sound[Audio Alert]
        Visual[Visual Badge]
        Realtime[Realtime Update]
    end
    
    CreateOrder --> SubmitOrder
    SubmitOrder --> Realtime
    Realtime --> NewOrders
    Realtime --> Sound
    Realtime --> Visual
    
    NewOrders --> Accept
    Accept --> StartPrep
    StartPrep --> Preparing
    Preparing --> MarkReady
    MarkReady --> Ready
    Ready --> Serve
```

---

## Reservation System Flow

```mermaid
flowchart TD
    subgraph Customer["Customer Actions"]
        Request[Request Reservation]
        Confirm[Confirm Booking]
        Arrive[Arrive at Restaurant]
    end
    
    subgraph System["System Processing"]
        CheckAvail{Check Availability}
        CreateRes[Create Reservation]
        AssignTable[Assign Table]
        SendConfirm[Send Confirmation]
        AddWaitlist[Add to Waitlist]
    end
    
    subgraph Notifications["Notifications"]
        WhatsApp[WhatsApp Message]
        Email[Email Confirmation]
        Reminder[24hr Reminder]
    end
    
    subgraph Staff["Staff Actions"]
        Review[Review Booking]
        ConfirmRes[Confirm Reservation]
        SeatGuest[Seat Guest]
        Complete[Complete Reservation]
    end
    
    Request --> CheckAvail
    CheckAvail -->|Available| CreateRes
    CheckAvail -->|Full| AddWaitlist
    
    CreateRes --> AssignTable
    AssignTable --> SendConfirm
    SendConfirm --> WhatsApp
    SendConfirm --> Email
    
    WhatsApp --> Confirm
    Email --> Confirm
    
    Confirm --> Review
    Review --> ConfirmRes
    
    Reminder --> Arrive
    Arrive --> SeatGuest
    SeatGuest --> Complete
    
    AddWaitlist -->|Table Opens| CreateRes
```

---

## Room Management Flow

```mermaid
flowchart TB
    subgraph Booking["Booking Process"]
        CheckIn[Check-In]
        GuestInfo[Guest Information]
        RoomSelect[Room Selection]
        Payment[Payment/Deposit]
    end
    
    subgraph Stay["During Stay"]
        RoomService[Room Service Orders]
        Amenities[Request Amenities]
        Maintenance[Report Issues]
        Billing[View Bill]
    end
    
    subgraph Checkout["Checkout Process"]
        ReviewBill[Review Final Bill]
        ProcessPayment[Process Payment]
        CheckOut[Check Out]
        Feedback[Guest Feedback]
    end
    
    subgraph Housekeeping["Housekeeping"]
        Dirty[Room Dirty]
        Cleaning[Cleaning Assigned]
        Inspection[Inspection]
        Ready[Room Ready]
    end
    
    CheckIn --> GuestInfo
    GuestInfo --> RoomSelect
    RoomSelect --> Payment
    Payment --> Stay
    
    Stay --> RoomService
    Stay --> Amenities
    Stay --> Maintenance
    Stay --> Billing
    
    Billing --> ReviewBill
    ReviewBill --> ProcessPayment
    ProcessPayment --> CheckOut
    CheckOut --> Feedback
    
    CheckOut --> Dirty
    Dirty --> Cleaning
    Cleaning --> Inspection
    Inspection --> Ready
    Ready --> CheckIn
```

---

## Inventory Management Flow

```mermaid
flowchart TD
    subgraph Stock["Stock Management"]
        CurrentStock[Current Stock]
        LowStock{Low Stock?}
        Alert[Low Stock Alert]
        AutoPO[Auto PO Suggestion]
    end
    
    subgraph Procurement["Procurement"]
        CreatePO[Create Purchase Order]
        SendPO[Send to Supplier]
        ReceiveStock[Receive Stock]
        UpdateInventory[Update Inventory]
    end
    
    subgraph Usage["Stock Usage"]
        OrderPlaced[Order Placed]
        PrepStarted[Prep Started]
        DeductStock[Deduct Inventory]
        RecipeCalc[Recipe Calculation]
    end
    
    subgraph Reporting["Reporting"]
        Transactions[Transaction Log]
        Reports[Inventory Reports]
        Analytics[Analytics]
    end
    
    CurrentStock --> LowStock
    LowStock -->|Yes| Alert
    LowStock -->|No| Monitor[Continue Monitoring]
    Alert --> AutoPO
    AutoPO --> CreatePO
    CreatePO --> SendPO
    SendPO --> ReceiveStock
    ReceiveStock --> UpdateInventory
    UpdateInventory --> CurrentStock
    
    OrderPlaced --> PrepStarted
    PrepStarted --> RecipeCalc
    RecipeCalc --> DeductStock
    DeductStock --> CurrentStock
    
    DeductStock --> Transactions
    UpdateInventory --> Transactions
    Transactions --> Reports
    Reports --> Analytics
```

---

## Payment Processing Flow

```mermaid
sequenceDiagram
    participant W as Waiter
    participant POS as POS System
    participant O as Order
    participant P as Payment
    participant B as Bill
    participant K as Kitchen
    participant C as Customer
    
    W->>POS: Create Order
    POS->>O: Save Order status pending
    O->>K: Send to Kitchen via realtime
    
    K->>O: Mark Ready
    O->>W: Notify Ready via realtime
    
    W->>POS: Process Payment
    POS->>P: Create Payment Record
    
    alt Split Payment
        POS->>P: Multiple Payment Methods
        P->>P: Calculate Splits
    end
    
    alt Apply Discount
        POS->>P: Apply Promo Code
        P->>P: Calculate Discount
    end
    
    P->>O: Update Order status completed
    POS->>B: Generate Bill
    
    alt Send Bill
        B->>C: WhatsApp Bill
        B->>C: Email Bill
    end
    
    B-->>W: Print Receipt
```

---

## Real-time Subscriptions

```mermaid
flowchart LR
    subgraph Tables["Database Tables"]
        OrdersTable[(orders)]
        KitchenTable[(kitchen_orders)]
        ReservationsTable[(reservations)]
        InventoryTable[(inventory)]
    end
    
    subgraph Supabase["Supabase Realtime"]
        Channel1[orders channel]
        Channel2[kitchen_orders channel]
        Channel3[reservations channel]
        Channel4[inventory channel]
    end
    
    subgraph Hooks["React Hooks"]
        useRealtimeAnalytics[useRealtimeAnalytics]
        useLiveActivity[useLiveActivity]
        useRealtimeSub[useRealtimeSubscription]
    end
    
    subgraph Components["UI Components"]
        LiveActivity[LiveActivity]
        KitchenDisplay[KitchenDisplay]
        OrdersList[OrdersList]
        Dashboard[Dashboard Stats]
    end
    
    OrdersTable --> Channel1
    KitchenTable --> Channel2
    ReservationsTable --> Channel3
    InventoryTable --> Channel4
    
    Channel1 --> useRealtimeAnalytics
    Channel2 --> useRealtimeAnalytics
    Channel1 --> useLiveActivity
    
    useRealtimeAnalytics --> Dashboard
    useLiveActivity --> LiveActivity
    useRealtimeSub --> KitchenDisplay
    useRealtimeSub --> OrdersList
```

---

## Edge Function Architecture

```mermaid
graph TB
    subgraph Client["Client Requests"]
        WebApp[Web Application]
        External[External Webhooks]
    end
    
    subgraph EdgeLayer["Supabase Edge Functions"]
        subgraph AI["AI Functions"]
            ChatGemini[chat-with-gemini]
            ChatAI[chat-with-ai]
            ChatAPI[chat-with-api]
        end
        
        subgraph Messaging["Messaging Functions"]
            SendWhatsApp[send-whatsapp]
            SendWhatsAppBill[send-whatsapp-bill]
            SendEmail[send-email-bill]
            ResConfirm[send-reservation-confirmation]
            ResReminder[send-reservation-reminder]
        end
        
        subgraph Inventory["Inventory Functions"]
            CheckLowStock[check-low-stock]
            DeductInventory[deduct-inventory-on-prep]
        end
        
        subgraph Staff["Staff Functions"]
            ClockEntry[record-clock-entry]
            MissedClocks[check-missed-clocks]
        end
        
        subgraph Admin["Admin Functions"]
            RoleMgmt[role-management]
            UserMgmt[user-management]
            GetComponents[get-user-components]
            Backup[backup-restore]
        end
        
        subgraph Utils["Utility Functions"]
            ValidatePromo[validate-promo-code]
            LogPromo[log-promotion-usage]
            Upload[upload-image]
            FreeImg[freeimage-upload]
            SyncChannels[sync-channels]
        end
    end
    
    subgraph External_Services["External Services"]
        Gemini[Google Gemini]
        Twilio[Twilio API]
        EmailSvc[Email Service]
        FreeImage[FreeImage.host]
        GDrive[Google Drive]
    end
    
    WebApp --> EdgeLayer
    External --> EdgeLayer
    
    ChatGemini --> Gemini
    SendWhatsApp --> Twilio
    SendEmail --> EmailSvc
    Upload --> FreeImage
    Backup --> GDrive
```

---

## Component Hierarchy

```mermaid
graph TD
    App[App.tsx]
    
    App --> ThemeProvider
    ThemeProvider --> AuthProvider
    AuthProvider --> AccessProvider
    AccessProvider --> Router
    
    Router --> AppRoutes
    
    AppRoutes --> Sidebar[ImprovedSidebarNavigation]
    AppRoutes --> MainContent[Main Content Area]
    AppRoutes --> MobileNav[MobileNavigation]
    
    MainContent --> PermissionGuard
    PermissionGuard --> Pages
    
    subgraph Pages["Page Components"]
        Index[Index/Dashboard]
        Orders[Orders]
        POS[POS]
        Kitchen[Kitchen]
        Menu[Menu]
        Inventory[Inventory]
        Analytics[Analytics]
        Settings[Settings]
    end
    
    Index --> DashboardComponents
    subgraph DashboardComponents["Dashboard Components"]
        Stats[Stats]
        LiveActivity[LiveActivity]
        WeeklySalesChart[WeeklySalesChart]
        QuickStats[QuickStats]
    end
    
    Orders --> OrderComponents
    subgraph OrderComponents["Order Components"]
        ActiveOrdersList[ActiveOrdersList]
        OrderDetailsDialog[OrderDetailsDialog]
        OrderFilters[OrderFilters]
    end
```

---

## Database Entity Relationships

```mermaid
erDiagram
    RESTAURANTS ||--o{ USERS : has
    RESTAURANTS ||--o{ MENU_ITEMS : has
    RESTAURANTS ||--o{ ORDERS : has
    RESTAURANTS ||--o{ TABLES : has
    RESTAURANTS ||--o{ ROOMS : has
    RESTAURANTS ||--o{ INVENTORY : has
    RESTAURANTS ||--o{ STAFF : has
    RESTAURANTS ||--o{ CUSTOMERS : has
    
    USERS ||--o{ ORDERS : creates
    USERS }|--|| ROLES : has
    ROLES ||--o{ ROLE_COMPONENTS : has
    
    MENU_ITEMS ||--o{ ORDER_ITEMS : contains
    MENU_ITEMS }|--|| CATEGORIES : belongs_to
    MENU_ITEMS ||--o{ RECIPE_INGREDIENTS : has
    
    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ PAYMENTS : has
    ORDERS }|--o| TABLES : assigned_to
    ORDERS }|--o| CUSTOMERS : belongs_to
    
    TABLES ||--o{ RESERVATIONS : has
    CUSTOMERS ||--o{ RESERVATIONS : makes
    
    ROOMS ||--o{ ROOM_BOOKINGS : has
    ROOMS ||--o{ HOUSEKEEPING_TASKS : has
    
    INVENTORY ||--o{ INVENTORY_TRANSACTIONS : has
    INVENTORY }|--o| SUPPLIERS : supplied_by
    
    SUPPLIERS ||--o{ PURCHASE_ORDERS : receives
    
    CUSTOMERS ||--o{ LOYALTY_POINTS : earns
    CUSTOMERS ||--o{ MARKETING_CAMPAIGNS : receives
    
    RESTAURANTS {
        uuid id PK
        string name
        string address
        string phone
        string email
    }
    
    USERS {
        uuid id PK
        uuid restaurant_id FK
        string email
        string role
        uuid role_id FK
    }
    
    ORDERS {
        uuid id PK
        uuid restaurant_id FK
        uuid user_id FK
        uuid customer_id FK
        uuid table_id FK
        string status
        decimal total
    }
    
    MENU_ITEMS {
        uuid id PK
        uuid restaurant_id FK
        uuid category_id FK
        string name
        decimal price
        boolean is_available
    }
    
    INVENTORY {
        uuid id PK
        uuid restaurant_id FK
        string name
        decimal quantity
        decimal min_quantity
        string unit
    }
```

---

## RBAC Permission Matrix

```mermaid
graph TB
    subgraph Roles["User Roles"]
        Owner[Owner]
        Admin[Admin]
        Manager[Manager]
        Chef[Chef]
        Waiter[Waiter]
        Staff[Staff]
        Viewer[Viewer]
    end
    
    subgraph FullAccess["Full Access - 50+ permissions"]
        All[All Permissions]
    end
    
    subgraph OperationalAccess["Operational Access"]
        OpPerms[Orders, Menu, Inventory, Staff, Customers, Rooms, Tables, Kitchen, Housekeeping, Analytics view]
    end
    
    subgraph KitchenAccess["Kitchen Access"]
        KitchenPerms[Orders view/create/update, Menu CRUD, Inventory CRUD, Kitchen view/update]
    end
    
    subgraph FOHAccess["Front-of-House Access"]
        FOHPerms[Dashboard, Orders, Kitchen view, Menu view, Tables, Rooms checkout, Reservations, Housekeeping view]
    end
    
    subgraph BasicAccess["Basic Access"]
        BasicPerms[Orders, Menu view, Inventory, Kitchen view, Tables, Reservations]
    end
    
    subgraph ViewOnly["View Only"]
        ViewPerms[Dashboard view only]
    end
    
    Owner --> All
    Admin --> All
    Manager --> OpPerms
    Chef --> KitchenPerms
    Waiter --> FOHPerms
    Staff --> BasicPerms
    Viewer --> ViewPerms
```

---

## File Structure Reference

```
src/
├── App.tsx                 # Main app with providers
├── main.tsx                # Entry point
├── components/
│   ├── Auth/               # 15 auth components
│   ├── Dashboard/          # 18 dashboard widgets
│   ├── Orders/             # 19 order components
│   ├── Kitchen/            # 4 KDS components
│   ├── Menu/               # 2 menu components
│   ├── Inventory/          # 7 inventory components
│   ├── Rooms/              # 31 room components
│   ├── Staff/              # 17 staff components
│   ├── CRM/                # 7 customer components
│   ├── Analytics/          # 26 analytics components
│   ├── Financial/          # 10 financial components
│   ├── Reporting/          # 5 report components
│   ├── Marketing/          # 6 marketing components
│   ├── Housekeeping/       # 10 housekeeping components
│   ├── Settings/           # 3 settings tabs
│   ├── Layout/             # 11 layout components
│   └── ui/                 # 72 Shadcn UI components
├── hooks/                  # 41 custom hooks
├── pages/                  # 34 page components
├── types/                  # TypeScript definitions
├── contexts/               # React contexts
├── integrations/           # Supabase client
└── tests/                  # Test suite

supabase/
└── functions/              # 25+ Edge Functions
```

---

## Quick Commands

```bash
# Development
npm run dev              # Start dev server
npm test                 # Run tests
npm test -- --coverage   # Test with coverage
npm run build            # Production build
npx tsc --noEmit         # Type check
npm run lint             # Lint code
```

---

*Last Updated: December 2024*
