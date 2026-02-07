import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/Layout/PageHeader";
import { ProfitLossStatement } from "./ProfitLossStatement";
import { CashFlowManagement } from "./CashFlowManagement";
import { InvoiceManagement } from "./InvoiceManagement";
import { BudgetManagement } from "./BudgetManagement";
import { TaxReporting } from "./TaxReporting";
import { FinancialReports } from "./FinancialReports";
import HotelRevenueManager from "../Revenue/HotelRevenueManager";
import {
  Calculator,
  TrendingUp,
  FileText,
  PieChart,
  Receipt,
  Target,
  Hotel,
  BarChart3,
  Lock,
  Crown,
  Sparkles,
  Construction,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useFinancialTabAccess,
  TAB_REQUIRED_PLAN,
} from "@/hooks/useFinancialTabAccess";
import { UpgradeDialog } from "@/components/Shared/UpgradeDialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FinancialDashboard = () => {
  const {
    hasTabAccess,
    getRequiredPlan,
    getTabInfo,
    currentPlanDisplay,
    isLoading,
  } = useFinancialTabAccess();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedRestrictedTab, setSelectedRestrictedTab] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Handle tab click - check access before switching
  const handleTabClick = (tabId: string) => {
    if (hasTabAccess(tabId)) {
      setActiveTab(tabId);
    } else {
      setSelectedRestrictedTab(tabId);
      setUpgradeDialogOpen(true);
    }
  };

  // Get badge for restricted tabs
  const getRestrictionBadge = (tabId: string) => {
    if (hasTabAccess(tabId)) return null;

    const requiredPlan = getRequiredPlan(tabId);
    const isGrowth = requiredPlan === "Growth";

    return (
      <Badge
        variant="secondary"
        className={cn(
          "ml-1 text-[10px] px-1.5 py-0 font-medium",
          isGrowth
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
        )}
      >
        {isGrowth ? (
          <Sparkles className="w-2.5 h-2.5 mr-0.5" />
        ) : (
          <Crown className="w-2.5 h-2.5 mr-0.5" />
        )}
        {requiredPlan}
      </Badge>
    );
  };

  // Tab trigger with access control
  const RestrictedTabTrigger = ({
    value,
    icon: Icon,
    label,
    borderColor,
    disabled = false,
    disabledTooltip = "",
  }: {
    value: string;
    icon: React.ElementType;
    label: string;
    borderColor: string;
    disabled?: boolean;
    disabledTooltip?: string;
  }) => {
    const hasAccess = hasTabAccess(value);

    const trigger = (
      <TabsTrigger
        value={value}
        disabled={disabled}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          if (!hasAccess) {
            e.preventDefault();
            handleTabClick(value);
          }
        }}
        className={cn(
          "flex items-center justify-center gap-1 md:gap-2 rounded-xl transition-all duration-300 py-2 md:py-3 px-2 md:px-4 min-w-[44px] whitespace-nowrap",
          `data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border ${borderColor}`,
          !hasAccess && "opacity-70 hover:opacity-90",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {disabled && (
          <Construction className="h-3 w-3 md:h-4 md:w-4 text-amber-500" />
        )}
        {!hasAccess && !disabled && (
          <Lock className="h-3 w-3 text-muted-foreground" />
        )}
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="hidden md:inline text-sm">{label}</span>
        <span className="hidden sm:inline md:hidden text-xs">
          {label.slice(0, 3)}
        </span>
        {getRestrictionBadge(value)}
      </TabsTrigger>
    );

    if (disabled && disabledTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent>
              <p>{disabledTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return trigger;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Modern Header with Glass Effect */}
      <div className="mb-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-orange-500/20 rounded-3xl shadow-xl dark:shadow-orange-500/10 p-4 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-2xl shadow-lg shadow-orange-500/30 dark:shadow-orange-500/50">
            <Calculator className="h-6 w-6 md:h-8 md:w-8 text-white drop-shadow-lg" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
              Financial Management
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1 md:mt-2 text-sm md:text-lg">
              Comprehensive financial management for your restaurant and hotel
              operations
            </p>
          </div>

          {/* Colorful Status Badges */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl shadow-lg shadow-emerald-500/30">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs md:text-sm font-semibold">
                Real-time
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl shadow-lg shadow-violet-500/30">
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm font-semibold">
                {currentPlanDisplay} Plan
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Container with Glass Effect */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-orange-500/20 rounded-3xl shadow-xl dark:shadow-orange-500/10 p-3 md:p-6">
        <Tabs
          value={activeTab}
          onValueChange={handleTabClick}
          className="w-full"
        >
          <div className="overflow-x-auto pb-2 mb-4 md:mb-6 scrollbar-hide">
            <div className="bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl p-1.5 md:p-2">
              <TabsList className="inline-flex w-auto min-w-full md:w-auto space-x-1 p-1 bg-transparent rounded-2xl">
                <RestrictedTabTrigger
                  value="overview"
                  icon={TrendingUp}
                  label="Overview"
                  borderColor="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30"
                />
                <RestrictedTabTrigger
                  value="revenue"
                  icon={Hotel}
                  label="Revenue"
                  borderColor="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30"
                  disabled={true}
                  disabledTooltip="Hotel Revenue Management - Coming Soon"
                />
                <RestrictedTabTrigger
                  value="profit-loss"
                  icon={Calculator}
                  label="P&L"
                  borderColor="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30"
                />
                <RestrictedTabTrigger
                  value="cash-flow"
                  icon={PieChart}
                  label="Cash Flow"
                  borderColor="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30"
                />
                <RestrictedTabTrigger
                  value="invoices"
                  icon={Receipt}
                  label="Invoices"
                  borderColor="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-rose-500/30"
                />
                <RestrictedTabTrigger
                  value="budgets"
                  icon={Target}
                  label="Budgets"
                  borderColor="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30"
                />
                <RestrictedTabTrigger
                  value="reports"
                  icon={FileText}
                  label="Reports"
                  borderColor="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/30"
                />
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview" className="mt-6">
            <div className="bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl p-6 border border-gray-200/30 dark:border-gray-700/30">
              <FinancialReports />
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="mt-6">
            <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200/30 dark:border-purple-700/30">
              <HotelRevenueManager />
            </div>
          </TabsContent>

          <TabsContent value="profit-loss" className="mt-6">
            <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-200/30 dark:border-emerald-700/30">
              <ProfitLossStatement />
            </div>
          </TabsContent>

          <TabsContent value="cash-flow" className="mt-6">
            <div className="bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-cyan-200/30 dark:border-cyan-700/30">
              <CashFlowManagement />
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <div className="bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border border-orange-200/30 dark:border-orange-700/30">
              <InvoiceManagement />
            </div>
          </TabsContent>

          <TabsContent value="budgets" className="mt-6">
            <div className="bg-gradient-to-br from-pink-50/50 to-rose-50/50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-2xl p-6 border border-pink-200/30 dark:border-pink-700/30">
              <BudgetManagement />
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-2xl p-6 border border-indigo-200/30 dark:border-indigo-700/30">
              <TaxReporting />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Upgrade Dialog */}
      {selectedRestrictedTab && (
        <UpgradeDialog
          isOpen={upgradeDialogOpen}
          onClose={() => {
            setUpgradeDialogOpen(false);
            setSelectedRestrictedTab(null);
          }}
          featureName={getTabInfo(selectedRestrictedTab).name}
          featureDescription={getTabInfo(selectedRestrictedTab).description}
          requiredPlan={getRequiredPlan(selectedRestrictedTab)}
          currentPlan={currentPlanDisplay}
        />
      )}
    </div>
  );
};

export default FinancialDashboard;
