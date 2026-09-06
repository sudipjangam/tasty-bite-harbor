# Tasty Bite Harbor: Complete Operations Architecture, Component Flow Diagrams & Technical Guide

A comprehensive, unified technical reference document providing both **in-depth functional specifications** and **dedicated Mermaid flowcharts** for all 10 Operations components in the restaurant management system.

---

## Master System Architecture

```mermaid
flowchart TD
    subgraph UI_Operations ["OPERATIONS NAVIGATOR"]
        OV["1. Overview / Dashboard"]
        ORD["2. Orders Ledger"]
        POS["3. QSR POS & QuickServe"]
        DT["4. Digital Twin"]
        KDS["5. Kitchen Display System"]
        RCP["6. Recipes & Production"]
        MNU["7. Menu & Size Variants"]
        TBL["8. Tables & Zones"]
        INV["9. Inventory & FIFO"]
        EXP["10. Expenses & Wastage"]
    end

    MNU -->|"menu_items & variants"| RCP
    INV -->|"Raw inventory_items & costs"| RCP
    RCP -->|"Calculates Food Cost % & Margins"| MNU
    TBL -->|"x,y grid, section & capacity"| DT
    TBL -->|"Floor State (Occupied/Free)"| POS
    DT <-->|"Bi-directional Sync (Merge, Transfer, Fire Course)"| POS
    POS -->|"Inserts orders & kitchen_orders"| ORD
    POS -->|"Sends KOT & delta tickets (Thermal Print)"| KDS
    ORD -->|"Pipeline Data & Revenue"| OV
    KDS -->|"Start Prep / Ticket Bumped"| INV_EDGE["Edge Function: deduct-inventory-on-prep"]
    POS -->|"Fast-Pay Fallback"| INV_EDGE
    INV_EDGE -->|"FIFO Lot Depletion & Conversions"| INV
    INV -->|"Ingredient 86 Cascade"| MNU
    INV -->|"Batch Output & Shrinkage"| INV
    INV -->|"Spoilage / Burnt Write-offs"| EXP
    EXP -->|"Operating Expenses + COGS"| OV
    ORD -->|"Gross Revenue & Tender Splits"| OV
```

---

## 1. Overview (Dashboard & Analytics)

### 1.1 Functional Specification
* **Component Path**: [`src/pages/Dashboard.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/pages/Dashboard.tsx), [`src/pages/EnhancedDashboard.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/pages/EnhancedDashboard.tsx)
* **Data Hook**: [`src/hooks/useBusinessDashboardData.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/hooks/useBusinessDashboardData.tsx)
* **Realtime Hook**: [`src/hooks/useRealtimeSubscription.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/hooks/useRealtimeSubscription.tsx)
* **Underlying Tables**: `orders`, `order_items`, `kitchen_orders`, `tables`, `inventory_items`, `expenses`.

#### Key Capabilities:
1. **Real-Time Data Ingestion**: Automatically establishes WebSocket subscriptions to PostgreSQL changes on `orders`, `kitchen_orders`, and `expenses`.
2. **Aggregated Business Metrics**:
   * **Gross Sales**: Total value of all orders punched today across POS, Takeaway, Delivery, and QR ordering.
   * **Net Sales**: Gross Sales minus customer discounts, promotional vouchers, and voided/non-chargeable items.
   * **Live Capacity Tracker**: Ratio of occupied tables to total active tables ($occupied / total$).
   * **Kitchen Latency Gauge**: Average preparation delay and current active tickets waiting in kitchen queue.
   * **Stock Threshold Monitor**: Immediate alert count of ingredients currently below their minimum reorder point.
3. **Live Profit & Loss Engine**:
   $$\text{Gross Sales} - \text{Discounts} - \text{Taxes} - \text{COGS (from FIFO inventory deductions)} - \text{Operating Expenses} = \text{Live Operating Profit}$$

### 1.2 Dedicated Flow Diagram

```mermaid
flowchart TD
    subgraph Ingestion ["Realtime Data Ingestion"]
        CH1["Realtime orders"] --> DATA["useBusinessDashboardData"]
        CH2["Realtime kitchen_orders"] --> DATA
        CH3["Realtime expenses"] --> DATA
        CH4["Realtime inventory_items"] --> DATA
    end

    subgraph Computation ["KPI Engine"]
        DATA --> REV["Gross & Net Revenue Computation"]
        DATA --> TBL["Live Capacity (Occupied / Total Tables)"]
        DATA --> KDS_LAT["Kitchen Latency & Queue Load"]
        DATA --> INV_ALERT["Low Stock & Threshold Alerts"]
        DATA --> EXP_CALC["Daily Operating Expenses"]
    end

    subgraph PnL ["Live P&L Ledger"]
        REV --> PNL_ENGINE["P&L Calculation Formula"]
        EXP_CALC --> PNL_ENGINE
        DATA --> FIFO_COGS["COGS from FIFO Inventory Usage"]
        FIFO_COGS --> PNL_ENGINE
        PNL_ENGINE --> PROFIT["Live Operating Profit / Margin %"]
    end

    subgraph UI ["Dashboard Presentation"]
        REV --> KPI1["Revenue Card"]
        TBL --> KPI2["Active Tables Card"]
        KDS_LAT --> KPI3["Kitchen Gauge"]
        INV_ALERT --> KPI4["Stock Warning Banner"]
        PROFIT --> KPI5["Profit & Loss Widget"]
    end
```

---

## 2. Orders Ledger Component

