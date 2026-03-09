import React from "react";
import { HeartHandshake, Star, History, Gift } from "lucide-react";
import HelpGuideShell, {
  FeatureCard,
  InfoCallout,
  OverviewCard,
  GuideTab,
} from "./HelpGuideShell";

const CustomersGuide = () => {
  const features = [
    {
      title: "Building Customer Profiles",
      icon: <HeartHandshake className="w-5 h-5" />,
      description: "Save guest details to provide personalized service.",
      steps: [
        "Ask for a phone number when taking an order",
        "If it's a new number, quickly add their Name and Email",
        "The system will automatically link all future orders to this profile",
      ],
    },
    {
      title: "Order History Tracking",
      icon: <History className="w-5 h-5" />,
      description: "Know exactly what your regulars like to eat.",
      steps: [
        "Look up a customer on the POS or CRM tab",
        "View their total lifetime spend and visit count",
        "See their favorite items to quickly repeat past orders",
      ],
    },
    {
      title: "Loyalty & Marketing",
      icon: <Gift className="w-5 h-5" />,
      description: "Reward repeat business and run campaigns.",
      steps: [
        "Assign VIP tags or custom segments to top spenders",
        "Configure loyalty points that accrue automatically with every purchase",
        "Export customer lists to send promotional SMS or emails",
      ],
    },
  ];

  const tabs: GuideTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <OverviewCard
          title="Grow Your Regulars"
          description="The Customer Relationship Management (CRM) module is designed to help you turn first-time visitors into loyal regulars by tracking their preferences and rewarding their business."
        >
          <InfoCallout
            icon={<Star className="w-4 h-4" />}
            title="Pro Tip: Speedy Checkout"
            gradient="rose"
          >
            If you link a customer to an order, you can easily send them a
            digital receipt via SMS or Email instead of printing paper, saving
            you money and providing a modern experience!
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
      icon={<HeartHandshake className="w-6 h-6" />}
      title="CRM & Customer Guide"
      subtitle="Build lasting relationships"
      gradient="rose"
      tabs={tabs}
    />
  );
};

export default CustomersGuide;
