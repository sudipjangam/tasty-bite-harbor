import React from "react";
import { Users, Clock, ShieldCheck, FileSpreadsheet } from "lucide-react";
import HelpGuideShell, {
  FeatureCard,
  InfoCallout,
  OverviewCard,
  GuideTab,
} from "./HelpGuideShell";

const StaffGuide = () => {
  const features = [
    {
      title: "Employee Profiles",
      icon: <Users className="w-5 h-5" />,
      description: "Manage contact information and job roles for your team.",
      steps: [
        "Click 'Add Employee' to create a new profile",
        "Assign them a Role (e.g., Cashier, Manager, Chef)",
        "Set their hourly wage or salary for payroll tracking",
      ],
    },
    {
      title: "Attendance & Shifts",
      icon: <Clock className="w-5 h-5" />,
      description: "Track when your staff clocks in and out.",
      steps: [
        "Use the dashboard widget or Staff tab to monitor active shifts",
        "Staff can punch in/out using their specific PIN code",
        "Review daily/weekly timesheets before running payroll",
      ],
    },
    {
      title: "Permissions Management",
      icon: <ShieldCheck className="w-5 h-5" />,
      description:
        "Control exactly what each employee can see and do in the system.",
      steps: [
        "Navigate to the Role Management or Permissions tab",
        "Managers can see financial reports; Cashiers cannot",
        "Restrict abilities like performing refunds or voiding items",
      ],
    },
  ];

  const tabs: GuideTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <OverviewCard
          title="Managing Your Team"
          description="The Staff Management module acts as your Human Resources hub. It handles everything from contact details to shift tracking and security access."
        >
          <InfoCallout
            icon={<FileSpreadsheet className="w-4 h-4" />}
            title="Shift Summaries"
            gradient="sky"
          >
            At the end of a shift, cashiers must "Close Register". This ties
            cash variations directly to the specific staff member logged in,
            ensuring accountability for the cash drawer.
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
            <FeatureCard key={index} feature={feature} gradient="sky" />
          ))}
        </div>
      ),
    },
  ];

  return (
    <HelpGuideShell
      icon={<Users className="w-6 h-6" />}
      title="Staff & Employee Guide"
      subtitle="HR and shift management"
      gradient="sky"
      tabs={tabs}
    />
  );
};

export default StaffGuide;