### 2.1 Functional Specification
* **Component Path**: [`src/pages/Orders.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/pages/Orders.tsx)
* **Components**: [`src/components/Orders/OrderList.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Orders/OrderList.tsx), [`src/components/Orders/OrderActions.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Orders/OrderActions.tsx)
* **Utilities**: [`src/lib/order-utils.ts`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/lib/order-utils.ts)
* **Underlying Tables**: `orders`, `kitchen_orders`, `crm_customers`.

#### Key Capabilities:
1. **Multi-Source Ingestion**: Unifies orders punched via Counter POS, Dine-In table orders, Guest QR orders, and aggregator/delivery tickets.
2. **Order Lifecycle State Machine**:
   $$\text{Pending} \rightarrow \text{Preparing} \rightarrow \text{Ready} \rightarrow \text{Completed}$$
   * Supports manager-level **Revert Status** (e.g., from `completed` back to `pending` if payment was accidentally closed).
   * Supports order cancellation and voiding with reason logging.
3. **Data Formatting & Sanitization**:
   * Stored in array format in `orders.items` using [`formatOrderItemString`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/lib/order-utils.ts#L20-L36):
     ```typescript
     formatOrderItemString(quantity, name, price, notes, modifiers)
     // Output: "2x Farmhouse Pizza (Extra Cheese, Spicy) @350.00"
     ```
4. **CRM & WhatsApp Linkage**:
   * Automatically parses customer mobile number on checkout, fetches or creates `crm_customers` record, and increments loyalty points.
   * Integrated with Edge Function `send-whatsapp-unified` for automated receipt PDFs and Pay Later payment reminders.
5. **Non-Chargeable (NC) Orders**:
   * Strict audit compliance requiring mandatory `nc_reason` (e.g., "Owner Table", "Food Tasting", "Guest Complaint").
   * Stored with `order_type: 'non-chargeable'`, net total ₹0.00, isolated from taxable revenue reports.

### 2.2 Dedicated Flow Diagram

```mermaid
flowchart TD
    subgraph Order_Sources ["Order Ingestion Channels"]
        POS_IN["QSR POS / Counter"] --> ORDER_TABLE["Table: orders"]
        QR_IN["Guest Table QR Scan"] --> ORDER_TABLE
        DLV_IN["Delivery / Takeaway"] --> ORDER_TABLE
        NC_IN["Non-Chargeable (Manager Auth)"] --> ORDER_TABLE
    end

    subgraph State_Machine ["Order Lifecycle State Machine"]
        ORDER_TABLE --> S1["Status: 'pending'"]
        S1 --> S2["Status: 'preparing'"]
        S2 --> S3["Status: 'ready'"]
        S3 --> S4["Status: 'completed'"]
        S1 --> SX["Status: 'cancelled'"]
        S2 --> SX
    end

    subgraph User_Actions ["Order Actions"]
        ORDER_TABLE --> ACT1["Edit Order Items"]
        ORDER_TABLE --> ACT2["Revert Status (Completed -> Pending)"]
        ORDER_TABLE --> ACT3["Send WhatsApp Payment Reminder"]
        ORDER_TABLE --> ACT4["Reprint Thermal Bill"]
        ORDER_TABLE --> ACT5["Delete Order (Cascades kitchen_orders)"]
    end

    subgraph Integrations ["Downstream Synchronization"]
        S4 --> CRM["CRM & Loyalty Sync (Accrue Points)"]
        ACT3 --> WA_FN["Edge: send-whatsapp-unified"]
        ACT4 --> PRINT_SVC["thermalPrinterService.printReceipt"]
        S4 --> FIN["Financial Sales Ledger"]
    end
```

---

## 3. QSR POS & QuickServe POS

### 3.1 Functional Specification
* **Component Path**: [`src/components/QSR/QSRPosMain.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/QSR/QSRPosMain.tsx), [`src/pages/QuickServePOS.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/pages/QuickServePOS.tsx)
* **Sub-Components**: [`QSROrderPad.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/QSR/QSROrderPad.tsx), [`QSRCartBottomSheet.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/QSR/QSRCartBottomSheet.tsx), [`AdaptivePaymentDialog.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Orders/POS/AdaptivePaymentDialog.tsx)
* **Underlying Tables**: `orders`, `kitchen_orders`, `tables`, `menu_items`, `menu_item_variants`.

#### Key Capabilities:
1. **Multi-Mode Operation**:
   * `dine_in`: Table grid selection; updates table status to `occupied`.
   * `takeaway`: Fast counter service with direct customer name/phone intake.
   * `delivery`: Delivery partner routing with rider assignment drawer.
   * `nc`: Non-chargeable authorization with mandatory reason entry.
2. **Hold & Recall Architecture**:
   * **Hold Order**: Saves an active cart to `kitchen_orders` with `status: 'held'` to free up the POS terminal for other walk-ins.
   * **Recall Table**: Clicking an occupied table fetches `kitchen_orders` where `id = table.activeOrderId`, restoring items and pricing into cart.
3. **"Send to Kitchen" & Additional Items (Rounds & Deltas)**:
   * **Round 1 (Initial Order)**: Inserts `kitchen_orders` with `round_number: 1`, `status: 'new'`. Prints initial thermal ticket `*** KOT ***`.
   * **Round 2+ (Add-on Order)**: Increments `round_number = (existing.round_number || 1) + 1`.
   * **Delta Math**:
     ```typescript
     const previouslyPrinted = existingItem?.printed_qty || 0;
     const delta = item.quantity - previouslyPrinted;
     if (delta > 0) deltaItemsToPrint.push({ ...item, printed_qty: previouslyPrinted });
     ```
   * Updates `kitchen_orders` with full array and resets prep timers (`started_at: null`, `completed_at: null`) so KDS rings kitchen.
   * Sends only delta items to printer with flag `isAddition: true`, producing ticket header `*** ADDITION ***` (Round X) and footer `** ADDITION ONLY **`.
4. **Checkout & Multi-Tender Payment**:
   * Implements platform-adaptive checkout: Web desktop uses [`PaymentDialog.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Orders/POS/PaymentDialog.tsx), Android APK renders [`MobilePaymentDialog.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Orders/POS/MobilePaymentDialog.tsx).
   * Tenders: Cash Drawer, Card POS, Dynamic UPI QR code (generated via ESC/POS 2D barcode bytes or onscreen canvas), Split Payment, Pay Later, NC.
   * On settlement: Marks order completed, releases table to `available`, and invokes `deduct-inventory-on-prep`.

### 3.2 Dedicated Flow Diagram

