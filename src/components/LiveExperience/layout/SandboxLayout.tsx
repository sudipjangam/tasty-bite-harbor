import React from "react";
import { SandboxSidebar } from "./SandboxSidebar";
import { SandboxHeader } from "./SandboxHeader";
import { useSandbox } from "../context/SandboxContext";
import { SandboxOverviewView } from "../views/SandboxOverviewView";
import { SandboxQSRPOSView } from "../views/SandboxQSRPOSView";
import { SandboxQuickServePOSView } from "../views/SandboxQuickServePOSView";
import { SandboxKDSView } from "../views/SandboxKDSView";
import { SandboxOrdersView } from "../views/SandboxOrdersView";
import { SandboxOnlineDeliveryView } from "../views/SandboxOnlineDeliveryView";
import { SandboxRecipesView } from "../views/SandboxRecipesView";
import { SandboxMenuView } from "../views/SandboxMenuView";
import { SandboxInventoryView } from "../views/SandboxInventoryView";
import { SandboxDigitalTwinView } from "../views/SandboxDigitalTwinView";
import { SandboxAnalyticsView } from "../views/SandboxAnalyticsView";
import { SandboxStaffView } from "../views/SandboxStaffView";
import { SandboxSettingsView } from "../views/SandboxSettingsView";
import { SandboxKOTModal } from "../dialogs/SandboxKOTModal";
import { SandboxBookingModal } from "../dialogs/SandboxBookingModal";
import { Bell } from "lucide-react";

export const SandboxLayout: React.FC = () => {
  const { activeTab, toastMessage } = useSandbox();

  const renderActiveView = () => {
    switch (activeTab) {
      case "overview":
        return <SandboxOverviewView />;
      case "qsr-pos":
      case "pos":
        return <SandboxQSRPOSView />;
      case "quickserve-pos":
        return <SandboxQuickServePOSView />;
      case "kitchen":
      case "kitchen-tv":
        return <SandboxKDSView />;
      case "orders":
        return <SandboxOrdersView />;
      case "aggregators":
        return <SandboxOnlineDeliveryView />;
      case "recipes":
        return <SandboxRecipesView />;
      case "menu":
        return <SandboxMenuView />;
      case "inventory":
        return <SandboxInventoryView />;
      case "tables":
      case "digital-twin":
        return <SandboxDigitalTwinView />;
      case "analytics":
        return <SandboxAnalyticsView />;
      case "staff":
        return <SandboxStaffView />;
      case "settings":
        return <SandboxSettingsView />;
      default:
        return <SandboxOverviewView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Real-style Sidebar */}
      <SandboxSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50/40 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/40">
        {/* Sticky Sandbox Top Bar */}
        <SandboxHeader />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {renderActiveView()}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-950 px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/50 dark:border-slate-200/50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="p-1.5 bg-indigo-500 rounded-xl text-white">
            <Bell className="h-4 w-4 animate-bounce" />
          </div>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Dialogs */}
      <SandboxKOTModal />
      <SandboxBookingModal />
    </div>
  );
};
