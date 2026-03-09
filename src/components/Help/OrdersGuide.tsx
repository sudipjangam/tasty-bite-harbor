import React from "react";
import {
  ShoppingCart,
  Plus,
  CreditCard,
  Clock,
  Search,
  Users,
} from "lucide-react";
import HelpGuideShell, {
  FeatureCard,
  InfoCallout,
  OverviewCard,
  GuideTab,
} from "./HelpGuideShell";

const OrdersGuide = () => {
  const features = [
    {
      title: "Create New Orders",
      icon: <Plus className="w-5 h-5" />,
      description: "Add new orders for dine-in, takeaway, or delivery",
      steps: [
        "Click 'Add New Order' button",
        "Select table or customer type",
        "Choose menu items from categories",
        "Add quantities and special instructions",
        "Review order summary",
        "Submit order to kitchen",
      ],
    },
    {
      title: "Order Management",
      icon: <ShoppingCart className="w-5 h-5" />,
      description: "Track and manage order status",
      steps: [
        "View all active orders in real-time",
        "Update order status (Pending → Preparing → Ready → Served)",
        "Edit orders before kitchen confirmation",
        "Cancel orders if needed",
        "Process payments and billing",
      ],
    },
    {
      title: "Payment Processing",
      icon: <CreditCard className="w-5 h-5" />,
      description: "Handle various payment methods",
      steps: [
        "Select completed order",
        "Choose payment method (Cash/Card/UPI)",
        "Apply discounts if applicable",
        "Generate receipt",
        "Process payment confirmation",
      ],
    },
  ];

  const orderStatuses = [
    {
      status: "Pending",
      color: "from-yellow-400 to-amber-500",
      description: "Order received, waiting for kitchen",
    },
    {
      status: "Preparing",
      color: "from-blue-400 to-indigo-500",
      description: "Kitchen is preparing the order",
    },
    {
      status: "Ready",
      color: "from-emerald-400 to-green-500",
      description: "Order ready for pickup/serving",
    },
    {
      status: "Served",
      color: "from-gray-400 to-slate-500",
      description: "Order delivered to customer",
    },
    {
      status: "Cancelled",
      color: "from-red-400 to-rose-500",
      description: "Order cancelled",
    },
  ];

  const tabs: GuideTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <OverviewCard
          title="Orders Management System"
          description="The Orders Management system helps you efficiently handle customer orders from creation to completion. Track order status, manage payments, and coordinate with kitchen operations seamlessly."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCallout
              icon={<ShoppingCart className="w-4 h-4" />}
              title="Key Benefits"
              gradient="blue"
            >
              Real-time order tracking, streamlined kitchen workflow, multiple
              payment options, and customer satisfaction monitoring.
            </InfoCallout>
            <InfoCallout
              icon={<CreditCard className="w-4 h-4" />}
              title="Order Types"
              gradient="blue"
            >
              Supports Dine-in, Takeaway, and Delivery orders — each with
              customized workflows.
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
            <FeatureCard key={index} feature={feature} gradient="blue" />
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
            Order Status Workflow
          </h3>
          <div className="space-y-3">
            {orderStatuses.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50"
              >
                <div
                  className={`w-3 h-8 rounded-full bg-gradient-to-b ${s.color}`}
                />
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {s.status}
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <InfoCallout
            icon={<Clock className="w-4 h-4" />}
            title="Order Lifecycle"
            gradient="blue"
          >
            Orders flow through these statuses automatically as they progress
            through your restaurant operations. Staff can manually update status
            when needed.
          </InfoCallout>
        </div>
      ),
    },
    {
      value: "tips",
      label: "Tips",
      content: (
        <div className="space-y-4">
          <InfoCallout
            icon={<Search className="w-4 h-4" />}
            title="Search & Filter Tips"
            gradient="blue"
          >
            Use order number for quick lookup. Filter by status to focus on
            specific orders. Sort by time to prioritize urgent orders.
          </InfoCallout>
          <InfoCallout
            icon={<Clock className="w-4 h-4" />}
            title="Time Management"
            gradient="sky"
          >
            Monitor preparation times for efficiency. Set up notifications for
            delayed orders. Track peak hours for better staffing.
          </InfoCallout>
          <InfoCallout
            icon={<Users className="w-4 h-4" />}
            title="Customer Service"
            gradient="violet"
          >
            Keep customers informed about order status. Handle special dietary
            requirements carefully. Maintain order accuracy for satisfaction.
          </InfoCallout>
        </div>
      ),
    },
  ];

  return (
    <HelpGuideShell
      icon={<ShoppingCart className="w-6 h-6" />}
      title="Orders Management Guide"
      subtitle="From creation to completion"
      gradient="blue"
      tabs={tabs}
    />
  );
};

export default OrdersGuide;
