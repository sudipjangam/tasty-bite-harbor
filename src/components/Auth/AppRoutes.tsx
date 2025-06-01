import { Route, Routes } from "react-router-dom";
import { ComponentAccessGuard, LoginRegisterAccessGuard, PermissionRouteGuard } from "./RouteGuards";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Orders from "@/pages/Orders";
import Rooms from "@/pages/Rooms";
import Staff from "@/pages/Staff";
import Menu from "@/pages/Menu";
import Tables from "@/pages/Tables";
import Reservations from "@/pages/Reservations";
import Customers from "@/pages/Customers";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import KitchenDisplay from "../Kitchen/KitchenDisplay";
import AI from "@/pages/AI";
import BusinessDashboard from "@/components/Analytics/BusinessDashboard";
import Inventory from "@/pages/Inventory";
import Suppliers from "@/pages/Suppliers";
import CRM from "@/pages/CRM";
import Expenses from "@/pages/Expenses";
import Sidebar from "../Layout/Sidebar";
import NotFound from "@/pages/NotFound";
import { SidebarProvider } from "@/components/ui/sidebar";

/**
 * All application routes defined with proper permission guards
 */
export const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={
      <LoginRegisterAccessGuard>
        <Auth />
      </LoginRegisterAccessGuard>
    } />
    
    {/* Authenticated routes with sidebar layout */}
    <Route path="/" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="dashboard.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Index />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/orders" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="orders.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Orders />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/rooms" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="rooms.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Rooms />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/staff" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="staff.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Staff />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/menu" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="menu.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Menu />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/tables" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="orders.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Tables />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/reservations" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="reservations.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Reservations />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/customers" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="customers.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Customers />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/crm" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="customers.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <CRM />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/analytics" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="analytics.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Analytics />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/settings" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="settings.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Settings />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/kitchen" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="orders.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <KitchenDisplay />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/ai" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="ai.access">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <AI />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/business-dashboard" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="dashboard.analytics">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <BusinessDashboard />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/inventory" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="inventory.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Inventory />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/suppliers" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="inventory.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Suppliers />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    <Route path="/expenses" element={
      <ComponentAccessGuard>
        <PermissionRouteGuard permission="analytics.view">
          <div className="flex h-screen w-full">
            <SidebarProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
                <Expenses />
              </main>
            </SidebarProvider>
          </div>
        </PermissionRouteGuard>
      </ComponentAccessGuard>
    } />
    
    {/* 404 Not Found route */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);
