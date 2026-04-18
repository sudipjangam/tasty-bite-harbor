/**
 * Universal Feature Registry
 * 
 * Every controllable feature in the system is defined here using dot-notation keys.
 * Format: <component>.<section>.<feature>
 * 
 * This is the SINGLE SOURCE OF TRUTH used by:
 * 1. The Admin "Subscription Permissions Manager" UI (checkbox-tree editor)
 * 2. The runtime <FeatureLock> component and useFeatureGate() hook
 * 3. The data migration script for existing plans
 */

export interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
}

export interface FeatureCategory {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind gradient
  features: FeatureDefinition[];
}

export const FEATURE_REGISTRY: FeatureCategory[] = [
  // ─── Dashboard ─────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    color: 'from-indigo-500 to-purple-600',
    features: [
      { key: 'dashboard.basic', label: 'Basic Dashboard', description: 'Core dashboard with stats and live orders' },
      { key: 'dashboard.custom_widgets', label: 'Custom Widgets', description: 'Drag-and-drop dashboard widget customization' },
      { key: 'dashboard.room_status', label: 'Room Status Widget', description: 'Live room occupancy widget' },
      { key: 'dashboard.staff_attendance', label: 'Staff Attendance Widget', description: 'Staff attendance overview widget' },
      { key: 'dashboard.food_truck', label: 'Food Truck Dashboard', description: 'Specialized food truck dashboard view' },
    ],
  },

  // ─── POS Systems ──────────────────────────────────────────────────────
  {
    id: 'pos',
    label: 'POS Systems',
    icon: 'Monitor',
    color: 'from-blue-500 to-indigo-600',
    features: [
      { key: 'pos.basic', label: 'Basic POS', description: 'Core POS ordering functionality' },
      { key: 'pos.whatsapp_billing', label: 'WhatsApp Auto-Bill', description: 'Send automated WhatsApp bills to customers' },
      { key: 'pos.offline_mode', label: 'Offline Mode', description: 'Continue taking orders without internet' },
      { key: 'pos.advanced_discounts', label: 'Advanced Discounts', description: 'Percentage, flat, loyalty, coupon stacking' },
      { key: 'pos.custom_items', label: 'Custom Items', description: 'Add custom line items not in menu' },
      { key: 'pos.hold_orders', label: 'Hold Orders', description: 'Park and resume orders' },
      { key: 'pos.daily_summary', label: 'Daily Summary', description: 'End-of-day summary dialog' },
    ],
  },

  // ─── Quick Serve ──────────────────────────────────────────────────────
  {
    id: 'quickserve',
    label: 'Quick Serve',
    icon: 'Zap',
    color: 'from-orange-500 to-amber-600',
    features: [
      { key: 'quickserve.basic', label: 'Basic Quick Serve', description: 'Core quick serve POS' },
      { key: 'quickserve.qsr_pos', label: 'QSR POS (Component)', description: 'Dedicated Quick Service Restaurant POS page' },
      { key: 'quickserve.custom_widgets', label: 'Custom Widgets', description: 'Drag-and-drop dashboard widget customization' },
      { key: 'quickserve.live_metrics', label: 'Live Revenue Metrics', description: 'Real-time revenue & order count bar' },
      { key: 'quickserve.loyalty_integration', label: 'Loyalty Integration', description: 'Points redemption at checkout' },
      { key: 'quickserve.coupon_engine', label: 'Coupon Engine', description: 'Apply promo codes at checkout' },
    ],
  },
