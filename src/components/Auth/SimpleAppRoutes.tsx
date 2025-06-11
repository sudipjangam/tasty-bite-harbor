
import React from "react";
import { Routes, Route } from "react-router-dom";
import SimpleSidebar from "@/components/Layout/SimpleSidebar";
import SimpleIndex from "@/pages/SimpleIndex";
import Menu from "@/pages/Menu";
import Orders from "@/pages/Orders";
import Staff from "@/pages/Staff";
import Customers from "@/pages/Customers";
import Inventory from "@/pages/Inventory";
import Tables from "@/pages/Tables";
import Reservations from "@/pages/Reservations";
import Rooms from "@/pages/Rooms";
import Analytics from "@/pages/Analytics";
import Financial from "@/pages/Financial";
import AI from "@/pages/AI";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import Housekeeping from "@/pages/Housekeeping";

export const SimpleAppRoutes = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <SimpleSidebar />
      <main className="flex-1 overflow-hidden lg:ml-64">
        <div className="h-full overflow-y-auto pt-16 lg:pt-0">
          <Routes>
            <Route path="/" element={<SimpleIndex />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/tables" element={<Tables />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/housekeeping" element={<Housekeeping />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/financial" element={<Financial />} />
            <Route path="/ai" element={<AI />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};
