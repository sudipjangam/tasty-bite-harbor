import React from "react";
import { Package, TrendingDown, AlertTriangle, ListChecks } from "lucide-react";
import HelpGuideShell, {
  FeatureCard,
  InfoCallout,
  OverviewCard,
  GuideTab,
} from "./HelpGuideShell";

const InventoryGuide = () => {
  const features = [
    {
      title: "Stock Tracking",
      icon: <Package className="w-5 h-5" />,
      description:
        "Monitor exactly how much of each ingredient or item you have on hand.",
      steps: [
        "Add items specifying their unit of measurement (kg, liters, pieces)",
        "Manually update stock quantities when receiving deliveries",
        "Conduct periodic physical stock counts to fix discrepancies",
      ],
    },
    {
      title: "Low Stock Alerts",
      icon: <AlertTriangle className="w-5 h-5" />,
      description: "Never run out of crucial ingredients mid-shift.",
      steps: [
        "Set a Minimum Stock threshold for every item",
        "When stock dips below this limit, it triggers a warning (highlighted in red)",
        "Use this list to generate purchase orders for suppliers",
      ],
    },
    {
      title: "Supplier Management",
      icon: <ListChecks className="w-5 h-5" />,
      description:
        "Keep track of where you source your ingredients to streamline reordering.",
      steps: [
        "Link inventory items to specific suppliers",
        "Track purchase prices to see if costs are increasing",
        "Maintain supplier contact details for quick reordering",
      ],
    },
  ];

  const tabs: GuideTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <OverviewCard
          title="Controlling Your Assets"
          description="Proper inventory management is the secret to a profitable food business. This module allows you to track raw ingredients, packaging, and beverages to prevent loss and avoid running out of stock."
        >
          <InfoCallout
            icon={<TrendingDown className="w-4 h-4" />}
            title="Understanding Auto-Depletion"
            gradient="teal"
          >
            If you have set up Recipes correctly in the Recipe module, your
            inventory will automatically decrease every time you sell an item on
            the POS. This real-time depletion gives you the most accurate stock
            outlook possible!
          </InfoCallout>
        </OverviewCard>
      ),
    },
    {
      value: "workflow",
      label: "How to Use",
      content: (
        <div className="space-y-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} gradient="teal" />
          ))}
        </div>
      ),
    },
  ];

  return (
    <HelpGuideShell
      icon={<Package className="w-6 h-6" />}
      title="Inventory & Stock Management Guide"
      subtitle="Track and control your stock"
      gradient="teal"
      tabs={tabs}
    />
  );
};

export default InventoryGuide;
