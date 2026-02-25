import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Permission,
  UserProfile,
  UserRole,
  AuthContextType,
} from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userComponents, setUserComponents] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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
    });

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
        .from("profiles")
        .select(
          `
          *,
          roles:role_id (
            id,
            name,
            description,
            is_system,
            has_full_access
          )
        `,
        )
        .eq("id", userId)
        .single();

      if (profile) {
        // Use role name from roles table
        const userRole =
          profile.roles?.name || profile.role_name_text || profile.role;

        setUser({
          id: profile.id,
          email: email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: userRole as UserRole,
          role_id: profile.role_id,
          role_name_text: profile.role_name_text,
          role_is_system: profile.roles?.is_system ?? false,
          role_has_full_access: profile.roles?.has_full_access ?? false,
          restaurant_id: profile.restaurant_id,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
          is_active: profile.is_active ?? true,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        });

        // Fetch user's component access from database
        const { data: components } = await supabase.rpc("get_user_components", {
          user_id: userId,
        });

        const componentNames =
          components?.map((row: any) => row.component_name) || [];
        setUserComponents(componentNames);

        // Fetch user's permissions from database (new dynamic system)
        try {
          const { data: permissions, error: permError } = await supabase.rpc(
            "get_user_permissions",
            {
              p_user_id: userId,
            },
          );

          if (!permError && permissions) {
            const permList = permissions.map((row: any) => row.permission);
            setUserPermissions(permList);
            setPermissionsLoaded(true);
          } else {
            // If RPC doesn't exist or fails, we'll use fallback
            console.warn(
              "Could not fetch permissions from DB, using fallback:",
              permError,
            );
            setPermissionsLoaded(false);
          }
        } catch (err) {
          console.warn("Permissions fetch failed, using fallback:", err);
          setPermissionsLoaded(false);
        }
      } else {
        // Create default profile if doesn't exist
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            role: "staff",
            is_active: true,
          })
          .select()
          .single();

        if (newProfile) {
          setUser({
            id: newProfile.id,
            email: email,
            role: "staff",
            is_active: true,
            created_at: newProfile.created_at,
            updated_at: newProfile.updated_at,
          });
          setUserComponents([]);
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;

    // Admin (has_full_access=true) always has full access to everything
    if (user.role_has_full_access) {
      return true;
    }

    // Primary: Use database-fetched permissions when available
    if (permissionsLoaded && userPermissions.length > 0) {
      return userPermissions.includes(permission);
    }

    // SECURITY: No client-side fallback. If DB permissions are not loaded,
    // deny access and log a warning. This prevents privilege escalation
    // via client-side state manipulation.
    if (!permissionsLoaded) {
      console.warn(
        `[Security] Permission check for "${permission}" denied — DB permissions not loaded yet.`,
      );
    }
    return false;
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.some((permission) => hasPermission(permission));
  };

  const isRole = (role: UserRole | string): boolean => {
    // Check both role_name_text and the role enum
    const currentRole = user?.role_name_text || user?.role;
    return currentRole?.toLowerCase() === role.toLowerCase();
  };

  const signOut = async (): Promise<void> => {
    // Sign out from Supabase
    await supabase.auth.signOut();

    // Clear all React Query cache to prevent stale data from previous session
    queryClient.clear();

    // Clear local state
    setUser(null);
    setUserComponents([]);
    setUserPermissions([]);
    setPermissionsLoaded(false);

    // Clear any localStorage session data (but keep theme preference)
    const theme = localStorage.getItem("restaurant-pro-theme");
    sessionStorage.clear();
    if (theme) localStorage.setItem("restaurant-pro-theme", theme);

    console.log("Signed out: cleared auth, cache, and session data");
  };

  const value: AuthContextType = {
    user,
    loading,
    hasPermission,
    hasAnyPermission,
    isRole,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
