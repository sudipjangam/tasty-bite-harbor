import React from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Zap,
  Activity,
  ShoppingCart,
  Users,
} from "lucide-react";
import HelpGuideShell, {
  FeatureCard,
  InfoCallout,
  OverviewCard,
  GuideTab,
} from "./HelpGuideShell";

const DashboardGuide = () => {
  const features = [
    {
      title: "Today's Overview",
      icon: <TrendingUp className="w-5 h-5" />,
      description:
        "Get a quick snapshot of how your business is doing right now.",
      steps: [
        "View total sales generated today",
        "Monitor active and pending orders",
        "Check top-selling menu items instantly",
      ],
    },
    {
      title: "Quick Actions",
      icon: <Zap className="w-5 h-5" />,
      description: "Jump to important tasks directly from the home screen.",
      steps: [
        "Click 'New Order' to immediately start billing",
        "Click 'Kitchen' to view live preparations",
        "Click 'Inventory' to check low stock alerts",
      ],
    },
    {
      title: "Recent Activity",
      icon: <Activity className="w-5 h-5" />,
      description: "Stay updated with a running stream of the latest events.",
      steps: [
        "Track recently completed orders",
        "Monitor staff attendance punch-ins",
        "See real-time low inventory warnings",
      ],
    },
  ];

  const tabs: GuideTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <OverviewCard
          title="Welcome to Your Command Center"
          description="The Dashboard is the first screen you see when logging in. It gives you a bird's-eye view of your entire food truck or restaurant operation at a glance."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCallout
              icon={<ShoppingCart className="w-4 h-4" />}
              title="Daily Operations"
              gradient="indigo"
            >
              Quick access to POS, new orders, and live kitchen tracking to keep
              service moving fast.
            </InfoCallout>
            <InfoCallout
              icon={<Users className="w-4 h-4" />}
              title="Management"
              gradient="indigo"
            >
              Oversee staff attendance, check current revenue, and monitor
              critical alerts all in one place.
            </InfoCallout>
          </div>
        </OverviewCard>
      ),
    },
    {
      value: "features",
      label: "Key Features",
      content: (
        <div className="space-y-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} gradient="indigo" />
          ))}
        </div>
      ),
    },
  ];

  return (
    <HelpGuideShell
      icon={<LayoutDashboard className="w-6 h-6" />}
      title="Dashboard Overview Guide"
      subtitle="Your business at a glance"
      gradient="indigo"
      tabs={tabs}
    />
  );
};

export default DashboardGuide;
