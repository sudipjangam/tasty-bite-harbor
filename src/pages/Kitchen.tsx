
import React from "react";
import KitchenDisplay from "@/components/Kitchen/KitchenDisplay";
import { StandardizedPage } from "@/components/Layout/StandardizedPage";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Kitchen = () => {
  return (
    <StandardizedPage
      title="Kitchen Display"
      description="Manage and track orders in real-time"
      actions={<ThemeToggle />}
    >
      <KitchenDisplay />
    </StandardizedPage>
  );
};

export default Kitchen;