```mermaid
flowchart TD
    subgraph Setup ["Mode & Table Setup"]
        MODE{"Select Order Mode"}
        MODE -->|Dine-In| TBL_GRID["Select Table from Grid"]
        MODE -->|Takeaway| CUST_INFO["Enter Customer Info"]
        MODE -->|Delivery| RIDER["Rider Drawer / Address"]
        MODE -->|NC| NC_FORM["Mandatory NC Reason"]
    end

    subgraph Order_Punching ["Cart & Item Selection"]
        TBL_GRID --> CART["Cart (orderItems)"]
        CUST_INFO --> CART
        RIDER --> CART
        NC_FORM --> CART
        CAT["Category Speed Dial"] --> CART
        SRCH["Live Menu Search"] --> CART
        VAR_POPUP["Size Variant Selector"] --> CART
        MODS["Notes / Modifiers Input"] --> CART
    end

    subgraph Hold_Recall ["Hold & Table Recall"]
        CART -->|Tap 'Hold Order'| HOLD["Save to kitchen_orders (status: 'held')"]
        HOLD -->|Later| RECALL["Recall Held Ticket"]
        TBL_GRID -->|Tap Occupied Table| LOAD_ACTIVE["Load Existing Table Items"]
        LOAD_ACTIVE --> CART
    end

    subgraph Kitchen_Send ["Send to Kitchen (Rounds & Deltas)"]
        CART -->|Click 'Send to Kitchen'| ROUND_CHECK{"Is Table Recall?"}
        ROUND_CHECK -- No (Round 1) --> K1["Insert kitchen_orders (status: 'new', round: 1)"]
        ROUND_CHECK -- Yes (Round 2+) --> K2["Compute deltaItemsToPrint"]
        K2 --> K3["Update kitchen_orders (round_number = current + 1)"]
        K1 --> PRINT_KOT["thermalPrinterService.printKOT (*** KOT ***)"]
        K3 --> PRINT_ADD["thermalPrinterService.printKOT (*** ADDITION ***)"]
        K1 --> KDS_NOTIFY["Trigger KDS Audio Chime"]
        K3 --> KDS_NOTIFY
    end

    subgraph Payment_Flow ["Adaptive Payment Checkout"]
        CART -->|Click 'Proceed to Payment'| PAY_DIALOG["AdaptivePaymentDialog"]
        PAY_DIALOG --> METHOD{"Select Payment Method"}
        METHOD --> M_CASH["Cash Drawer"]
        METHOD --> M_CARD["Card Terminal"]
        METHOD --> M_UPI["Dynamic UPI QR Code"]
        METHOD --> M_SPLIT["Split Payment (Amount/Items)"]
        METHOD --> M_LATER["Pay Later (Credit)"]
        METHOD --> M_NC["Non-Chargeable Authorize"]
        
        M_CASH --> SETTLE["Update orders (status: 'completed')"]
        M_CARD --> SETTLE
        M_UPI --> SETTLE
        M_SPLIT --> SETTLE
        M_LATER --> SETTLE
        M_NC --> SETTLE
        
        SETTLE --> PRINT_BILL["Auto-Print Thermal Receipt"]
        SETTLE --> FREE_TBL["Release Table (status: 'available')"]
        SETTLE --> DEDUCT_INV["Trigger deduct-inventory-on-prep"]
    end
```

---

## 4. Digital Twin: Live Outlet Blueprint

