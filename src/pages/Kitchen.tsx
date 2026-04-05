
import React from "react";
import KitchenDisplay from "@/components/Kitchen/KitchenDisplay";
import { FeatureLock } from "@/components/Auth/FeatureLock";

const Kitchen = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <FeatureLock feature="kitchen.kds" interceptClicks={true}>
        <KitchenDisplay />
      </FeatureLock>
    </div>
  );
};

export default Kitchen;
