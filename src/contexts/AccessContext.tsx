import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AccessContextType {
  accessibleComponents: string[];
  hasAccess: (componentName: string) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

interface AccessProviderProps {
  children: ReactNode;
}

export const AccessProvider: React.FC<AccessProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [accessibleComponents, setAccessibleComponents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccessibleComponents = async () => {
    if (!user?.id) {
      console.log('AccessProvider: No user ID found');
      setAccessibleComponents([]);
      setLoading(false);
      return;
    }

    try {
      console.log('AccessProvider: Loading accessible components for user:', user.id);
      
      // Call the database function to get user's accessible components
      const { data, error } = await supabase.rpc('get_user_components', {
        user_id: user.id,
      });

      if (error) {
        console.error('Error loading accessible components:', error);
        setAccessibleComponents([]);
        return;
      }

      // Extract component names from the result
      const componentNames = data?.map((row: any) => row.component_name) || [];
      console.log('AccessProvider: Loaded components:', componentNames);
      setAccessibleComponents(componentNames);
    } catch (error) {
      console.error('Error in loadAccessibleComponents:', error);
      setAccessibleComponents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccessibleComponents();
  }, [user?.id]);

  const hasAccess = (componentName: string): boolean => {
    if (!user) return false;
    if (loading) return false;
    
    const access = accessibleComponents.includes(componentName);
    console.log(`AccessProvider: Checking access for ${componentName}:`, access);
    return access;
  };

  const refresh = async () => {
    setLoading(true);
    await loadAccessibleComponents();
  };

  return (
    <AccessContext.Provider value={{ accessibleComponents, hasAccess, loading, refresh }}>
      {children}
    </AccessContext.Provider>
  );
};

export const useAccess = (): AccessContextType => {
  const context = useContext(AccessContext);
  if (context === undefined) {
    throw new Error('useAccess must be used within an AccessProvider');
  }
  return context;
};