### 4.1 Functional Specification
* **Component Path**: [`src/pages/DigitalTwin.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/pages/DigitalTwin.tsx)
* **Canvas Component**: [`src/components/Tables/FloorPlanCanvas.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Tables/FloorPlanCanvas.tsx)
* **Action Modal**: [`src/components/Tables/TableActionModal.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Tables/TableActionModal.tsx)
* **Hook**: [`src/hooks/useTableFloorPlan.ts`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/hooks/useTableFloorPlan.ts)
* **Underlying Tables**: `tables`, `table_sections`, `restaurant_floor_elements`, `orders`, `kitchen_orders`.

#### Key Capabilities:
1. **Interactive 2D Blueprint Canvas**:
   * Drag-and-drop table nodes and architectural elements mapped directly to physical coordinates $(x, y)$.
   * Elements supported: Walls, doors, windows, bar counters, cash stations, restrooms, and pillars.
   * Element adjustments: Resize $(w, h)$ and rotate in $90^\circ$ increments ($0^\circ, 90^\circ, 180^\circ, 270^\circ$).
2. **Visual Table States & Badges**:
   * `available` (Emerald Green): Ready for walk-in seating.
   * `seated` (Blue): Guests seated, placing order.
   * `served` (Orange): Food delivered, dining in progress.
   * `billed` (Purple): Bill presented, waiting for settlement.
   * `dirty` (Gray/Red): Vacated, needs busboy sanitization.
3. **Table Action Modal (`TableActionModal.tsx`)**:
   * **Table Turn Time Tracker**: Displays elapsed dining time ($<30$m Green, $30-60$m Amber, $>60$m Red alert).
   * **Live Running Items**: Itemized list with pricing and KOT prep status.
   * **Course Firing Fast-Buttons**: "Fire Starters", "Fire Mains", "Fire Dessert" triggers course priority broadcasts to Kitchen KDS.
   * **Table Transfer & Merge**: Transfer order items between tables or merge adjacent tabs.
   * **Split Bill Integration**: Direct link to split bill settlement modal.
4. **AI Traffic & Revenue Simulation**:
   * Evaluates table turnaround velocity, bottlenecks, and revenue density per square foot.

### 4.2 Dedicated Flow Diagram

```mermaid
flowchart TD
    subgraph Blueprint_Canvas ["2D Blueprint Canvas Engine"]
        SEC["Section Tabs: Main, Patio, Rooftop, AC"] --> CANVAS["FloorPlanCanvas"]
        CANVAS --> ARCH["Architectural Elements (restaurant_floor_elements)"]
        ARCH --> ELEM["Walls, Doors, Windows, Bars, Cash Counters, Restrooms"]
        ELEM --> EDIT["Drag, Resize, Rotate (0°, 90°, 180°, 270°)"]
    end

    subgraph Live_Nodes ["Live Table Nodes & Color States"]
        CANVAS --> TNODES["Table Visual Nodes"]
        TNODES --> ST_AVAIL["Available (Emerald Green)"]
        TNODES --> ST_SEAT["Seated / Ordering (Blue)"]
        TNODES --> ST_SERVE["Food Served / Dining (Orange)"]
        TNODES --> ST_BILL["Bill Presented (Purple)"]
        TNODES --> ST_DIRT["Dirty / Needs Bus (Gray/Red)"]
    end

    subgraph Table_Action_Modal ["Table Interaction Modal"]
        TNODES -->|Click Table| MODAL["TableActionModal"]
        MODAL --> TIMER["Turn-Time Tracker (<30m, 30-60m, >60m alert)"]
        MODAL --> RUNNING["Running Items List & KOT Status Badges"]
        
        MODAL --> ACT_FIRE["Kitchen Course Firing: Starters, Mains, Dessert"]
        MODAL --> ACT_POS["Punch POS Order -> Redirect to /pos?table=X"]
        MODAL --> ACT_SPLIT["Split Bill Check -> TableSplitBillDialog"]
        MODAL --> ACT_MERGE["Transfer / Merge -> TableMergeTransferDialog"]
        MODAL --> ACT_CLEAN["Mark Clean & Available"]
    end

    subgraph AI_Simulation ["AI Traffic & Revenue Simulation"]
        SEC --> SIM_TAB["AI Traffic & Revenue Simulation Tab"]
        SIM_TAB --> SIM_ENG["RestaurantSimulation Engine"]
        SIM_ENG --> HEATMAP["Foot-Traffic & Bottleneck Heatmap"]
        SIM_ENG --> METRICS["Revenue per Seat-Hour & Turnaround Velocity"]
    end
```

---

## 5. Kitchen Display System (KDS)

### 5.1 Functional Specification
* **Component Path**: [`src/pages/Kitchen.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/pages/Kitchen.tsx)
* **Components**: [`src/components/Kitchen/KitchenDisplay.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Kitchen/KitchenDisplay.tsx), [`src/components/Kitchen/KitchenLoadGauge.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Kitchen/KitchenLoadGauge.tsx)
* **Hook**: [`src/hooks/useActiveKitchenOrders.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/hooks/useActiveKitchenOrders.tsx)
* **Underlying Tables**: `kitchen_orders`, `orders`.

#### Key Capabilities:
1. **Real-Time Ticket Board & Audio Dispatch**:
   * Listens on Postgres channel for new `kitchen_orders`. Plays Web Audio API synth chime and speech synthesis (`"New order for Table X"`).
2. **Station Filtering**:
   * Filters tickets by chef station: Grill, Fryer, Tandoor, Pantry, Beverage, Dessert.
3. **Urgency Indicators & Latency Timers**:
   * Continuous elapsed timer from `created_at`:
     * $\le 10$ mins: Green (Normal prep time).
     * $10 - 20$ mins: Yellow (Warning threshold).
     * $> 20$ mins: Flashing Red (Delayed order requiring expeditor intervention).
4. **Item-Level Checklist & Bumping**:
   * Chefs cross off individual items as prepared via `item_completion_status` boolean array.
   * Clicking "Bump Ticket" updates `status: 'completed'`, logs `bumped_at`, and notifies POS.
5. **Inventory Depletion Trigger**:
   * Clicking "Start Prep" or bumping a ticket triggers the background edge function `deduct-inventory-on-prep`.

### 5.2 Dedicated Flow Diagram

```mermaid
flowchart TD
    subgraph Intake ["Order Arrival & Audio Alert"]
        POS_DISPATCH["POS / QR Order Placed"] --> DB_INSERT["INSERT kitchen_orders"]
        DB_INSERT --> RT_SUB["Supabase Realtime Channel"]
        RT_SUB --> CHIME["Web Audio API Synth Chime"]
        RT_SUB --> SPEECH["Speech Synthesis: 'New Order for Table X'"]
    end

    subgraph Station_Routing ["Multi-Station Filtering"]
        RT_SUB --> TICKET_BOARD["KDS Ticket Board"]
        STATION_TABS{"Select Station"} --> TICKET_BOARD
        STATION_TABS --> ST_ALL["All Stations"]
        STATION_TABS --> ST_GRILL["Grill / Fryer"]
        STATION_TABS --> ST_TANDOOR["Tandoor"]
        STATION_TABS --> ST_BAR["Bar / Beverage"]
        STATION_TABS --> ST_DESSERT["Dessert"]
    end

    subgraph Timer_Urgency ["Color-Coded Timers"]
        TICKET_BOARD --> TIMER_TICK["Elapsed Timer from created_at"]
        TIMER_TICK --> T_GREEN["Green: <= 10 mins (Normal)"]
        TIMER_TICK --> T_AMBER["Yellow: 10 - 20 mins (Warning)"]
        TIMER_TICK --> T_RED["Flashing Red: > 20 mins (Critical Delay)"]
    end

    subgraph Chef_Actions ["Ticket Execution"]
        TICKET_BOARD --> STRIKE["Click Item -> Strike Through (item_completion_status)"]
        TICKET_BOARD --> START_PREP["Click 'Start Prep'"]
        TICKET_BOARD --> BUMP["Click 'Bump Ticket' (Completed)"]
    end

    subgraph Downstream_Triggers ["Downstream Automation"]
        START_PREP --> INV_DEDUCT["Edge: deduct-inventory-on-prep"]
        BUMP --> INV_DEDUCT
        BUMP --> UPDATE_DB["UPDATE kitchen_orders (status: 'completed', bumped_at)"]
        UPDATE_DB --> SYNC_ORDERS["UPDATE orders (status: 'ready')"]
        SYNC_ORDERS --> POS_ALERT["POS Waiter Notification: Food Ready"]
    end
```

---

## 6. Recipes & Costing Management

### 6.1 Functional Specification
* **Component Path**: [`src/pages/RecipeManagement.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/pages/RecipeManagement.tsx)
* **Hook**: [`src/hooks/useRecipes.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/hooks/useRecipes.tsx)
* **Batch Production Code**: [`src/pages/Inventory.tsx:L470-L520`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/pages/Inventory.tsx#L470-L520)
* **Underlying Tables**: `recipes`, `recipe_ingredients`, `inventory_items`, `menu_items`, `menu_item_variants`.

#### Key Capabilities:
1. **Bill of Materials (BOM) Linking**:
   * Maps each `menu_items` entry to raw ingredients in `inventory_items`.
   * Defines ingredient quantity and culinary unit (g, kg, ml, l, pcs).
2. **Cost Calculation Engine**:
   $$\text{Portion Cost} = \sum (\text{Ingredient Quantity} \times \text{Unit Cost})$$
   $$\text{Ideal Food Cost \%} = \left( \frac{\text{Portion Cost}}{\text{Selling Price (excl. Tax)}} \right) \times 100$$
   $$\text{Gross Margin \%} = 100 - \text{Ideal Food Cost \%}$$
3. **Variant-Specific Ingredients (Replacement Model)**:
   * Base ingredients (`variant_id IS NULL`) are included in all portion sizes.
   * Specific size ingredients (`variant_id === variant.id`) replace base ingredient quantities.
4. **Batch Production Recipes (Homemade Sub-Recipes)**:
   * Converts raw ingredients into prepared inventory items (e.g., Tomatoes + Herbs $\rightarrow$ Pizza Sauce).
   * Consumes raw materials (`transaction_type: 'production_consumed'`).
   * Credits prepared stock balance (`transaction_type: 'production_output'`).
   * Measures shrinkage / production wastage:
     $$\text{Wastage Quantity} = \max(0, \text{Input Weight} - \text{Output Weight})$$

### 6.2 Dedicated Flow Diagram

```mermaid
flowchart TD
    subgraph Recipe_Authoring ["Bill of Materials (BOM) Setup"]
        MENU_ITEM["Select Menu Item"] --> RECIPE["Table: recipes"]
        RECIPE --> ING_LIST["Add Recipe Ingredients (recipe_ingredients)"]
        ING_LIST --> RAW_ITEM["Select inventory_item_id"]
        ING_LIST --> QTY["Define Quantity & Culinary Unit"]
        ING_LIST --> VAR_OVERRIDE{"Variant Override?"}
        VAR_OVERRIDE -->|Yes| LINK_VAR["Assign variant_id (menu_item_variants)"]
        VAR_OVERRIDE -->|No| BASE_ING["Base Ingredient (variant_id = null)"]
    end

    subgraph Cost_Analytics ["Costing & Margin Engine"]
        RAW_ITEM --> FETCH_COST["Fetch cost_per_unit from inventory_items"]
        FETCH_COST --> PORTION_COST["Portion Cost = SUM(quantity * unit_cost)"]
        PORTION_COST --> SELLING_PRICE["Fetch Menu Item Selling Price"]
        SELLING_PRICE --> FOOD_COST_PCT["Ideal Food Cost % = (Portion Cost / Price) * 100"]
        FOOD_COST_PCT --> GROSS_MARGIN["Gross Margin % = 100 - Ideal Food Cost %"]
    end

    subgraph Batch_Production ["Batch Production Recipes (Homemade Items)"]
        PROD_START["Initiate Production Batch (e.g. Pizza Sauce)"] --> PICK_INPUTS["Select Raw Ingredients (Tomatoes, Oil, Spices)"]
        PICK_INPUTS --> DEDUCT_RAW["Update inventory_items (Decrease Raw Materials)"]
        DEDUCT_RAW --> LOG_CONSUMED["Insert inventory_transactions (production_consumed)"]
        
        PICK_INPUTS --> CALC_BATCH_COST["Sum Total Production Cost"]
        CALC_BATCH_COST --> CREDIT_OUTPUT["Update inventory_items (Increase Prepared Stock)"]
        CREDIT_OUTPUT --> LOG_OUTPUT["Insert inventory_transactions (production_output)"]
        
        CREDIT_OUTPUT --> SHRINKAGE{"Measure Shrinkage?"}
        SHRINKAGE -->|Input Weight > Output Weight| LOG_SHRINK["Log Production Wastage"]
    end
```

---

## 7. Menu Management & Size Variants

### 7.1 Functional Specification
* **Component Path**: [`src/pages/Menu.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/pages/Menu.tsx)
* **Components**: [`src/components/Menu/AddMenuItemForm.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Menu/AddMenuItemForm.tsx), [`src/components/Menu/AIImportDialog.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Menu/AIImportDialog.tsx), [`src/components/Menu/Quick86Modal.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Menu/Quick86Modal.tsx)
* **Hook**: [`src/hooks/use86Cascade.ts`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/hooks/use86Cascade.ts)
* **Underlying Tables**: `menu_items`, `menu_item_variants`, `categories`.

#### Key Capabilities:
1. **Catalog Architecture**:
   * Categories $\rightarrow$ Subcategories $\rightarrow$ Menu Items $\rightarrow$ Size Variants.
   * Core parameters: Name, base price, tax rate (GST 5%), preparation time, dietary tags (Veg, Non-Veg, Egg, Vegan, Gluten-Free).
2. **Size Variants Engine (`menu_item_variants`)**:
   * Allows offering portion sizes (Regular, Medium, Large, Half, Full) without cluttering the catalog.
   * **Smart Pricing Hints**:
     * $1.5\times$ base price: `"💡 Tip: ₹${suggested} (1.5× of Small) works well for Medium"`
     * $2.0\times$ base price: `"💡 Tip: ₹${suggested} (2× of Small) is a common Large price"`
3. **Out of Stock 86 Cascade (`use86Cascade.ts`)**:
   * **Single Dish 86**: Toggles `menu_items.is_available = false`, instantly locking the dish across POS, QR menus, and aggregators.
   * **Ingredient 86 Cascade**: When an inventory raw material runs out (e.g., Paneer stock $= 0$), `toggleIngredientCascadeMutation` finds all recipes using that inventory item and 86's all affected dishes simultaneously.
4. **Gemini AI Vision Menu Importer**:
   * Extracts categories, items, prices, and size variants directly from a physical menu photo.

### 7.2 Dedicated Flow Diagram

```mermaid
flowchart TD
    subgraph Menu_Creation ["Menu Item Architecture"]
        CAT["Create / Select Category"] --> ITEM_FORM["AddMenuItemForm"]
        ITEM_FORM --> CORE_FIELDS["Name, Base Price, Tax Rate, Prep Time, Diet (Veg/Non-Veg)"]
        ITEM_FORM --> VAR_TOGGLE{"Has Size Variants?"}
    end

    subgraph Variants_Engine ["Size Variants & Smart Pricing Engine"]
        VAR_TOGGLE -- Yes --> VAR_ROWS["Define Variants (menu_item_variants)"]
        VAR_ROWS --> V_NAME["Variant Name: Regular, Medium, Large, Half, Full"]
        VAR_ROWS --> V_PRICE["Input Variant Price"]
        
        V_PRICE --> SMART_HINT["Smart Pricing Hint Engine"]
        SMART_HINT --> HINT1["1.5x of Size 1: '💡 Works well for Medium'"]
        SMART_HINT --> HINT2["2.0x of Size 1: '💡 Common Large price'"]
        
        VAR_ROWS --> DB_VAR["INSERT / UPSERT menu_item_variants"]
    end

    subgraph Out_Of_Stock_86 ["Quick 86 Cascade Architecture"]
        OUT_OF_STOCK["Ingredient Stockout or Chef 86"] --> CHECK_TYPE{"86 Mode"}
        
        CHECK_TYPE -->|Single Dish| DISH_86["toggleDishMutation"]
        DISH_86 --> SET_FALSE["UPDATE menu_items (is_available = false)"]
        
        CHECK_TYPE -->|Ingredient Level| CASCADE_86["toggleIngredientCascadeMutation"]
        CASCADE_86 --> FIND_RECIPES["Scan recipe_ingredients for inventory_item_id"]
        FIND_RECIPES --> FIND_DISHES["Map to linked menu_items"]
        FIND_DISHES --> MASS_DISABLE["UPDATE menu_items WHERE id IN (linkedIds) (is_available = false)"]
        
        SET_FALSE --> REALTIME_SYNC["Supabase Realtime Broadcast"]
        MASS_DISABLE --> REALTIME_SYNC
        REALTIME_SYNC --> POS_LOCK["Grey out & lock item in QSR POS"]
        REALTIME_SYNC --> QR_LOCK["Hide / mark sold-out on Guest QR Menu"]
    end

    subgraph AI_Extraction ["AI Vision Scanner"]
        MENU_PHOTO["Capture Paper Menu Photo"] --> GEMINI["Gemini AI Vision OCR"]
        GEMINI --> EXTRACT["Extract Categories, Items, Prices, Size Variants"]
        EXTRACT --> PREVIEW["AIImportDialog (Review & Edit)"]
        PREVIEW --> BULK_SAVE["Bulk INSERT into menu_items & menu_item_variants"]
    end
```

---

## 8. Tables & Floor Management

### 8.1 Functional Specification
* **Component Path**: [`src/pages/Tables.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/pages/Tables.tsx)
* **Hook**: [`src/hooks/useTables.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/hooks/useTables.tsx)
* **Grid Component**: [`src/components/Tables/TableGrid.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Tables/TableGrid.tsx)
* **Underlying Tables**: `tables`, `table_sections`.

