
import { Route, Routes } from "react-router-dom";
import { ComponentAccessGuard, LoginRegisterAccessGuard } from "./RouteGuards";
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
import Sidebar from "../Layout/Sidebar";
import NotFound from "@/pages/NotFound";
import { SidebarProvider } from "@/components/ui/sidebar";

/**
 * All application routes defined for better organization
 */
export const AppRoutes = (
  <Routes>
    <Route path="/auth" element={
      <LoginRegisterAccessGuard>
        <Auth />
      </LoginRegisterAccessGuard>
    } />
    
    {/* Authenticated routes with sidebar layout */}
    <Route path="/" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <Index />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/orders" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <Orders />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/rooms" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <Rooms />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/staff" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <Staff />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/menu" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <Menu />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/tables" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <Tables />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/reservations" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <Reservations />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/customers" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <Customers />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/crm" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <CRM />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/analytics" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <Analytics />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/settings" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <Settings />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/kitchen" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <KitchenDisplay />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/ai" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <AI />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/business-dashboard" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <BusinessDashboard />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/inventory" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <Inventory />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    <Route path="/suppliers" element={
      <ComponentAccessGuard>
        <div className="flex h-screen w-full">
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto pl-[3rem] md:pl-[18rem] transition-all duration-300">
              <Suppliers />
            </main>
          </SidebarProvider>
        </div>
      </ComponentAccessGuard>
    } />
    
    {/* 404 Not Found route */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);
