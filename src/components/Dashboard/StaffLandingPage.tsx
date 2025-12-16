import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Coffee,
  UtensilsCrossed,
  Bed,
  Users,
  ClipboardList,
  Sparkles,
  ArrowRight,
  Clock,
  CalendarDays,
} from "lucide-react";

// All possible quick actions for staff
const allQuickActions = [
  {
    title: "POS",
    description: "Take new orders",
    icon: ShoppingCart,
    path: "/pos",
    permission: "orders.view",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    title: "Orders",
    description: "View & manage orders",
    icon: ClipboardList,
    path: "/orders",
    permission: "orders.view",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    title: "Kitchen",
    description: "Kitchen display system",
    icon: UtensilsCrossed,
    path: "/kitchen",
    permission: "kitchen.view",
    gradient: "from-orange-500 to-red-500",
  },
  {
    title: "Menu",
    description: "View menu items",
    icon: Coffee,
    path: "/menu",
    permission: "menu.view",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    title: "Tables",
    description: "Table management",
    icon: Users,
    path: "/tables",
    permission: "tables.view",
    gradient: "from-purple-500 to-pink-600",
  },
  {
    title: "Rooms",
    description: "Room availability",
    icon: Bed,
    path: "/rooms",
    permission: "rooms.view",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    title: "Reservations",
    description: "View reservations",
    icon: CalendarDays,
    path: "/reservations",
    permission: "reservations.view",
    gradient: "from-rose-500 to-pink-600",
  },
];

// Get time-based greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

/**
 * Landing page for users without dashboard access.
 * Shows personalized greeting and quick links to accessible components.
 */
const StaffLandingPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Filter quick actions based on user permissions
  const accessibleActions = allQuickActions.filter(action =>
    hasPermission(action.permission as any)
  );

  // Get user display name
  const displayName = user?.first_name || user?.email?.split("@")[0] || "Team Member";
  const userRole = user?.role_name_text || user?.role || "Staff";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-4 md:p-6">
      {/* Welcome Header */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {getGreeting()}, {displayName}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg mt-1">
                Welcome back • <span className="capitalize font-medium">{userRole}</span>
              </p>
            </div>
          </div>

          {/* Current Time */}
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Clock className="h-5 w-5" />
            <span className="text-sm">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Quick Access Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <ArrowRight className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Quick Access
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Jump to your available tools
              </p>
            </div>
          </div>

          {accessibleActions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {accessibleActions.map((action, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl p-6 hover:bg-white dark:hover:bg-gray-800 hover:border-purple-200 dark:hover:border-purple-700 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                  onClick={() => navigate(action.path)}
                >
                  {/* Gradient overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`p-3 bg-gradient-to-r ${action.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-300" />
                    </div>

                    <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors duration-300">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {action.description}
                    </p>

                    <div
                      className={`w-full h-0.5 bg-gradient-to-r ${action.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // No accessible components
            <div className="text-center py-12">
              <div className="bg-gray-50 dark:bg-gray-800/30 rounded-2xl p-8 max-w-md mx-auto">
                <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-full inline-block mb-4">
                  <Clock className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No Modules Assigned Yet
                </h3>
                <p className="text-gray-500 dark:text-gray-500 mb-4">
                  Please contact your manager or administrator to get access to the system modules.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Need help? Contact your administrator for assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StaffLandingPage;