#### Key Capabilities:
1. **Section Zones**:
   * Classifies restaurant floor into distinct physical areas (Main Dining, AC Family, Patio, Rooftop, Bar).
2. **Table Definition & Capacities**:
   * Assigns seating capacity (2-pax, 4-pax, 8-pax, Banquet) to prevent overbooking.
3. **Dynamic Table QR Code Engine**:
   * Generates unique QR codes encoded with URL `/customer-order?table=<name>`.
   * Supports exporting SVG and high-resolution PNG for acrylic standee printing.
4. **State Synchronization**:
   * Realtime broadcast on status transitions: `available` $\rightarrow$ `occupied` $\rightarrow$ `billed` $\rightarrow$ `dirty` $\rightarrow$ `available`.

### 8.2 Dedicated Flow Diagram

```mermaid
flowchart TD
    subgraph Zone_Config ["Section & Zone Setup"]
        SECT["Create Sections (table_sections)"] --> S_TYPES["Main Hall, Rooftop, Garden, AC Family, Bar Counter"]
        S_TYPES --> TBL_CONFIG["Define Table: Name, Capacity (Pax), Section"]
        TBL_CONFIG --> TBL_INSERT["Insert into tables"]
    end

    subgraph QR_Generation ["Dynamic Contactless QR Generation"]
        TBL_INSERT --> QR_GEN["Generate Dynamic Table QR Code"]
        QR_GEN --> QR_URL["URL: /customer-order?table=X"]
        QR_GEN --> QR_PRINT["Download & Print Table Standee (SVG/PNG)"]
        GUEST_PHONE["Guest Scans QR"] --> QR_URL
        QR_URL --> DIGITAL_MENU["Load Digital Menu & Direct Order Intake"]
    end

    subgraph State_Transitions ["Table Status State Machine"]
        ST_AVAILABLE["Available (Unoccupied)"] -->|Guest Seated / Walk-in| ST_OCCUPIED["Occupied (Ordering / Active KOT)"]
        ST_OCCUPIED -->|KOT Fired| ST_DINING["Food Served / Dining"]
        ST_DINING -->|Bill Presented| ST_BILLED["Billed (Pending Payment)"]
        ST_BILLED -->|Payment Cleared| ST_DIRTY["Dirty (Needs Busboy)"]
        ST_DIRTY -->|Busboy Cleans & Sanitizes| ST_AVAILABLE
    end

    subgraph Floor_Sync ["Cross-System Broadcasting"]
        State_Transitions --> BROADCAST["Supabase Realtime Broadcast"]
        BROADCAST --> DT_SYNC["Updates Digital Twin 2D Blueprint Node"]
        BROADCAST --> POS_SYNC["Updates QSR POS Table Grid Color"]
        BROADCAST --> DASH_SYNC["Updates Dashboard Live Capacity Gauge"]
    end
```

