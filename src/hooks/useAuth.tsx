
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Permission, UserProfile, UserRole, rolePermissions, AuthContextType } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userComponents, setUserComponents] = useState<string[]>([]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only synchronous state updates here
        setLoading(false);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(() => {
            fetchUserProfile(session.user.id, session.user.email);
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, email?: string) => {
    try {
      // Fetch user profile with role information and custom role details
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          *,
          roles:role_id (
            id,
            name,
            description
          )
        `)
        .eq('id', userId)
        .single();

      if (profile) {
        // Prioritize role_name_text, then custom role from roles table, then fallback to enum
        const userRole = profile.role_name_text || 
                        (profile.roles?.name) || 
                        profile.role;

        setUser({
          id: profile.id,
          email: email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: userRole as UserRole,
          role_id: profile.role_id,
          role_name_text: profile.role_name_text,
          restaurant_id: profile.restaurant_id,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
          is_active: profile.is_active ?? true,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        });

        // Fetch user's component access from database
        const { data: components } = await supabase.rpc('get_user_components', {
          user_id: userId,
        });
        
        const componentNames = components?.map((row: any) => row.component_name) || [];
        setUserComponents(componentNames);

      } else {
        // Create default profile if doesn't exist
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            role: 'staff',
            is_active: true
          })
          .select()
          .single();

        if (newProfile) {
          setUser({
            id: newProfile.id,
            email: email,
            role: 'staff',
            is_active: true,
            created_at: newProfile.created_at,
            updated_at: newProfile.updated_at
          });
          setUserComponents([]);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Map component names to permissions
  const componentToPermissions: Record<string, Permission[]> = {
    'Dashboard': ['dashboard.view', 'dashboard.analytics'],
    'Orders': ['orders.view', 'orders.create', 'orders.update', 'orders.delete'],
    'POS': ['pos.access'],
    'Menu': ['menu.view', 'menu.create', 'menu.update', 'menu.delete'],
    'Inventory': ['inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete'],
    'Staff': ['staff.view', 'staff.create', 'staff.update', 'staff.delete', 'staff.manage_roles'],
    'Customers': ['customers.view', 'customers.create', 'customers.update', 'customers.delete'],
    'Rooms': ['rooms.view', 'rooms.create', 'rooms.update', 'rooms.delete', 'rooms.checkout'],
    'Reservations': ['reservations.view', 'reservations.create', 'reservations.update', 'reservations.delete'],
    'Analytics': ['analytics.view', 'analytics.export'],
    'Financial': ['financial.view', 'financial.create', 'financial.update', 'financial.delete', 'financial.reports'],
    'Settings': ['settings.view', 'settings.update', 'settings.manage_users', 'users.manage'],
    'Kitchen': ['kitchen.view', 'kitchen.update'],
    'Tables': ['tables.view', 'tables.create', 'tables.update', 'tables.delete'],
    'Housekeeping': ['housekeeping.view', 'housekeeping.create', 'housekeeping.update', 'housekeeping.delete'],
    'Audit': ['audit.view', 'audit.export'],
    'Backup': ['backup.create', 'backup.restore', 'backup.view'],
    'GDPR': ['gdpr.view', 'gdpr.export', 'gdpr.delete'],
    'Marketing': ['customers.view', 'customers.create', 'customers.update'],
    'Expenses': ['financial.view', 'financial.create', 'financial.update', 'financial.delete'],
    'Reports': ['analytics.view', 'analytics.export', 'financial.reports'],
    'AI Assistant': ['dashboard.view'],
    'CRM': ['customers.view', 'customers.create', 'customers.update', 'customers.delete'],
    'Suppliers': ['inventory.view', 'inventory.create', 'inventory.update'],
    'Recipes': ['menu.view', 'menu.create', 'menu.update', 'inventory.view'],
    'Channel Management': ['rooms.view', 'rooms.update', 'reservations.view'],
    'Security': ['audit.view', 'backup.view', 'gdpr.view'],
    'User Management': ['settings.manage_users', 'users.manage'],
    'Role Management': ['settings.manage_users', 'staff.manage_roles'],
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    
    // Owner and Admin always have full access
    const roleKey = (user.role_name_text?.toLowerCase() || user.role?.toLowerCase());
    if (roleKey === 'owner' || roleKey === 'admin') {
      return true;
    }

    // Check if user has component access that grants this permission
    for (const component of userComponents) {
      const permissions = componentToPermissions[component] || [];
      if (permissions.includes(permission)) {
        return true;
      }
    }

    // Fallback to hardcoded rolePermissions for system roles without component access
    const userPermissions = rolePermissions[roleKey as UserRole] || [];
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.some(permission => hasPermission(permission));
  };

  const isRole = (role: UserRole | string): boolean => {
    // Check both role_name_text and the role enum
    const currentRole = user?.role_name_text || user?.role;
    return currentRole?.toLowerCase() === role.toLowerCase();
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    hasPermission,
    hasAnyPermission,
    isRole,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