// ─── QSR-POS ──────────────────────────────────────────────────────
  {
    id: 'qsr-pos',
    label: 'QSR-POS',
    icon: 'Zap',
    color: 'from-orange-500 to-amber-600',
    features: [
      { key: 'qsr-pos.basic', label: 'Basic Quick Serve', description: 'Core quick serve POS' },
      { key: 'qsr-pos.custom_widgets', label: 'Custom Widgets', description: 'Drag-and-drop dashboard widget customization' },
      { key: 'qsr-pos.live_metrics', label: 'Live Revenue Metrics', description: 'Real-time revenue & order count bar' },
      { key: 'qsr-pos.loyalty_integration', label: 'Loyalty Integration', description: 'Points redemption at checkout' },
      { key: 'qsr-pos.coupon_engine', label: 'Coupon Engine', description: 'Apply promo codes at checkout' },
    ],
  },
  // ─── Orders ───────────────────────────────────────────────────────────
  {
    id: 'orders',
    label: 'Orders',
    icon: 'ShoppingCart',
    color: 'from-emerald-500 to-green-600',
    features: [
      { key: 'orders.view', label: 'View Orders', description: 'Basic order list and tracking' },
      { key: 'orders.analytics', label: 'Order Analytics', description: 'Advanced order breakdowns' },
      { key: 'orders.third_party_sync', label: 'Third-Party Sync', description: 'Zomato, Swiggy integration' },
      { key: 'orders.nc_orders', label: 'NC Orders', description: 'Non-chargeable order management' },
    ],
  },

  // ─── Kitchen ──────────────────────────────────────────────────────────
  {
    id: 'kitchen',
    label: 'Kitchen',
    icon: 'ChefHat',
    color: 'from-red-500 to-rose-600',
    features: [
      { key: 'kitchen.kds', label: 'Kitchen Display', description: 'Standard KDS ticket view' },
      { key: 'kitchen.multi_station', label: 'Multi-Station', description: 'Route tickets to specific stations' },
      { key: 'kitchen.analytics', label: 'Kitchen Analytics', description: 'Prep times, throughput metrics' },
    ],
  },

  // ─── Menu ─────────────────────────────────────────────────────────────
  {
    id: 'menu',
    label: 'Menu',
    icon: 'UtensilsCrossed',
    color: 'from-violet-500 to-purple-600',
    features: [
      { key: 'menu.basic', label: 'Menu Management', description: 'Add, edit, categorize menu items' },
      { key: 'menu.modifiers', label: 'Modifier Groups', description: 'Size, add-ons, customizations' },
      { key: 'menu.dynamic_pricing', label: 'Dynamic Pricing', description: 'Time-based / demand-based pricing' },
      { key: 'menu.multi_location', label: 'Multi-Location Sync', description: 'Sync menu across outlets' },
    ],
  },

  // ─── Inventory ────────────────────────────────────────────────────────
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'Package',
    color: 'from-teal-500 to-cyan-600',
    features: [
      { key: 'inventory.overview', label: 'Stock Overview', description: 'View and manage stock items' },
      { key: 'inventory.alerts', label: 'Low-Stock Alerts', description: 'Automated reorder notifications' },
      { key: 'inventory.stocktake', label: 'Stocktake', description: 'Physical stock counting' },
      { key: 'inventory.purchase_orders', label: 'Purchase Orders', description: 'Create and track POs' },
      { key: 'inventory.suggestions', label: 'PO Suggestions', description: 'AI-powered reorder suggestions' },
      { key: 'inventory.forecasting', label: 'Demand Forecasting', description: 'Predict future inventory needs' },
      { key: 'inventory.transactions', label: 'Transaction History', description: 'Full audit trail' },
      { key: 'inventory.lots', label: 'Lot Tracking', description: 'FIFO lot and expiry management' },
      { key: 'inventory.bill_scan', label: 'Bill Scanning', description: 'OCR-powered bill upload' },
    ],
  },

  // ─── Recipes & Costing ────────────────────────────────────────────────
  {
    id: 'recipes',
    label: 'Recipes & Costing',
    icon: 'Soup',
    color: 'from-amber-500 to-yellow-600',
    features: [
      { key: 'recipes.view', label: 'Recipe Management', description: 'Create and edit recipes' },
      { key: 'recipes.costing', label: 'Food Costing', description: 'Ingredient cost calculations' },
      { key: 'recipes.menu_engineering', label: 'Menu Engineering', description: 'Star/Plowhorse/Puzzle/Dog analysis' },
      { key: 'recipes.batch_processing', label: 'Batch Production', description: 'Batch prep tracking and scheduling' },
    ],
  },

  // ─── Tables ───────────────────────────────────────────────────────────
  {
    id: 'tables',
    label: 'Tables',
    icon: 'LayoutGrid',
    color: 'from-sky-500 to-blue-600',
    features: [
      { key: 'tables.grid', label: 'Table Grid', description: 'Basic table layout and status' },
      { key: 'tables.timers', label: 'Table Timers', description: 'Occupancy time tracking' },
      { key: 'tables.optimization', label: 'Seating Optimization', description: 'Smart seating suggestions' },
    ],
  },

  // ─── Reports & Analytics ──────────────────────────────────────────────
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: 'BarChart3',
    color: 'from-purple-500 to-fuchsia-600',
    features: [
      // Tab-level access
      { key: 'reports.analytics', label: 'Analytics Page', description: 'Dedicated Business Insights dashboard' },
      { key: 'reports.tabs.analytics', label: 'Advanced Analytics Tab', description: 'BI-level trend charts' },
      { key: 'reports.tabs.default', label: 'Default Reports Tab', description: 'Pre-built report cards' },
      { key: 'reports.tabs.custom_builder', label: 'Custom Report Builder Tab', description: 'Build your own reports' },
      { key: 'reports.tabs.export_center', label: 'Export Center Tab', description: 'Bulk export to PDF/Excel' },
      // Individual report categories
      { key: 'reports.default.orders_sales', label: 'Orders & Sales Report', description: 'Revenue, order count, payments' },
      { key: 'reports.default.menu_items', label: 'Menu Items Report', description: 'Item-wise sales & qty' },
      { key: 'reports.default.inventory', label: 'Inventory Report', description: 'Stock levels, low-stock' },
      { key: 'reports.default.customers', label: 'Customers Report', description: 'Visit frequency, loyalty' },
      { key: 'reports.default.staff', label: 'Staff Report', description: 'Attendance, hours worked' },
      { key: 'reports.default.suppliers', label: 'Suppliers Report', description: 'Purchase history, pending' },
      { key: 'reports.default.expenses', label: 'Expenses Report', description: 'Breakdown, category totals' },
      { key: 'reports.default.recipes', label: 'Recipes Report', description: 'Food cost, margin analysis' },
      { key: 'reports.default.promotions', label: 'Promotions Report', description: 'Campaign performance' },
      { key: 'reports.default.repeat_customers', label: 'Repeat Customers Report', description: 'Day-wise repeat customer analysis' },
    ],
  },

  // ─── Customers & CRM ──────────────────────────────────────────────────
  {
    id: 'customers',
    label: 'Customers & CRM',
    icon: 'Users',
    color: 'from-pink-500 to-rose-600',
    features: [
      { key: 'customers.basic', label: 'Customer List', description: 'View and manage customers' },
      { key: 'customers.crm', label: 'CRM Features', description: 'Advanced segmentation, campaigns' },
      { key: 'customers.loyalty', label: 'Loyalty Program', description: 'Points, tiers, rewards' },
    ],
  },

  // ─── Staff & Management ───────────────────────────────────────────────
  {
    id: 'staff',
    label: 'Staff & Management',
    icon: 'UserCheck',
    color: 'from-indigo-500 to-blue-600',
    features: [
      { key: 'staff.roster', label: 'Staff Roster', description: 'List and manage staff' },
      { key: 'staff.attendance', label: 'Attendance', description: 'Clock-in/out & tracking' },
      { key: 'staff.shifts', label: 'Shift Management', description: 'Schedule and manage shifts' },
      { key: 'staff.payroll', label: 'Payroll Integration', description: 'Salary computation & export' },
    ],
  },

  // ─── Financial ────────────────────────────────────────────────────────
  {
    id: 'financial',
    label: 'Financial',
    icon: 'DollarSign',
    color: 'from-green-500 to-emerald-600',
    features: [
      { key: 'financial.dashboard', label: 'Financial Dashboard', description: 'P&L, cash flow' },
      { key: 'financial.budget', label: 'Budget Management', description: 'Set and track budgets' },
      { key: 'financial.invoicing', label: 'Invoicing', description: 'Generate customer invoices' },
    ],
  },

  // ─── Expenses ─────────────────────────────────────────────────────────
  {
    id: 'expenses',
    label: 'Expenses',
    icon: 'Receipt',
    color: 'from-red-500 to-orange-600',
    features: [
      { key: 'expenses.basic', label: 'Expense Tracking', description: 'Log and categorize expenses' },
      { key: 'expenses.advanced', label: 'Advanced Analytics', description: 'Trends, projections' },
    ],
  },

  // ─── Suppliers ────────────────────────────────────────────────────────
  {
    id: 'suppliers',
    label: 'Suppliers',
    icon: 'Truck',
    color: 'from-cyan-500 to-teal-600',
    features: [
      { key: 'suppliers.basic', label: 'Supplier Management', description: 'Add and track suppliers' },
      { key: 'suppliers.orders', label: 'Supplier Orders', description: 'Place and track supply orders' },
    ],
  },

  // ─── Reservations & Rooms ─────────────────────────────────────────────
  {
    id: 'reservations',
    label: 'Reservations & Rooms',
    icon: 'CalendarDays',
    color: 'from-rose-500 to-pink-600',
    features: [
      { key: 'reservations.basic', label: 'Reservations', description: 'Table booking management' },
      { key: 'rooms.management', label: 'Room Management', description: 'Hotel room CRUD' },
      { key: 'rooms.housekeeping', label: 'Housekeeping', description: 'Cleaning task management' },
      { key: 'rooms.channel_mgmt', label: 'Channel Management', description: 'OTA sync' },
    ],
  },

  // ─── Gate Services & Security ─────────────────────────────────────────
  {
    id: 'gate',
    label: 'Gate Services',
    icon: 'Shield',
    color: 'from-slate-500 to-gray-600',
    features: [
      { key: 'gate.access', label: 'Gate Access', description: 'Standard entry/exit logging' },
      { key: 'gate.valet', label: 'Valet Management', description: 'Vehicle tracking' },
      { key: 'gate.vip', label: 'VIP Management', description: 'VIP alerts and protocols' },
    ],
  },

  // ─── Settings & Security ──────────────────────────────────────────────
  {
    id: 'settings',
    label: 'Settings & Security',
    icon: 'Settings',
    color: 'from-gray-500 to-slate-600',
    features: [
      { key: 'settings.basic', label: 'Basic Settings', description: 'Restaurant profile, branding' },
      { key: 'settings.security', label: 'Security Audit', description: 'Login logs, access history' },
      { key: 'settings.gdpr', label: 'GDPR/Compliance', description: 'Data management tools' },
    ],
  },

  // ─── User & Permission Management ─────────────────────────────────────
  {
    id: 'users_permissions',
    label: 'User & Access Mgmt',
    icon: 'Key',
    color: 'from-blue-600 to-indigo-700',
    features: [
      { key: 'users_permissions.user_access', label: 'User & Access', description: 'Manage system users, roles, and user permissions' },
      { key: 'users_permissions.permission_management', label: 'Permission Management', description: 'Access to the global Component Permissions page' },
    ],
  },


  // ─── AI & Advanced ────────────────────────────────────────────────────
  {
    id: 'ai',
    label: 'AI & Advanced',
    icon: 'Sparkles',
    color: 'from-fuchsia-500 to-purple-600',
    features: [
      { key: 'ai.assistant', label: 'AI Assistant', description: 'Chat-based business insights' },
      { key: 'ai.analytics', label: 'AI Analytics', description: 'ML-powered predictions' },
    ],
  },

  // ─── Marketing ────────────────────────────────────────────────────────
  {
    id: 'marketing',
    label: 'Marketing',
    icon: 'Megaphone',
    color: 'from-pink-500 to-fuchsia-600',
    features: [
      { key: 'marketing.campaigns', label: 'Campaigns', description: 'Create and manage marketing campaigns' },
      { key: 'marketing.whatsapp', label: 'WhatsApp Campaigns', description: 'WhatsApp template management & bulk messaging' },
      { key: 'marketing.segments', label: 'Customer Segments', description: 'Segment customers by spend, frequency, recency' },
      { key: 'marketing.analytics', label: 'Marketing Analytics', description: 'Campaign performance, ROI, messages sent' },
      { key: 'marketing.loyalty', label: 'Loyalty Manager', description: 'Configure loyalty tiers & rewards' },
    ],
  },
];

/**
 * Get all feature keys as a flat array (for validation, etc.)
 */
export const ALL_FEATURE_KEYS: string[] = FEATURE_REGISTRY.flatMap(
  (category) => category.features.map((f) => f.key)
);

/**
 * Lookup a feature's label by key (for upgrade toast messages)
 */
export const getFeatureLabel = (featureKey: string): string => {
  for (const category of FEATURE_REGISTRY) {
    const feature = category.features.find((f) => f.key === featureKey);
    if (feature) return feature.label;
  }
  return featureKey; // Fallback to the raw key
};

/**
 * Lookup which category a feature belongs to
 */
export const getFeatureCategory = (featureKey: string): string => {
  const prefix = featureKey.split('.')[0];
  const category = FEATURE_REGISTRY.find((c) => c.id === prefix);
  return category?.label || 'Unknown';
};