---

## 9. Inventory & FIFO Deductions

### 9.1 Functional Specification
* **Component Path**: [`src/pages/Inventory.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/pages/Inventory.tsx)
* **Edge Function**: [`supabase/functions/deduct-inventory-on-prep/index.ts`](file:///G:/restaurant/Sudip/tasty-bite-harbor/supabase/functions/deduct-inventory-on-prep/index.ts)
* **Underlying Tables**: `inventory_items`, `inventory_lots`, `inventory_transactions`, `suppliers`.

#### Key Capabilities:
1. **Raw Material Catalog**:
   * Tracks stock balance, base unit of measurement, minimum reorder thresholds, and suppliers.
2. **Inward Stock & FIFO Lots (`inventory_lots`)**:
   * Each purchase receipt creates a lot row recording `purchase_date`, `unit_cost`, `quantity_remaining`, and batch/expiry info.
3. **Culinary Unit Conversion Table**:
   Normalizes disparate culinary measures to raw stock base units:

   | Measure Group | Input Units | Base Inventory Unit | Conversion Ratio |
   | :--- | :--- | :--- | :--- |
   | **Weight** | `g`, `gram` | `kg` | $\times 0.001$ |
   | **Volume** | `ml`, `milliliter` | `l` | $\times 0.001$ |
   | **Volume (Bar)**| `tbsp` (15ml), `tsp` (5ml) | `l` | $\times 0.015$, $\times 0.005$ |
   | **Volume (Baking)**| `cup` (240ml) | `l` | $\times 0.24$ |
   | **Count** | `piece`, `pcs` | `piece` | $1 : 1$ |
   | **Multipack**| `dozen` | `piece` | $\times 12$ |

4. **FIFO Lot Consumption & COGS Valuation**:
   * When `deduct-inventory-on-prep` executes:
     1. Queries `inventory_lots` where `inventory_item_id = ?` and `quantity_remaining > 0` ordered by `purchase_date ASC` (oldest lot first).
     2. Depletes the oldest lot first until exhausted, then flows into subsequent lots.
     3. Writes immutable rows to `inventory_transactions` with `transaction_type: 'usage'` and exact lot purchase cost.
     4. If lot stock is exhausted, falls back to `inventory_items.cost_per_unit`.
     5. Decrements `inventory_items.quantity = quantity - deductAmount`.

### 9.2 Dedicated Flow Diagram

```mermaid
flowchart TD
    subgraph Inward_Stock ["Procurement & Inward Flow"]
        PO["Supplier Purchase Order"] --> INWARD["Receive Stock in Inventory"]
        INWARD --> CREATE_LOT["Create inventory_lots"]
        CREATE_LOT --> LOT_DATA["purchase_date, unit_cost, quantity_remaining"]
        CREATE_LOT --> UPDATE_STOCK["Increase inventory_items.quantity"]
        INWARD --> LOG_PURCHASE["Insert inventory_transactions (type: 'purchase')"]
    end

    subgraph Deduct_Trigger ["Deduction Trigger"]
        KDS_PREP["KDS: Cook clicks 'Start Prep' or bumps ticket"] --> TRIGGER_DEDUCT["Invoke deduct-inventory-on-prep"]
        POS_INSTANT["POS: Fast-pay counter checkout"] --> TRIGGER_DEDUCT
    end

    subgraph Resolution ["Recipe & Variant Resolution"]
        TRIGGER_DEDUCT --> FETCH_KO["Fetch kitchen_orders.items"]
        FETCH_KO --> RESOLVE_NAME{"Has menuItemId?"}
        RESOLVE_NAME -- No --> FUZZY["Fuzzy Match / Strip Variant Suffix ('Pizza (Medium)')"]
        RESOLVE_NAME -- Yes --> PARSE_VAR["Parse Compound Key: baseId__variantId"]
        
        FUZZY --> FETCH_RECIPE["Fetch active recipe from recipes"]
        PARSE_VAR --> FETCH_RECIPE
        
        FETCH_RECIPE --> LOAD_INGS["Fetch recipe_ingredients"]
        LOAD_INGS --> REPLACEMENT_MODEL{"Variant Selected?"}
        REPLACEMENT_MODEL -- Yes --> OVERLAY["Replace Base Ingredients with Variant-Specific Overrides"]
        REPLACEMENT_MODEL -- No --> BASE_ONLY["Use Base Ingredients Only (variant_id = null)"]
    end

    subgraph FIFO_Engine ["Unit Conversion & FIFO Lot Depletion"]
        OVERLAY --> CONVERT["convertToBaseUnit: g->kg, ml->l, tbsp->l, cup->l, dozen->12"]
        BASE_ONLY --> CONVERT
        
        CONVERT --> QUERY_LOTS["Query inventory_lots (quantity_remaining > 0 ORDER BY purchase_date ASC)"]
        
        QUERY_LOTS --> LOOP_LOTS{"Loop Through Lots (Oldest to Newest)"}
        LOOP_LOTS --> DEPLETE_LOT["Deduct from lot.quantity_remaining"]
        DEPLETE_LOT --> LOG_USAGE["Insert inventory_transactions (type: 'usage', lot_id, unit_cost)"]
        
        LOOP_LOTS -->|Lots Exhausted / Missing| FALLBACK_COST["Fallback: Use inventory_items.cost_per_unit"]
        FALLBACK_COST --> LOG_FALLBACK_USAGE["Insert inventory_transactions (fallback cost)"]
        
        DEPLETE_LOT --> TOTAL_DEPLETE["Update inventory_items.quantity = quantity - deductAmount"]
        TOTAL_DEPLETE --> REORDER_CHECK{"quantity <= reorder_level?"}
        REORDER_CHECK -- Yes --> ALERT["Send Low Stock Warning Alert"]
        REORDER_CHECK -- No --> COMPLETE["Return 200 OK"]
    end
```

---

## 10. Expenses & Food Wastage Management

### 10.1 Functional Specification
* **Component Path**: [`src/pages/Expenses.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/pages/Expenses.tsx)
* **Components**: [`src/components/Expenses/ExpensesList.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Expenses/ExpensesList.tsx), [`src/components/Expenses/ExpenseWastageTab.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/components/Expenses/ExpenseWastageTab.tsx)
* **Hook**: [`src/hooks/useExpenseData.tsx`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/hooks/useExpenseData.tsx)
* **Underlying Tables**: `expenses`, `expense_categories`, `inventory_items`, `inventory_transactions`.

