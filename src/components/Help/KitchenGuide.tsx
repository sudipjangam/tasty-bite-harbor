import React from "react";
import {
  ChefHat,
  Monitor,
  AlertTriangle,
  Timer,
  Clock,
  Users,
  TrendingUp,
} from "lucide-react";
import HelpGuideShell, {
  FeatureCard,
  InfoCallout,
  OverviewCard,
  GuideTab,
} from "./HelpGuideShell";

const KitchenGuide = () => {
  const features = [
    {
      title: "Kitchen Display System",
      icon: <Monitor className="w-5 h-5" />,
      description: "Real-time order display for kitchen staff",
      steps: [
        "Orders appear automatically from POS",
        "View order details and special instructions",
        "Track preparation times",
        "Update order status as you cook",
        "Mark orders as ready when complete",
      ],
    },
    {
      title: "Order Prioritization",
      icon: <AlertTriangle className="w-5 h-5" />,
      description: "Smart order sequencing for efficiency",
      steps: [
        "Orders sorted by preparation time",
        "Rush orders highlighted in red",
        "Delivery time estimates shown",
        "Priority indicators for VIP customers",
        "Automatic reordering based on urgency",
      ],
    },
    {
      title: "Time Management",
      icon: <Timer className="w-5 h-5" />,
      description: "Track cooking times and efficiency",
      steps: [
        "Automatic timer starts when order begins",
        "Target completion times displayed",
        "Average preparation time tracking",
        "Delay alerts for late orders",
        "Performance analytics for improvement",
      ],
    },
  ];

  const orderColumns = [
    {
      title: "New Orders",
      color: "from-blue-400 to-indigo-500",
      description: "Incoming orders waiting to start",
    },
    {
      title: "In Progress",
      color: "from-yellow-400 to-amber-500",
      description: "Currently being prepared",
    },
    {
      title: "Ready",
      color: "from-emerald-400 to-green-500",
      description: "Completed and ready to serve",
    },
    {
      title: "Delayed",
      color: "from-red-400 to-rose-500",
      description: "Orders taking longer than expected",
    },
  ];

  const tabs: GuideTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <OverviewCard
          title="Kitchen Display System"
          description="The KDS streamlines your kitchen operations by showing real-time orders, tracking preparation times, and coordinating between front-of-house and kitchen staff."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCallout
              icon={<Monitor className="w-4 h-4" />}
              title="Key Benefits"
              gradient="violet"
            >
              Paperless order management, real-time tracking, improved kitchen
              efficiency, and better staff communication.
            </InfoCallout>
            <InfoCallout
              icon={<AlertTriangle className="w-4 h-4" />}
              title="Display Features"
              gradient="violet"
            >
              Color-coded order status, preparation time tracking, special
              instruction highlights, and rush order indicators.
            </InfoCallout>
          </div>
        </OverviewCard>
      ),
    },
    {
      value: "features",
      label: "Features",
      content: (
        <div className="space-y-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} gradient="violet" />
          ))}
        </div>
      ),
    },
    {
      value: "workflow",
      label: "Workflow",
      content: (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-lg p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Kitchen Workflow Columns
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orderColumns.map((col, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50"
              >
                <div
                  className={`w-3 h-10 rounded-full bg-gradient-to-b ${col.color}`}
                />
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">
                    {col.title}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {col.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <InfoCallout
            icon={<TrendingUp className="w-4 h-4" />}
            title="Order Flow Process"
            gradient="violet"
          >
            Orders move from left to right across columns. Use the status
            buttons to update progress as you cook.
          </InfoCallout>
        </div>
      ),
    },
    {
      value: "tips",
      label: "Best Practices",
      content: (
        <div className="space-y-4">
          <InfoCallout
            icon={<Clock className="w-4 h-4" />}
            title="Time Management Tips"
            gradient="violet"
          >
            Start with orders that take longest to prepare. Batch similar items
            together for efficiency. Keep an eye on preparation time targets.
          </InfoCallout>
          <InfoCallout
            icon={<Users className="w-4 h-4" />}
            title="Team Coordination"
            gradient="indigo"
          >
            Assign orders to specific stations/chefs. Communicate special
            requirements clearly. Update status promptly for the service team.
          </InfoCallout>
          <InfoCallout
            icon={<TrendingUp className="w-4 h-4" />}
            title="Performance Optimization"
            gradient="blue"
          >
            Monitor average preparation times. Identify bottlenecks in the
            process. Track peak hours for better planning.
          </InfoCallout>
        </div>
      ),
    },
  ];

  return (
    <HelpGuideShell
      icon={<ChefHat className="w-6 h-6" />}
      title="Kitchen Display System Guide"
      subtitle="Real-time kitchen management"
      gradient="violet"
      tabs={tabs}
    />
  );
};

export default KitchenGuide;
