import React, { useState, Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ImprovedSidebarNavigation } from "@/components/Layout/ImprovedSidebarNavigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu as MenuIcon } from "lucide-react";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/ui/page-loader";
import { PermissionGuard } from "./PermissionGuard";

// ============================================================================
// LAZY LOADED PAGES - Each page is now a separate chunk
// This dramatically reduces initial bundle size
// ============================================================================

// Dashboard & Landing
const Index = lazy(() => import("@/pages/Index"));
const StaffLandingPage = lazy(
  () => import("@/components/Dashboard/StaffLandingPage"),
);

// Operations
const Orders = lazy(() => import("@/pages/Orders"));
const POS = lazy(() => import("@/pages/POS"));
const QSRPos = lazy(() => import("@/pages/QSRPos"));
const QuickServePOS = lazy(() => import("@/pages/QuickServePOS"));
const Kitchen = lazy(() => import("@/pages/Kitchen"));

// Menu & Recipes
const Menu = lazy(() => import("@/pages/Menu"));
const RecipeManagement = lazy(() => import("@/pages/RecipeManagement"));

// Staff & Management
const Staff = lazy(() => import("@/pages/Staff"));
const ShiftManagement = lazy(() => import("@/pages/ShiftManagement"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const RoleManagement = lazy(() => import("@/pages/RoleManagement"));
const PermissionManagement = lazy(() => import("@/pages/PermissionManagement"));

// Tables & Rooms
const Tables = lazy(() => import("@/pages/Tables"));
const Rooms = lazy(() => import("@/pages/Rooms"));
const Housekeeping = lazy(() => import("@/pages/Housekeeping"));
const Reservations = lazy(() => import("@/pages/Reservations"));

// Inventory & Suppliers
const Inventory = lazy(() => import("@/pages/Inventory"));
const Suppliers = lazy(() => import("@/pages/Suppliers"));

// Financial
const Analytics = lazy(() => import("@/pages/Analytics"));
const Financial = lazy(() => import("@/pages/Financial"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Reports = lazy(() => import("@/pages/Reports"));
const NCOrders = lazy(() => import("@/pages/NCOrders"));

// Customers & Marketing
const Customers = lazy(() => import("@/pages/Customers"));
const CRM = lazy(() => import("@/pages/CRM"));
const Marketing = lazy(() => import("@/pages/Marketing"));

// Other Features
const AI = lazy(() => import("@/pages/AI"));
const ChannelManagement = lazy(() => import("@/pages/ChannelManagement"));
const Security = lazy(() => import("@/pages/Security"));
const Settings = lazy(() => import("@/pages/Settings"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));

// Dev/Test Tools
const EmailTester = lazy(() => import("@/components/Email/EmailTester"));

// Platform Admin
const PlatformLayout = lazy(() => import("@/pages/Platform/PlatformLayout"));
const PlatformDashboard = lazy(
  () => import("@/pages/Platform/PlatformDashboard"),
);
const RestaurantManagement = lazy(
  () => import("@/pages/Platform/RestaurantManagement"),
);
const SubscriptionManager = lazy(
  () => import("@/pages/Platform/SubscriptionManager"),
);
const AllUsers = lazy(() => import("@/pages/Platform/AllUsers"));
const PlatformAnalytics = lazy(
  () => import("@/pages/Platform/PlatformAnalytics"),
);
const DailySummaryHistory = lazy(() => import("@/pages/DailySummaryHistory"));

// ============================================================================

// Role-based guard for admin-only routes
const AdminRoleGuard = ({ children }: { children: React.ReactNode }) => {
  const { isRole } = useAuth();

  if (!isRole("admin")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

/**
 * Suspense wrapper component for lazy-loaded routes
 */
const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

/**
 * Main application routes for authenticated users
 * All page components are now lazy-loaded for optimal performance
 */
export const AppRoutes = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Sidebar - Hidden on mobile */}
      <div
        className={cn(
          "bg-sidebar-purple transition-all duration-300 ease-in-out relative hidden md:block",
          isSidebarCollapsed ? "w-16" : "w-64",
        )}
      >
        {isSidebarCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(false)}
            className="absolute top-4 left-4 text-white hover:bg-white/10 w-8 h-8"
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
        )}
        <ImprovedSidebarNavigation
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
        />
      </div>

      {/* Main Content - Add padding bottom for mobile navigation */}
      <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <Routes>
          <Route
            path="/"
            element={
              <PermissionGuard
                permission="dashboard.view"
                fallback={
                  <LazyRoute>
                    <StaffLandingPage />
                  </LazyRoute>
                }
              >
                <LazyRoute>
                  <Index />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/orders"
            element={
              <PermissionGuard permission="orders.view">
                <LazyRoute>
                  <Orders />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/pos"
            element={
              <PermissionGuard permission="orders.view">
                <LazyRoute>
                  <POS />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/qsr-pos"
            element={
              <PermissionGuard permission="orders.view">
                <LazyRoute>
                  <QSRPos />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/quickserve-pos"
            element={
              <PermissionGuard permission="orders.view">
                <LazyRoute>
                  <QuickServePOS />
                </LazyRoute>
              </PermissionGuard>
            }
          />

          <Route
            path="/menu"
            element={
              <PermissionGuard permission="menu.view">
                <LazyRoute>
                  <Menu />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/recipes"
            element={
              <PermissionGuard permission="menu.view">
                <LazyRoute>
                  <RecipeManagement />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/staff"
            element={
              <PermissionGuard permission="staff.view">
                <LazyRoute>
                  <Staff />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/shift-management"
            element={
              <PermissionGuard permission="staff.update">
                <LazyRoute>
                  <ShiftManagement />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/analytics"
            element={
              <PermissionGuard permission="analytics.view">
                <LazyRoute>
                  <Analytics />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/financial"
            element={
              <PermissionGuard permission="financial.view">
                <LazyRoute>
                  <Financial />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <PermissionGuard permission="settings.view">
                <LazyRoute>
                  <Settings />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/inventory"
            element={
              <PermissionGuard permission="inventory.view">
                <LazyRoute>
                  <Inventory />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/tables"
            element={
              <PermissionGuard permission="tables.view">
                <LazyRoute>
                  <Tables />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/rooms"
            element={
              <PermissionGuard permission="rooms.view">
                <LazyRoute>
                  <Rooms />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/housekeeping"
            element={
              <PermissionGuard permission="housekeeping.view">
                <LazyRoute>
                  <Housekeeping />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/reservations"
            element={
              <PermissionGuard permission="reservations.view">
                <LazyRoute>
                  <Reservations />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/customers"
            element={
              <PermissionGuard permission="customers.view">
                <LazyRoute>
                  <Customers />
                </LazyRoute>
              </PermissionGuard>
            }
          />

          <Route
            path="/suppliers"
            element={
              <PermissionGuard permission="inventory.view">
                <LazyRoute>
                  <Suppliers />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/expenses"
            element={
              <PermissionGuard permission="financial.view">
                <LazyRoute>
                  <Expenses />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/ai"
            element={
              <PermissionGuard permission="dashboard.view">
                <LazyRoute>
                  <AI />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/channel-management"
            element={
              <PermissionGuard permission="analytics.view">
                <LazyRoute>
                  <ChannelManagement />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/kitchen"
            element={
              <PermissionGuard permission="kitchen.view">
                <LazyRoute>
                  <Kitchen />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/security"
            element={
              <PermissionGuard permission="audit.view">
                <LazyRoute>
                  <Security />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/user-management"
            element={
              <PermissionGuard permission="users.manage">
                <LazyRoute>
                  <UserManagement />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/admin"
            element={
              <PermissionGuard permission="users.manage">
                <LazyRoute>
                  <AdminPanel />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/role-management"
            element={
              <PermissionGuard permission="users.manage">
                <LazyRoute>
                  <RoleManagement />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/permission-management"
            element={
              <PermissionGuard permission="staff.manage_roles">
                <LazyRoute>
                  <PermissionManagement />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/marketing"
            element={
              <PermissionGuard permission="customers.view">
                <LazyRoute>
                  <Marketing />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/reports"
            element={
              <PermissionGuard permission="analytics.view">
                <LazyRoute>
                  <Reports />
                </LazyRoute>
              </PermissionGuard>
            }
          />
          <Route
            path="/nc-orders"
            element={
              <LazyRoute>
                <NCOrders />
              </LazyRoute>
            }
          />

          {/* Dev Tools - Admin only */}
          <Route
            path="/email-tester"
            element={
              <AdminRoleGuard>
                <LazyRoute>
                  <div className="p-6">
                    <EmailTester />
                  </div>
                </LazyRoute>
              </AdminRoleGuard>
            }
          />

          <Route
            path="/platform"
            element={
              <AdminRoleGuard>
                <LazyRoute>
                  <PlatformLayout />
                </LazyRoute>
              </AdminRoleGuard>
            }
          >
            <Route
              index
              element={
                <LazyRoute>
                  <PlatformDashboard />
                </LazyRoute>
              }
            />
            <Route
              path="restaurants"
              element={
                <LazyRoute>
                  <RestaurantManagement />
                </LazyRoute>
              }
            />
            <Route
              path="subscriptions"
              element={
                <LazyRoute>
                  <SubscriptionManager />
                </LazyRoute>
              }
            />
            <Route
              path="users"
              element={
                <LazyRoute>
                  <AllUsers />
                </LazyRoute>
              }
            />
            <Route
              path="analytics"
              element={
                <LazyRoute>
                  <PlatformAnalytics />
                </LazyRoute>
              }
            />
          </Route>

          {/* Daily Summary History */}
          <Route
            path="/daily-summary-history"
            element={
              <Suspense fallback={<PageLoader />}>
                <DailySummaryHistory />
              </Suspense>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global Mobile Navigation */}
        <MobileNavigation className="md:hidden" />
      </div>
    </div>
  );
};
