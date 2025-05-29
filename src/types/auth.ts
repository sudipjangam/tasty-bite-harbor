
/**
 * Enhanced authentication and role-based access types
 */

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'staff' | 'viewer';

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
  
  // Settings permissions
  | 'settings.view'
  | 'settings.update'
  | 'settings.manage_users'
  
  // AI permissions
  | 'ai.access'
  | 'ai.admin';

export interface RolePermissions {
  [key: string]: Permission[];
}

export const rolePermissions: RolePermissions = {
  super_admin: [
    'dashboard.view', 'dashboard.analytics',
    'orders.view', 'orders.create', 'orders.update', 'orders.delete', 'pos.access',
    'menu.view', 'menu.create', 'menu.update', 'menu.delete',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
    'staff.view', 'staff.create', 'staff.update', 'staff.delete', 'staff.manage_roles',
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'rooms.view', 'rooms.create', 'rooms.update', 'rooms.delete', 'rooms.checkout',
    'reservations.view', 'reservations.create', 'reservations.update', 'reservations.delete',
    'analytics.view', 'analytics.export',
    'settings.view', 'settings.update', 'settings.manage_users',
    'ai.access', 'ai.admin'
  ],
  admin: [
    'dashboard.view', 'dashboard.analytics',
    'orders.view', 'orders.create', 'orders.update', 'orders.delete', 'pos.access',
    'menu.view', 'menu.create', 'menu.update', 'menu.delete',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
    'staff.view', 'staff.create', 'staff.update', 'staff.delete',
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'rooms.view', 'rooms.create', 'rooms.update', 'rooms.delete', 'rooms.checkout',
    'reservations.view', 'reservations.create', 'reservations.update', 'reservations.delete',
    'analytics.view', 'analytics.export',
    'settings.view', 'settings.update',
    'ai.access'
  ],
  manager: [
    'dashboard.view', 'dashboard.analytics',
    'orders.view', 'orders.create', 'orders.update', 'pos.access',
    'menu.view', 'menu.update',
    'inventory.view', 'inventory.update',
    'staff.view', 'staff.update',
    'customers.view', 'customers.create', 'customers.update',
    'rooms.view', 'rooms.update', 'rooms.checkout',
    'reservations.view', 'reservations.create', 'reservations.update',
    'analytics.view',
    'ai.access'
  ],
  staff: [
    'dashboard.view',
    'orders.view', 'orders.create', 'orders.update', 'pos.access',
    'menu.view',
    'inventory.view',
    'customers.view', 'customers.create',
    'rooms.view', 'rooms.checkout',
    'reservations.view', 'reservations.create'
  ],
  viewer: [
    'dashboard.view',
    'orders.view',
    'menu.view',
    'inventory.view',
    'customers.view',
    'rooms.view',
    'reservations.view',
    'analytics.view'
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