#### Key Capabilities:
1. **Operating Expense Logging**:
   * Logs direct and indirect overheads: Rent, Electricity/Gas, Salaries/Wages, Repairs/Maintenance, Marketing, Packaging, and Ingredients.
   * Multi-account tenders: Petty Cash Drawer, Bank Transfer, UPI, Corporate Credit Card.
2. **Food Wastage & Spoilage Ledger (`ExpenseWastageTab.tsx`)**:
   * Records food losses with mandatory reason classification: `Burnt in Kitchen`, `Expired Shelf Life`, `Dropped / Spilled`, `Over-Prepared Batch`.
   * Automatically calculates financial loss:
     $$\text{Loss Amount} = \text{Wasted Quantity} \times \text{Ingredient Cost Per Unit}$$
   * Deducts quantity from `inventory_items`, logs transaction `type: 'waste'` in `inventory_transactions`, and auto-inserts an expense entry into `expenses` under "Food Wastage".
3. **Consolidated P&L Statement**:
   $$\text{Net Operating Profit} = \text{Gross Revenue} - \text{Discounts} - \text{COGS (FIFO Usage)} - \text{Wastage Losses} - \text{Operating Expenses}$$

### 10.2 Dedicated Flow Diagram

```mermaid
flowchart TD
    subgraph Direct_Expenses ["Operational Overhead Entries"]
        ADD_EXP["Add Expense Entry"] --> EXP_CATEGORY{"Category"}
        EXP_CATEGORY --> C_UTIL["Utilities (Electricity, Gas, Water)"]
        EXP_CATEGORY --> C_RENT["Rent & Property Lease"]
        EXP_CATEGORY --> C_PAY["Staff Payroll & Wages"]
        EXP_CATEGORY --> C_MAINT["Repairs & Maintenance"]
        EXP_CATEGORY --> C_MKT["Marketing & Advertising"]
        EXP_CATEGORY --> C_PKG["Packaging & Delivery Supplies"]
        EXP_CATEGORY --> C_MISC["Miscellaneous"]

        EXP_CATEGORY --> ACCOUNT{"Payment Account"}
        ACCOUNT --> A_CASH["Cash Drawer (Petty Cash)"]
        ACCOUNT --> A_BANK["Corporate Bank Account"]
        ACCOUNT --> A_UPI["UPI QR / Net Banking"]
        ACCOUNT --> A_CARD["Credit Card"]
        
        ACCOUNT --> SAVE_EXP["INSERT into expenses"]
    end

    subgraph Wastage_Ledger ["Food Wastage & Spoilage Ledger"]
        WASTE_OCCUR["Food Spoiled / Burnt / Dropped / Expired"] --> WASTE_TAB["ExpenseWastageTab"]
        WASTE_TAB --> PICK_INV["Select inventory_item_id"]
        PICK_INV --> INPUT_WASTE_QTY["Input Wasted Quantity"]
        INPUT_WASTE_QTY --> REASON{"Select Reason"}
        REASON --> R_EXPIRE["Expired Shelf Life"]
        REASON --> R_BURNT["Burnt in Kitchen"]
        REASON --> R_DROP["Dropped / Spilled"]
        REASON --> R_OVERPREP["Over-Prepared Daily Batch"]

        REASON --> CALC_LOSS["Calculate Financial Loss = Wasted Qty * cost_per_unit"]
        CALC_LOSS --> WRITE_OFF_INV["UPDATE inventory_items (Decrease Stock)"]
        WRITE_OFF_INV --> LOG_WASTE_TRANS["Insert inventory_transactions (type: 'waste')"]
        LOG_WASTE_TRANS --> POST_WASTE_EXP["Auto-Insert into expenses (Category: 'Ingredients', Subcategory: 'Food Wastage')"]
    end

    subgraph PnL_Consolidation ["Profit & Loss Engine"]
        SAVE_EXP --> LIVE_PNL["Live P&L Aggregator (useProfitLoss.tsx)"]
        POST_WASTE_EXP --> LIVE_PNL
        
        POS_SALES["POS Gross Sales"] --> LIVE_PNL
        POS_DISCOUNTS["Discounts & NC Voids"] --> LIVE_PNL
        FIFO_COGS["FIFO Inventory Usage Costs"] --> LIVE_PNL

        LIVE_PNL --> EQUATION["Net Profit = Gross Sales - Discounts - COGS - Wastage Losses - Operating Expenses"]
        EQUATION --> REPORT["Display P&L Ledger & Monthly Analytics"]
    end
```

