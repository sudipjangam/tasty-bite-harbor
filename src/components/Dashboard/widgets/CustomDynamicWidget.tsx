import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Trash2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Table as TableIcon,
  BarChart3,
  Layers,
  Sparkles,
} from "lucide-react";
import { CustomWidget } from "@/types/customWidgets";
import { fetchWidgetData } from "@/utils/customWidgetDataFetcher";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface CustomDynamicWidgetProps {
  widget: CustomWidget;
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, active: boolean) => void;
  className?: string;
}

export const CustomDynamicWidget: React.FC<CustomDynamicWidgetProps> = ({
  widget,
  onDelete,
  className = "",
}) => {
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["custom-widget-data", widget.id, restaurantId, widget.query_config],
    enabled: !!restaurantId,
    queryFn: () => fetchWidgetData(widget, restaurantId!),
    refetchInterval: 60000, // auto-refresh every 60s
  });

  const getDomainColor = (domain: string) => {
    switch (domain) {
      case "orders":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "inventory":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "customers":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "staff":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "finance":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
    }
  };

  const prefix = widget.visual_config.prefix ?? (widget.source_domain === "orders" || widget.source_domain === "finance" ? currencySymbol : "");
  const suffix = widget.visual_config.suffix ?? "";

  return (
    <Card className={`relative overflow-hidden border border-gray-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all rounded-2xl bg-white/80 dark:bg-[#1A1A2E]/80 backdrop-blur-md ${className}`}>
      {/* Top Accent Gradient Line */}
      <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-rose-500 to-indigo-500" />

      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          {widget.ai_prompt && (
            <span className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400" title="AI Generated Widget">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          )}
          <div>
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
              {widget.title}
            </CardTitle>
            {widget.description && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[220px]">
                {widget.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full ${getDomainColor(widget.source_domain)}`}>
            {widget.source_domain}
          </Badge>

          {onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={() => refetch()} className="cursor-pointer">
                  Refresh Data
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(widget.id)}
                  className="text-red-600 dark:text-red-400 cursor-pointer flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove from Dashboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        {isLoading ? (
          <div className="space-y-2 py-3">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-3 w-36 rounded" />
          </div>
        ) : error ? (
          <div className="text-xs text-red-500 py-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Failed to load data
          </div>
        ) : (
          <>
            {/* KPI TYPE */}
            {widget.widget_type === "kpi" && (
              <div className="py-2">
                <div className="flex items-baseline gap-1">
                  {prefix && <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{prefix}</span>}
                  <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                    {typeof data?.kpiValue === "number" ? data.kpiValue.toLocaleString() : data?.kpiValue || "0"}
                  </span>
                  {suffix && <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{suffix}</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    {widget.query_config.dateRangePreset ? `Filter: ${widget.query_config.dateRangePreset.replace("_", " ")}` : "All Time"}
                  </span>
                  {widget.visual_config.comparisonLabel && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {widget.visual_config.comparisonLabel}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* ALERT TYPE */}
            {widget.widget_type === "alert" && (
              <div className="py-2">
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${data?.alertActive ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"}`}>
                  {data?.alertActive ? (
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-bold">
                      {data?.alertActive ? "Threshold Warning" : "All Normal"}
                    </p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      {data?.alertMessage || (data?.alertActive ? "Action required on threshold." : "Healthy conditions maintained.")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TYPE */}
            {widget.widget_type === "table" && (
              <div className="py-1 overflow-x-auto max-h-[180px] overflow-y-auto">
                {data?.tableRows && data.tableRows.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] uppercase text-gray-400">
                        {Object.keys(data.tableRows[0]).slice(0, 3).map((col) => (
                          <th key={col} className="pb-1.5 font-semibold">
                            {col.replace("_", " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {data.tableRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                          {Object.values(row).slice(0, 3).map((val: any, colIdx) => (
                            <td key={colIdx} className="py-1.5 text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                              {String(val ?? "-")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-6 text-xs text-gray-400">No records found</div>
                )}
              </div>
            )}

            {/* CHART TYPE */}
            {widget.widget_type === "chart" && (
              <div className="py-2">
                {data?.chartCategories && data.chartCategories.length > 0 ? (
                  <div className="space-y-2">
                    {data.chartCategories.slice(0, 4).map((cat, i) => {
                      const val = data.chartSeries?.[0]?.data?.[i] || 0;
                      const maxVal = Math.max(...(data.chartSeries?.[0]?.data || [1]));
                      const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-300 truncate max-w-[140px]">{cat}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {prefix}{val.toLocaleString()}{suffix}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-gray-400">No data points available</div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
