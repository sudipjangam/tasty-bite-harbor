import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Layers,
  Sliders,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  Table as TableIcon,
  AlertTriangle,
  BarChart3,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCustomWidgets } from "@/hooks/useCustomWidgets";
import { CustomDynamicWidget } from "./CustomDynamicWidget";
import { CustomWidget, SourceDomain, WidgetType, DateRangePreset } from "@/types/customWidgets";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface AIComponentStudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SAMPLE_PROMPTS = [
  { label: "Today's Total Sales", domain: "orders", type: "kpi", prompt: "Show total order revenue for today" },
  { label: "Low Inventory Warning", domain: "inventory", type: "alert", prompt: "Alert for ingredients running below threshold" },
  { label: "Top Spender Customers", domain: "customers", type: "table", prompt: "Table of high value VIP customers" },
  { label: "Orders by Payment Mode", domain: "orders", type: "chart", prompt: "Column chart of UPI vs Cash revenue" },
  { label: "Monthly Expenses", domain: "finance", type: "kpi", prompt: "Total expenses recorded this month" },
];

export const AIComponentStudioDialog: React.FC<AIComponentStudioDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { restaurantId } = useRestaurantId();
  const { quota, createWidget, isCreating } = useCustomWidgets();

  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");
  const [promptText, setPromptText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Widget State Under Construction
  const [title, setTitle] = useState("Today's Net Revenue");
  const [description, setDescription] = useState("Live gross sales across all counter sessions");
  const [sourceDomain, setSourceDomain] = useState<SourceDomain>("orders");
  const [widgetType, setWidgetType] = useState<WidgetType>("kpi");
  const [aggregation, setAggregation] = useState<"sum" | "count" | "avg">("sum");
  const [dateRange, setDateRange] = useState<DateRangePreset>("today");
  const [chartGroupBy, setChartGroupBy] = useState<string>("order_type");

  // Construct preview widget object
  const previewWidget: CustomWidget = {
    id: "preview-temp-id",
    restaurant_id: restaurantId || "",
    title: title || "Custom Dynamic Metric",
    description,
    widget_type: widgetType,
    source_domain: sourceDomain,
    query_config: {
      aggregation,
      dateRangePreset: dateRange,
      groupBy: chartGroupBy,
      limit: 6,
    },
    visual_config: {
      chartType: "column",
    },
    ai_prompt: promptText,
    grid_size: "md",
    is_active: true,
    display_order: 0,
  };

  const handleInterpretPrompt = (text: string) => {
    setIsGenerating(true);
    const lower = text.toLowerCase();

    setTimeout(() => {
      if (lower.includes("stock") || lower.includes("inventory") || lower.includes("ingredient")) {
        setSourceDomain("inventory");
        if (lower.includes("alert") || lower.includes("low") || lower.includes("warning")) {
          setWidgetType("alert");
          setTitle("Low Inventory Alert");
          setDescription("Active items below safety threshold");
        } else {
          setWidgetType("table");
          setTitle("Stock Inventory Ledger");
          setDescription("Realtime stock levels");
        }
      } else if (lower.includes("customer") || lower.includes("vip") || lower.includes("guest")) {
        setSourceDomain("customers");
        setWidgetType(lower.includes("table") || lower.includes("list") ? "table" : "kpi");
        setTitle("VIP Customer Spend");
        setDescription("Top patrons by lifetime purchases");
      } else if (lower.includes("staff") || lower.includes("employee") || lower.includes("attendance")) {
        setSourceDomain("staff");
        setWidgetType("kpi");
        setAggregation("count");
        setTitle("Active On-Duty Staff");
        setDescription("Personnel currently registered on shift");
      } else if (lower.includes("expense") || lower.includes("cost") || lower.includes("spend")) {
        setSourceDomain("finance");
        setWidgetType(lower.includes("chart") ? "chart" : "kpi");
        setAggregation("sum");
        setTitle("Operational Expenses");
        setDescription("Current period expense outflow");
      } else {
        // Orders default
        setSourceDomain("orders");
        if (lower.includes("chart") || lower.includes("mode") || lower.includes("payment")) {
          setWidgetType("chart");
          setChartGroupBy("payment_method");
          setTitle("Revenue by Payment Mode");
          setDescription("Breakdown of settlements");
        } else {
          setWidgetType("kpi");
          setAggregation(lower.includes("count") ? "count" : "sum");
          setTitle(lower.includes("today") ? "Today's Order Sales" : "Total Revenue Metric");
          setDescription("Realtime POS & Kitchen order volume");
        }
      }

      if (lower.includes("today")) setDateRange("today");
      else if (lower.includes("week")) setDateRange("this_week");
      else if (lower.includes("month")) setDateRange("this_month");

      setIsGenerating(false);
    }, 400);
  };

  const handleSaveWidget = async () => {
    if (!quota.canCreate) return;

    await createWidget({
      title: previewWidget.title,
      description: previewWidget.description,
      widget_type: previewWidget.widget_type,
      source_domain: previewWidget.source_domain,
      query_config: previewWidget.query_config,
      visual_config: previewWidget.visual_config,
      ai_prompt: promptText || undefined,
      grid_size: previewWidget.grid_size,
      is_active: true,
      display_order: quota.count + 1,
    });

    onOpenChange(false);
  };

  const isQuotaFull = quota.count >= quota.maxLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl bg-white dark:bg-[#151522] border border-gray-200 dark:border-white/10 shadow-2xl">
        {/* Header Bar */}
        <div className="p-6 pb-4 bg-gradient-to-r from-orange-500/10 via-rose-500/10 to-indigo-500/10 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  AI Component Studio
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    No-Code Engine
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                  Build custom KPI cards, charts, and table widgets from real-time database
                </DialogDescription>
              </div>
            </div>

            {/* Quota Badge */}
            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${isQuotaFull ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}`}>
                {quota.count} / {quota.maxLimit} Widgets Used
              </span>
            </div>
          </div>

          {/* Quota Full Warning */}
          {isQuotaFull && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Lock className="w-4 h-4" />
                <span>You reached the quota limit for your plan. Upgrade to unlock more components.</span>
              </div>
              <Button
                size="sm"
                variant="default"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 rounded-lg"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/subscription");
                }}
              >
                Upgrade Plan <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </div>

        {/* Studio Content Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
          {/* LEFT: Builder Controls */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ai" | "manual")}>
              <TabsList className="grid grid-cols-2 w-full bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                <TabsTrigger value="ai" className="text-xs rounded-lg flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Natural Language AI
                </TabsTrigger>
                <TabsTrigger value="manual" className="text-xs rounded-lg flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Manual Config
                </TabsTrigger>
              </TabsList>

              {/* AI PROMPT TAB */}
              <TabsContent value="ai" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    What metric or component do you need?
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Total takeaway sales today vs dine-in"
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInterpretPrompt(promptText)}
                      className="text-xs h-9 rounded-xl"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleInterpretPrompt(promptText)}
                      disabled={!promptText.trim() || isGenerating}
                      className="bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl h-9 px-4 text-xs"
                    >
                      {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Build"}
                    </Button>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    Instant Templates:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_PROMPTS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setPromptText(p.prompt);
                          handleInterpretPrompt(p.prompt);
                        }}
                        className="text-[11px] bg-gray-100 dark:bg-white/5 hover:bg-orange-500/10 hover:text-orange-500 border border-transparent hover:border-orange-500/20 px-2.5 py-1 rounded-lg transition-all text-left"
                      >
                        ⚡ {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* MANUAL CONFIG TAB */}
              <TabsContent value="manual" className="space-y-3 mt-4">
                <div className="space-y-1">
                  <Label className="text-xs">Component Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-xs h-8 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Data Domain</Label>
                    <Select value={sourceDomain} onValueChange={(v) => setSourceDomain(v as SourceDomain)}>
                      <SelectTrigger className="text-xs h-8 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="orders">Orders & POS</SelectItem>
                        <SelectItem value="inventory">Inventory Stock</SelectItem>
                        <SelectItem value="customers">Customers & CRM</SelectItem>
                        <SelectItem value="staff">Staff & HR</SelectItem>
                        <SelectItem value="finance">Expenses & Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Visual Format</Label>
                    <Select value={widgetType} onValueChange={(v) => setWidgetType(v as WidgetType)}>
                      <SelectTrigger className="text-xs h-8 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kpi">KPI Metric Card</SelectItem>
                        <SelectItem value="chart">Summary Chart</SelectItem>
                        <SelectItem value="table">Data Table</SelectItem>
                        <SelectItem value="alert">Threshold Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Aggregation</Label>
                    <Select value={aggregation} onValueChange={(v) => setAggregation(v as any)}>
                      <SelectTrigger className="text-xs h-8 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Sum (Total)</SelectItem>
                        <SelectItem value="count">Count (Units)</SelectItem>
                        <SelectItem value="avg">Average (Mean)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Time Period</Label>
                    <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangePreset)}>
                      <SelectTrigger className="text-xs h-8 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="this_week">This Week</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT: Live Interactive Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Live Interactive Sandbox
              </Label>
              <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Realtime Data Linked
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-dashed border-gray-200 dark:border-white/10 flex flex-col justify-center min-h-[220px]">
              <CustomDynamicWidget widget={previewWidget} />
            </div>

            <p className="text-[11px] text-gray-400 text-center">
              Component will automatically refresh every 60 seconds with live transactions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 px-6 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveWidget}
            disabled={!quota.canCreate || isCreating}
            className="bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 hover:opacity-90 text-white rounded-xl px-5 text-xs font-semibold shadow-md"
          >
            {isCreating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            )}
            Pin Component to Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
