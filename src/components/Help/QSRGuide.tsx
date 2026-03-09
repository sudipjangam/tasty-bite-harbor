import React from "react";
import { Zap, MousePointerClick, CreditCard, Timer } from "lucide-react";
import HelpGuideShell, {
  FeatureCard,
  InfoCallout,
  OverviewCard,
  GuideTab,
} from "./HelpGuideShell";

const QSRGuide = () => {
  const features = [
    {
      title: "Rapid Ordering Interface",
      icon: <MousePointerClick className="w-5 h-5" />,
      description:
        "Designed specifically for speed during busy hours and rushes.",
      steps: [
        "Tap large grid buttons to instantly add items to the cart",
        "Skip complex customization steps automatically",
        "Easily increase or decrease quantities with a single tap",
      ],
    },
    {
      title: "Streamlined Payment Flow",
      icon: <CreditCard className="w-5 h-5" />,
      description: "Process payments in the fewest clicks possible.",
      steps: [
        "Click the prominent 'Pay / Checkout' button",
        "Quickly select Cash, Card, or UPI",
        "Complete the order and automatically start the next one",
      ],
    },
    {
      title: "Performance Optimized",
      icon: <Timer className="w-5 h-5" />,
      description: "Perfect for food trucks and kiosks handling high volume.",
      steps: [
        "Menu items load instantly without page refreshes",
        "Orders are sent directly to the Kitchen Display System (KDS)",
        "Designed for touch screens and tablet usage",
      ],
    },
  ];

  const tabs: GuideTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <OverviewCard
          title="Built for Speed"
          description="The Quick Serve POS is a specialized, streamlined variant of the standard order screen. It strips away complicated menus and is engineered purely for taking high-volume orders as quickly as possible."
        >
          <InfoCallout
            icon={<Timer className="w-4 h-4" />}
            title="When to use Quick Serve?"
            gradient="amber"
          >
            Use this screen during your busiest lunch rushes, outdoor events, or
            when selling pre-packaged items and drinks where speed matters more
            than complex meal customizations.
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
            <FeatureCard key={index} feature={feature} gradient="amber" />
          ))}
        </div>
      ),
    },
  ];

  return (
    <HelpGuideShell
      icon={<Zap className="w-6 h-6" />}
      title="Quick Serve POS Guide"
      subtitle="Speed-optimized ordering"
      gradient="amber"
      tabs={tabs}
    />
  );
};

export default QSRGuide;
