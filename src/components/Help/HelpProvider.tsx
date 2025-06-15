
import React from "react";
import { useLocation } from "react-router-dom";
import OrdersGuide from "./OrdersGuide";
import KitchenGuide from "./KitchenGuide";
import MenuGuide from "./MenuGuide";

interface HelpProviderProps {
  className?: string;
}

const HelpProvider = ({ className = "" }: HelpProviderProps) => {
  const location = useLocation();
  
  // Determine which help guide to show based on current route
  const getHelpGuide = () => {
    const path = location.pathname;
    
    if (path.includes('/orders')) {
      return <OrdersGuide />;
    } else if (path.includes('/kitchen')) {
      return <KitchenGuide />;
    } else if (path.includes('/menu')) {
      return <MenuGuide />;
    }
    
    // Default fallback - could be a general help guide
    return <OrdersGuide />;
  };

  return (
    <div className={className}>
      {getHelpGuide()}
    </div>
  );
};

export default HelpProvider;
