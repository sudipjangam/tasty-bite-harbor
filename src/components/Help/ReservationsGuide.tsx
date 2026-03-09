import React from "react";
import { Calendar, Clock, MessageSquare, Users } from "lucide-react";
import HelpGuideShell, {
  FeatureCard,
  InfoCallout,
  OverviewCard,
  GuideTab,
} from "./HelpGuideShell";

const ReservationsGuide = () => {
  const features = [
    {
      title: "Taking Bookings",
      icon: <Calendar className="w-5 h-5" />,
      description:
        "Manage upcoming guest reservations and reserve specific tables.",
      steps: [
        "Click 'New Reservation' to add a booking",
        "Select the date, time, and party size",
        "Assign the reservation to a specific table in the floor plan",
      ],
    },
    {
      title: "Waitlist Management",
      icon: <Users className="w-5 h-5" />,
      description: "Keep track of walk-in guests waiting for a table.",
      steps: [
        "Add walk-ins to the digital waitlist",
        "Record their name, party size, and phone number",
        "Track quoted wait times vs. actual wait times",
      ],
    },
    {
      title: "Guest Communications",
      icon: <MessageSquare className="w-5 h-5" />,
      description: "Keep guests informed about their table status.",
      steps: [
        "Send automatic SMS confirmations when a booking is made",
        "Send an alert when their table is ready",
        "Log any special requests (e.g., Anniversary, Allergies)",
      ],
    },
  ];

  const tabs: GuideTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <OverviewCard
          title="Controlling the Front of House"
          description="The Reservations module helps your hosts balance scheduled bookings with walk-in traffic, ensuring tables are seated efficiently without overcrowding the kitchen."
        >
          <InfoCallout
            icon={<Clock className="w-4 h-4" />}
            title="Avoiding No-Shows"
            gradient="pink"
          >
            Always record the guest's phone number! The system can use this to
            send automated reminders 24 hours before their reservation,
            drastically reducing no-show rates.
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
            <FeatureCard key={index} feature={feature} gradient="pink" />
          ))}
        </div>
      ),
    },
  ];

  return (
    <HelpGuideShell
      icon={<Calendar className="w-6 h-6" />}
      title="Reservations & Waitlist Guide"
      subtitle="Manage bookings and walk-ins"
      gradient="pink"
      tabs={tabs}
    />
  );
};

export default ReservationsGuide;
