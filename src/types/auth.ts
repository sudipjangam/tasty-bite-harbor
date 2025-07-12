/**
 * Enhanced authentication and role-based access types
 */

export type UserRole = 'owner' | 'admin' | 'manager' | 'chef' | 'waiter' | 'staff' | 'viewer';

export type Permission = 
  // Dashboard permissions
  | 'dashboard.view'
  | 'dashboard.analytics'
  
  // Orders permissions
  | 'orders.view'
  | 'orders.create'
  | 'orders.update'
  | 'orders.delete'
  | 'pos.access'
  
  // Menu permissions
  | 'menu.view'
  | 'menu.create'
  | 'menu.update'
  | 'menu.delete'
  
  // Inventory permissions
  | 'inventory.view'
  | 'inventory.create'
  | 'inventory.update'
  | 'inventory.delete'
  
  // Staff permissions
  | 'staff.view'
  | 'staff.create'
  | 'staff.update'
  | 'staff.delete'
  | 'staff.manage_roles'
  
  // Customer permissions
  | 'customers.view'
  | 'customers.create'
  | 'customers.update'
  | 'customers.delete'
  
  // Rooms permissions
  | 'rooms.view'
  | 'rooms.create'
  | 'rooms.update'
  | 'rooms.delete'
  | 'rooms.checkout'
  
  // Reservations permissions
  | 'reservations.view'
  | 'reservations.create'
  | 'reservations.update'
  | 'reservations.delete'
  
  // Analytics permissions
  | 'analytics.view'
  | 'analytics.export'
  
  // Financial permissions
  | 'financial.view'
  | 'financial.create'
  | 'financial.update'
  | 'financial.delete'
  | 'financial.reports'
  
  // Settings permissions
  | 'settings.view'
  | 'settings.update'
  | 'settings.manage_users'
  | 'users.manage'
  
  // Kitchen permissions
  | 'kitchen.view'
  | 'kitchen.update'
  
  // Tables permissions
  | 'tables.view'
  | 'tables.create'
  | 'tables.update'
  | 'tables.delete'
  
  // Housekeeping permissions
  | 'housekeeping.view'
  | 'housekeeping.create'
  | 'housekeeping.update'
  | 'housekeeping.delete'
  
  // Audit permissions
  | 'audit.view'
  | 'audit.export'
  
  // Backup permissions
  | 'backup.create'
  | 'backup.restore'
  | 'backup.view'
  
  // GDPR permissions
  | 'gdpr.view'
  | 'gdpr.export'
  | 'gdpr.delete';

export interface RolePermissions {
  [key: string]: Permission[];
}

export const rolePermissions: RolePermissions = {
  owner: [
    // Full access to everything
    'dashboard.view', 'dashboard.analytics',
    'orders.view', 'orders.create', 'orders.update', 'orders.delete', 'pos.access',
    'menu.view', 'menu.create', 'menu.update', 'menu.delete',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
    'staff.view', 'staff.create', 'staff.update', 'staff.delete', 'staff.manage_roles',
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'rooms.view', 'rooms.create', 'rooms.update', 'rooms.delete', 'rooms.checkout',
    'reservations.view', 'reservations.create', 'reservations.update', 'reservations.delete',
    'analytics.view', 'analytics.export',
    'financial.view', 'financial.create', 'financial.update', 'financial.delete', 'financial.reports',
    'settings.view', 'settings.update', 'settings.manage_users', 'users.manage',
    'kitchen.view', 'kitchen.update',
    'tables.view', 'tables.create', 'tables.update', 'tables.delete',
    'housekeeping.view', 'housekeeping.create', 'housekeeping.update', 'housekeeping.delete',
    'audit.view', 'audit.export',
    'backup.create', 'backup.restore', 'backup.view',
    'gdpr.view', 'gdpr.export', 'gdpr.delete'
  ],
  admin: [
    // Full access to everything (same as owner)
    'dashboard.view', 'dashboard.analytics',
    'orders.view', 'orders.create', 'orders.update', 'orders.delete', 'pos.access',
    'menu.view', 'menu.create', 'menu.update', 'menu.delete',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
    'staff.view', 'staff.create', 'staff.update', 'staff.delete', 'staff.manage_roles',
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'rooms.view', 'rooms.create', 'rooms.update', 'rooms.delete', 'rooms.checkout',
    'reservations.view', 'reservations.create', 'reservations.update', 'reservations.delete',
    'analytics.view', 'analytics.export',
    'financial.view', 'financial.create', 'financial.update', 'financial.delete', 'financial.reports',
    'settings.view', 'settings.update', 'settings.manage_users', 'users.manage',
    'kitchen.view', 'kitchen.update',
    'tables.view', 'tables.create', 'tables.update', 'tables.delete',
    'housekeeping.view', 'housekeeping.create', 'housekeeping.update', 'housekeeping.delete',
    'audit.view', 'audit.export',
    'backup.create', 'backup.restore', 'backup.view',
    'gdpr.view', 'gdpr.export', 'gdpr.delete'
  ],
  manager: [
    // All access except analytics and financial reports
    'dashboard.view',
    'orders.view', 'orders.create', 'orders.update', 'orders.delete', 'pos.access',
    'menu.view', 'menu.create', 'menu.update', 'menu.delete',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
    'staff.view', 'staff.create', 'staff.update', 'staff.delete',
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'rooms.view', 'rooms.create', 'rooms.update', 'rooms.delete', 'rooms.checkout',
    'reservations.view', 'reservations.create', 'reservations.update', 'reservations.delete',
    'settings.view', 'settings.update',
    'kitchen.view', 'kitchen.update',
    'tables.view', 'tables.create', 'tables.update', 'tables.delete',
    'housekeeping.view', 'housekeeping.create', 'housekeeping.update', 'housekeeping.delete',
    'audit.view',
    'gdpr.view'
  ],
  chef: [
    // Access to orders, kitchen, inventory, menu management
    'dashboard.view',
    'orders.view', 'orders.create', 'orders.update', 'pos.access',
    'menu.view', 'menu.create', 'menu.update', 'menu.delete',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
    'kitchen.view', 'kitchen.update'
  ],
  waiter: [
    // Access to operations and guest services
    'dashboard.view',
    'orders.view', 'orders.create', 'orders.update', 'pos.access',
    'kitchen.view',
    'menu.view',
    'tables.view', 'tables.update',
    'inventory.view',
    'rooms.view', 'rooms.checkout',
    'reservations.view', 'reservations.create', 'reservations.update',
    'housekeeping.view'
  ],
  staff: [
    // Same as waiter - access to operations and guest services
    'dashboard.view',
    'orders.view', 'orders.create', 'orders.update', 'pos.access',
    'kitchen.view',
    'menu.view',
    'tables.view', 'tables.update',
    'inventory.view',
    'rooms.view', 'rooms.checkout',
    'reservations.view', 'reservations.create', 'reservations.update',
    'housekeeping.view'
  ],
  viewer: [
    'dashboard.view',
    'orders.view',
    'menu.view',
    'inventory.view',
    'customers.view',
    'rooms.view',
    'reservations.view'
  ]
};

export interface UserProfile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  restaurant_id?: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  isRole: (role: UserRole) => boolean;
  signOut: () => Promise<void>;
}
