
import { Route, Routes, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import ComponentAccessGuard from "./ComponentAccessGuard";
import Sidebar from "../Layout/Sidebar";
import Watermark from "../Layout/Watermark";

import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Menu from "@/pages/Menu";
import Orders from "@/pages/Orders";
import Tables from "@/pages/Tables";
import Staff from "@/pages/Staff";
import Inventory from "@/pages/Inventory";
import Rooms from "@/pages/Rooms";
import Suppliers from "@/pages/Suppliers";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import BusinessDashboard from "@/components/Analytics/BusinessDashboard";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="flex min-h-screen w-full bg-gradient-pattern">
              <Sidebar />
              <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
                <div className="max-w-7xl mx-auto">
                  <Routes>
                    <Route path="/" element={
                      <ComponentAccessGuard requiredComponent="dashboard">
                        <Index />
                      </ComponentAccessGuard>
                    } />
                    <Route path="/menu" element={
                      <ComponentAccessGuard requiredComponent="menu">
                        <Menu />
                      </ComponentAccessGuard>
                    } />
                    <Route path="/orders" element={
                      <ComponentAccessGuard requiredComponent="orders">
                        <Orders />
                      </ComponentAccessGuard>
                    } />
                    <Route path="/tables" element={
                      <ComponentAccessGuard requiredComponent="tables">
                        <Tables />
                      </ComponentAccessGuard>
                    } />
                    <Route path="/staff" element={
                      <ComponentAccessGuard requiredComponent="staff">
                        <Staff />
                      </ComponentAccessGuard>
                    } />
                    <Route path="/inventory" element={
                      <ComponentAccessGuard requiredComponent="inventory">
                        <Inventory />
                      </ComponentAccessGuard>
                    } />
                    <Route path="/rooms" element={
                      <ComponentAccessGuard requiredComponent="rooms">
                        <Rooms />
                      </ComponentAccessGuard>
                    } />
                    <Route path="/suppliers" element={
                      <ComponentAccessGuard requiredComponent="suppliers">
                        <Suppliers />
                      </ComponentAccessGuard>
                    } />
                    <Route path="/analytics" element={
                      <ComponentAccessGuard requiredComponent="analytics">
                        <Analytics />
                      </ComponentAccessGuard>
                    } />
                    <Route path="/business-dashboard" element={
                      <ComponentAccessGuard requiredComponent="business_dashboard">
                        <BusinessDashboard />
                      </ComponentAccessGuard>
                    } />
                    <Route path="/settings" element={
                      <ComponentAccessGuard requiredComponent="settings">
                        <Settings />
                      </ComponentAccessGuard>
                    } />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
              </main>
              <Watermark />
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
