
import React from "react";
import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Orders from "@/pages/Orders";
import Menu from "@/pages/Menu";
import Analytics from "@/pages/Analytics";
import AI from "@/pages/AI";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import Tables from "@/pages/Tables";
import Rooms from "@/pages/Rooms";
import Reservations from "@/pages/Reservations";
import Marketing from "@/pages/Marketing";
import Customers from "@/pages/Customers";
import Staff from "@/pages/Staff";
import Inventory from "@/pages/Inventory";
import Expenses from "@/pages/Expenses";

const SimpleRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/tables" element={<Tables />} />
      <Route path="/reservations" element={<Reservations />} />
      <Route path="/rooms" element={<Rooms />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/marketing" element={<Marketing />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/expenses" element={<Expenses />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/ai" element={<AI />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default SimpleRoutes;
