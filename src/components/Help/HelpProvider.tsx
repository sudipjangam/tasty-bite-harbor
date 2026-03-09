import React from "react";
import { useLocation } from "react-router-dom";
import OrdersGuide from "./OrdersGuide";
import KitchenGuide from "./KitchenGuide";
import MenuGuide from "./MenuGuide";
import DashboardGuide from "./DashboardGuide";
import QSRGuide from "./QSRGuide";
import RecipesGuide from "./RecipesGuide";
import TablesGuide from "./TablesGuide";
import InventoryGuide from "./InventoryGuide";
import ReservationsGuide from "./ReservationsGuide";
import StaffGuide from "./StaffGuide";
import CustomersGuide from "./CustomersGuide";

interface HelpProviderProps {
  className?: string;
}

const HelpProvider = ({ className = "" }: HelpProviderProps) => {
  const location = useLocation();

  // Determine which help guide to show based on current route
  const getHelpGuide = () => {
    const path = location.pathname.toLowerCase();

    if (path.includes("/dashboard")) return <DashboardGuide />;
    if (path.includes("/orders")) return <OrdersGuide />;
    if (
      path.includes("/pos") ||
      path.includes("/qsr") ||
      path.includes("/quick-serve")
    )
      return <QSRGuide />;
    if (path.includes("/kitchen")) return <KitchenGuide />;
    if (path.includes("/menu")) return <MenuGuide />;
    if (path.includes("/recipes")) return <RecipesGuide />;
    if (path.includes("/tables")) return <TablesGuide />;
    if (path.includes("/inventory")) return <InventoryGuide />;
    if (path.includes("/reservations")) return <ReservationsGuide />;
    if (path.includes("/staff")) return <StaffGuide />;
    if (path.includes("/customers")) return <CustomersGuide />;

    // Default fallback
    return <DashboardGuide />;
  };

  return <div className={className}>{getHelpGuide()}</div>;
};

export default HelpProvider;
