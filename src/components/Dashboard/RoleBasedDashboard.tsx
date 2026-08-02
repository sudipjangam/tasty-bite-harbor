/**
 * RoleBasedDashboard.tsx
 *
 * Single entry point for the "/" route on BOTH web and native.
 * Renders the correct dashboard based on whether the user
 * has the "dashboard.view" permission:
 *
 *   owner / admin / manager  →  has "dashboard.view"  →  Index (informational dashboard)
 *   chef / waiter / staff    →  no  "dashboard.view"  →  StaffLandingPage
 */

import React, { Suspense, lazy } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/ui/page-loader";

const Index = lazy(() => import("@/pages/Index"));
const StaffLandingPage = lazy(
  () => import("@/components/Dashboard/StaffLandingPage")
);

export const RoleBasedDashboard: React.FC = () => {
  const { hasPermission, loading } = useAuth();

  if (loading) return <PageLoader />;

  const canViewDashboard = hasPermission("dashboard.view");

  return (
    <Suspense fallback={<PageLoader />}>
      {canViewDashboard ? <Index /> : <StaffLandingPage />}
    </Suspense>
  );
};

export default RoleBasedDashboard;
