import React from "react";
import { LayoutGrid, Map, Users, Clock } from "lucide-react";
import HelpGuideShell, {
  FeatureCard,
  InfoCallout,
  OverviewCard,
  GuideTab,
} from "./HelpGuideShell";

const TablesGuide = () => {
  const features = [
    {
      title: "Floor Plan Mapping",
      icon: <Map className="w-5 h-5" />,
      description: "Create a digital replica of your seating arrangement.",
      steps: [
        "Add new tables specifying shape and seating capacity",
        "Arrange tables in different zones (e.g., Indoor, Patio)",
        "Drag and drop to match your physical layout",
      ],
    },
    {
      title: "Real-time Status Tracking",
      icon: <Users className="w-5 h-5" />,
      description:
        "Know exactly which tables are free, occupied, or waiting for food.",
      steps: [
        "Green tables indicate they are vacant and ready to seat",
        "Blue/Yellow tables indicate occupied or waiting for order",
        "Click a table to immediately start a new POS order for those guests",
      ],
    },
    {
      title: "Turnover Management",
      icon: <Clock className="w-5 h-5" />,
      description: "Improve seating efficiency during busy hours.",
      steps: [
        "Track how long guests have been seated",
        "Quickly reassign or merge tables for large parties",
        "Mark tables as 'Cleaning' before making them vacant",
      ],
    },
  ];

  const tabs: GuideTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <OverviewCard
          title="Managing the Dining Floor"
          description="The Table Management module gives your hosts and waitstaff a live, interactive map of your dining area. It's essential for preventing double-seating and ensuring smooth service flow."
        >
          <InfoCallout
            icon={<LayoutGrid className="w-4 h-4" />}
            title="Why linking orders to tables helps"
            gradient="rose"
          >
            When you start an order by clicking on a table, the kitchen
            automatically knows exactly where the food should be delivered,
            improving guest satisfaction and runner efficiency.
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
            <FeatureCard key={index} feature={feature} gradient="rose" />
          ))}
        </div>
      ),
    },
  ];

  return (
    <HelpGuideShell
      icon={<LayoutGrid className="w-6 h-6" />}
      title="Table Management Guide"
      subtitle="Manage your dining floor"
      gradient="rose"
      tabs={tabs}
    />
  );
};

export default TablesGuide;
