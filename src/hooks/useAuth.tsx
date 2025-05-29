
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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Fetch user profile with role information
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser({
              id: profile.id,
              email: session.user.email,
              first_name: profile.first_name,
              last_name: profile.last_name,
              role: profile.role as UserRole,
              restaurant_id: profile.restaurant_id,
              avatar_url: profile.avatar_url,
              phone: profile.phone,
              is_active: profile.is_active ?? true,
              created_at: profile.created_at,
              updated_at: profile.updated_at
            });
          } else {
            // Create default profile if doesn't exist
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                role: 'staff',
                is_active: true
              })
              .select()
              .single();

            if (newProfile) {
              setUser({
                id: newProfile.id,
                email: session.user.email,
                role: 'staff',
                is_active: true,
                created_at: newProfile.created_at,
                updated_at: newProfile.updated_at
              });
            }
          }
        } else {
          setUser(null);
        }
        setLoading(false);
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

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.some(permission => hasPermission(permission));
  };

  const isRole = (role: UserRole): boolean => {
    return user?.role === role;
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
