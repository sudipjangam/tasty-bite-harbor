import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook that invalidates and refetches specified queries when navigating to certain routes.
 * Useful for ensuring dashboard data is always fresh when user navigates back.
 */
export const useRefetchOnNavigation = (
  queryKeys: string[],
  targetPaths: string[] = ['/', '/dashboard']
) => {
  const location = useLocation();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // When route changes to one of the target paths, invalidate these queries
    if (targetPaths.includes(location.pathname)) {
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    }
  }, [location.pathname, queryClient, queryKeys, targetPaths]);
};

export default useRefetchOnNavigation;
