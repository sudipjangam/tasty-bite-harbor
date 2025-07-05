
import { Routes, Route, Navigate } from "react-router-dom";
import SimpleSidebar from "@/components/Layout/SimpleSidebar";
import Dashboard from "@/pages/Dashboard";
import EnhancedDashboard from "@/pages/EnhancedDashboard";
import Orders from "@/pages/Orders";
import Menu from "@/pages/Menu";
import Staff from "@/pages/Staff";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import Security from "@/pages/Security";
import Financial from "@/pages/Financial";
import Inventory from "@/pages/Inventory";
import Tables from "@/pages/Tables";
import Rooms from "@/pages/Rooms";
import Housekeeping from "@/pages/Housekeeping";
import Reservations from "@/pages/Reservations";
import Customers from "@/pages/Customers";
import CRM from "@/pages/CRM";
import Suppliers from "@/pages/Suppliers";
import Expenses from "@/pages/Expenses";
import AI from "@/pages/AI";
import ChannelManagement from "@/pages/ChannelManagement";
import Kitchen from "@/pages/Kitchen";

/**
 * Main application routes for authenticated users with simplified layout
 */
export const SimpleAppRoutes = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <SimpleSidebar />
      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/enhanced-dashboard" element={<EnhancedDashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/security" element={<Security />} />
          <Route path="/financial" element={<Financial />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/housekeeping" element={<Housekeeping />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/channel-management" element={<ChannelManagement />} />
          <Route path="/kitchen" element={<Kitchen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};