---

## 11. Hardware Thermal & Bluetooth Printing Pipeline

* **Service Path**: [`src/services/thermalPrinterService.ts`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/services/thermalPrinterService.ts)
* **Native Android Bridge**: [`src/services/nativePrinterBridge.ts`](file:///G:/restaurant/Sudip/tasty-bite-harbor/src/services/nativePrinterBridge.ts)

```mermaid
flowchart TD
    A["POS Checkout / Manual Print"] --> B{"Capacitor.isNativePlatform()?"}
    
    %% Native Android Path
    B -- Yes (Android APK) --> C["nativePrinterBridge.sendESCPOS()"]
    C --> D["Mutex Write Queue (_writeQueue prevents byte interleaving)"]
    D --> E["Slice into 512-byte chunks with 15ms throttle delay"]
    E --> F["window.bluetoothSerial.write() -> SPP RFCOMM socket"]
    F --> G["Thermal Printer Hardware Output"]

    %% Web Bluetooth Path
    B -- No (Browser) --> H{"Web Bluetooth Connected?"}
    H -- Yes --> I["navigator.bluetooth GATT Characteristic"]
    I --> J["Slice into 100-byte chunks with 10ms throttle delay"]
    J --> G

    %% Browser Fallback
    H -- No --> K["Hidden Iframe Fallback (#_kot_print_frame / #_bill_print_frame)"]
    K --> L["Inject thermal monospace CSS (58mm or 80mm)"]
    L --> M["Call iframe.contentWindow.print()"]
```

---

## 12. Operations Database Entity Relationship (ER) Diagram

```mermaid
erDiagram
    categories ||--o{ menu_items : contains
    menu_items ||--o{ menu_item_variants : has
    menu_items ||--o| recipes : defines
    recipes ||--o{ recipe_ingredients : specifies
    inventory_items ||--o{ recipe_ingredients : "used in"
    inventory_items ||--o{ inventory_lots : tracks
    inventory_items ||--o{ inventory_transactions : logs
    inventory_lots ||--o{ inventory_transactions : "consumed from"
    
    table_sections ||--o{ tables : divides
    tables ||--o{ restaurant_floor_elements : mirrors
    tables ||--o| orders : hosts
    orders ||--o{ order_items : contains
    orders ||--o| kitchen_orders : synchronizes
    kitchen_orders ||--o{ inventory_transactions : triggers

    expenses ||--o{ expense_categories : categorized_by
    inventory_transactions ||--o{ expenses : "wastage write-offs"
```
