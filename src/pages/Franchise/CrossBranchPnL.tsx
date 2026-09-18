import React, { useState, useEffect } from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Download, Calendar, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MockPnLBranch } from "@/data/franchiseMockData";

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (v: number) => `₹${Math.abs(v).toLocaleString("en-IN")}`;

const EXPENSE_ROWS = [
  { key: "foodCost",  label: "Food Cost"  },
  { key: "laborCost", label: "Labor Cost" },
  { key: "rent",      label: "Rent"       },
  { key: "utilities", label: "Utilities"  },
  { key: "marketing", label: "Marketing"  },
  { key: "other",     label: "Other"      },
] as const;

// ─── Diverging Bar Chart ──────────────────────────────────────
// Revenue bars grow LEFT from center  |  Expense bars grow RIGHT from center
interface DivergeRow {
  id: string;
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: string;
  color: string;
}

const DivertingBarChart: React.FC<{ rows: DivergeRow[] }> = ({ rows }) => {
  const maxRev = Math.max(...rows.map((r) => r.revenue), 1);
  const maxExp = Math.max(...rows.map((r) => r.expenses), 1);

  return (
    <div>
      {/* Legend */}
      <div className="flex justify-center gap-8 mb-5">
        <span className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-white/70">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Revenue
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-white/70">
          <span className="w-3 h-3 rounded-sm bg-red-500" /> Expenses
        </span>
      </div>

      {/* Bar rows */}
      <div className="space-y-2.5">
        {rows.map((row) => {
          const revPct   = (row.revenue  / maxRev) * 100;
          const expPct   = (row.expenses / maxExp) * 100;
          const revWide  = revPct >= 60; // show amount inside revenue bar
          const isPos    = row.profit >= 0;

          return (
            <div key={row.id} className="flex items-center" style={{ height: 40 }}>

              {/* ── Branch label (fixed left column) ── */}
              <div className="shrink-0 text-right pr-3" style={{ width: 88 }}>
                <span className="text-sm font-medium text-gray-700 dark:text-white/80 whitespace-nowrap">
                  {row.name}
                </span>
              </div>

              {/* ── Revenue section (bars right-align to the center) ── */}
              <div className="flex-1 flex items-center justify-end h-full overflow-hidden">
                {/* Outside label when bar is narrow */}
                {!revWide && (
                  <span className="text-xs text-gray-500 dark:text-white/50 mr-2 shrink-0 whitespace-nowrap">
                    {fmt(row.revenue)}
                  </span>
                )}

                {/* Revenue bar */}
                <div
                  className="h-full bg-emerald-500 flex items-center justify-center gap-1 px-2 overflow-hidden"
                  style={{
                    width: `${revPct}%`,
                    minWidth: 48,
                    borderRadius: "6px 0 0 6px",
                  }}
                >
                  {revWide && (
                    <span className="text-white text-xs font-semibold whitespace-nowrap truncate hidden sm:block">
                      {fmt(row.revenue)}
                    </span>
                  )}
                  <span className="text-white text-xs font-bold whitespace-nowrap shrink-0">
                    {row.margin}%
                  </span>
                </div>
              </div>

              {/* ── Center divider line ── */}
              <div
                className="shrink-0 h-full bg-gray-300 dark:bg-white/20"
                style={{ width: 1 }}
              />

              {/* ── Expense section (bars left-align to the center) ── */}
              <div className="flex-1 flex items-center justify-start h-full overflow-hidden">
                {/* Expense bar */}
                <div
                  className="h-full bg-red-500 flex items-center justify-center px-2 overflow-hidden"
                  style={{
                    width: `${expPct}%`,
                    minWidth: 48,
                    borderRadius: "0 6px 6px 0",
                  }}
                >
                  <span className="text-white text-xs font-semibold whitespace-nowrap truncate hidden sm:block">
                    {fmt(row.expenses)}
                  </span>
                </div>

                {/* Outside label */}
                <span className="text-xs text-gray-500 dark:text-white/50 ml-2 shrink-0 whitespace-nowrap">
                  {fmt(row.expenses)}
                </span>
              </div>

              {/* ── Profit pill (fixed right column) ── */}
              <div className="shrink-0 pl-3 flex items-center" style={{ width: 120 }}>
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1",
                    isPos
                      ? "text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40"
                      : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950/40"
                  )}
                >
                  {isPos ? "+" : "-"}
                  {fmt(row.profit)}
                </span>
              </div>

            </div>
          );
        })}
      </div>

      {/* Axis ticks at bottom */}
      <div className="flex items-center mt-3 pt-2 border-t border-gray-100 dark:border-white/10 text-xs text-gray-400 dark:text-white/30">
        <div className="text-right pr-3" style={{ width: 88 }}>
          <span className="text-[10px]">Branch</span>
        </div>
        <div className="flex-1 flex justify-between pr-2">
          {["-100%", "-75%", "-50%", "-25%"].map((v) => (
            <span key={v} className="text-[10px] text-gray-400 dark:text-white/30">{v}</span>
          ))}
        </div>
        <div className="shrink-0 text-center font-bold text-[10px]" style={{ width: 1 }}>0</div>
        <div className="flex-1 flex justify-between pl-2">
          {["+25%", "+50%", "+75%", "+100%"].map((v) => (
            <span key={v} className="text-[10px] text-gray-400 dark:text-white/30">{v}</span>
          ))}
        </div>
        <div className="shrink-0 pl-3" style={{ width: 120 }}>
          <span className="text-[10px]">Net Profit</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────
const CrossBranchPnL: React.FC = () => {
  const { currentBranch, allBranches, pnlBranches, kpis, demoMode } = useFranchise();
  const { toast } = useToast();

  // Dynamic period labels
  const now = new Date();
  const thisMonthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const lastMonthDate = new Date(now); lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthLabel = lastMonthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Period filter states
  const [period, setPeriod] = useState(`This Month - ${thisMonthLabel}`);
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);
  const [livePnL, setLivePnL] = useState<MockPnLBranch[] | null>(null);
  const [isLoadingReal, setIsLoadingReal] = useState(false);

  let multiplier = 1.0;
  let dateSubtext = thisMonthLabel;

  // Compute ISO dates for queries
  let queryStartIso = "";
  let queryEndIso = "";

  if (period === `This Month - ${thisMonthLabel}`) {
    multiplier = 1.0;
    dateSubtext = `${new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
    queryStartIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    queryEndIso = now.toISOString();
  } else if (period === `Last Month - ${lastMonthLabel}`) {
    multiplier = 0.92;
    dateSubtext = `${new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${new Date(now.getFullYear(), now.getMonth(), 0).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
    queryStartIso = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1).toISOString();
    queryEndIso = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  } else if (period === "This Quarter") {
    multiplier = 2.85;
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    dateSubtext = `${qStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
    queryStartIso = qStart.toISOString();
    queryEndIso = now.toISOString();
  } else if (period === "This Year") {
    multiplier = 11.4;
    dateSubtext = `Jan 1, ${now.getFullYear()} - ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
    queryStartIso = new Date(now.getFullYear(), 0, 1).toISOString();
    queryEndIso = now.toISOString();
  } else if (period === "Custom Range") {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    multiplier = diffDays / 30;
    dateSubtext = `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} - ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
    queryStartIso = new Date(startDate).toISOString();
    queryEndIso = new Date(`${endDate}T23:59:59`).toISOString();
  }

  // Fetch real historical P&L for non-demo mode
  useEffect(() => {
    if (demoMode || allBranches.length === 0) {
      setLivePnL(null);
      return;
    }

    const fetchRealPnL = async () => {
      setIsLoadingReal(true);
      try {
        const branchIds = allBranches.map((b) => b.id);
        const [ordRes, expRes] = await Promise.all([
          supabase
            .from("orders")
            .select("restaurant_id, total")
            .in("restaurant_id", branchIds)
            .gte("created_at", queryStartIso)
            .lte("created_at", queryEndIso),
          supabase
            .from("expenses")
            .select("restaurant_id, amount, category")
            .in("restaurant_id", branchIds)
            .gte("expense_date", queryStartIso.split("T")[0])
            .lte("expense_date", queryEndIso.split("T")[0])
        ]);

        const revMap: Record<string, number> = {};
        (ordRes.data || []).forEach((o) => {
          revMap[o.restaurant_id] = (revMap[o.restaurant_id] || 0) + Number(o.total || 0);
        });

        const expCategoryMap: Record<string, string> = {
          food: "foodCost", "food cost": "foodCost", "food & beverage": "foodCost",
          ingredients: "foodCost", "raw materials": "foodCost", grocery: "foodCost",
          labor: "laborCost", labour: "laborCost", salary: "laborCost",
          salaries: "laborCost", wages: "laborCost", staff: "laborCost", payroll: "laborCost",
          rent: "rent", lease: "rent", property: "rent",
          utilities: "utilities", electricity: "utilities", water: "utilities", power: "utilities", gas: "utilities",
          marketing: "marketing", advertising: "marketing", promotion: "marketing", ads: "marketing",
        };

        const branchExpMap: Record<string, Record<string, number>> = {};
        (expRes.data || []).forEach((e) => {
          if (!branchExpMap[e.restaurant_id]) branchExpMap[e.restaurant_id] = {};
          const cat = (e.category || "other").toLowerCase();
          const mapped = expCategoryMap[cat] || "other";
          branchExpMap[e.restaurant_id][mapped] = (branchExpMap[e.restaurant_id][mapped] || 0) + Number(e.amount || 0);
        });

        const mapped: MockPnLBranch[] = allBranches.map((b) => {
          const revenue = revMap[b.id] || 0;
          const exps = branchExpMap[b.id] || {};
          return {
            branchId: b.id,
            branchName: b.name,
            color: b.color,
            revenue,
            foodCost: Math.round(exps.foodCost || 0),
            laborCost: Math.round(exps.laborCost || 0),
            rent: Math.round(exps.rent || 0),
            utilities: Math.round(exps.utilities || 0),
            marketing: Math.round(exps.marketing || 0),
            other: Math.round(exps.other || 0),
          };
        });

        setLivePnL(mapped);
      } catch (err) {
        console.error("Failed to fetch real P&L for period:", err);
      } finally {
        setIsLoadingReal(false);
      }
    };

    fetchRealPnL();
  }, [period, startDate, endDate, allBranches, demoMode, queryStartIso, queryEndIso]);

  // Use live queried PnL if available, else multiply baseline in demo mode
  const baseList = livePnL || pnlBranches;
  const displayBranches = (currentBranch
    ? baseList.filter((b) => b.branchId === currentBranch.id)
    : baseList
  ).map((b) => ({
    ...b,
    revenue: livePnL ? b.revenue : Math.round(b.revenue * multiplier),
    foodCost: livePnL ? b.foodCost : Math.round(b.foodCost * multiplier),
    laborCost: livePnL ? b.laborCost : Math.round(b.laborCost * multiplier),
    rent: livePnL ? b.rent : Math.round(b.rent * multiplier),
    utilities: livePnL ? b.utilities : Math.round(b.utilities * multiplier),
    marketing: livePnL ? b.marketing : Math.round(b.marketing * multiplier),
    other: livePnL ? b.other : Math.round(b.other * multiplier),
  }));

  // Build diverging rows
  const divergeRows: DivergeRow[] = displayBranches.map((b) => {
    const expenses = b.foodCost + b.laborCost + b.rent + b.utilities + b.marketing + b.other;
    const profit   = b.revenue - expenses;
    const margin   = b.revenue > 0 ? ((profit / b.revenue) * 100).toFixed(0) : "0";
    const shortName = b.branchName.includes("HQ") ? "Mumbai HQ" : b.branchName.split(" ")[0];
    return { id: b.branchId, name: shortName, revenue: b.revenue, expenses, profit, margin, color: b.color };
  });

  // Aggregate totals
  const totals = divergeRows.reduce(
    (acc, r) => ({ revenue: acc.revenue + r.revenue, expenses: acc.expenses + r.expenses, profit: acc.profit + r.profit }),
    { revenue: 0, expenses: 0, profit: 0 }
  );
  const marginPct = totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(0) : "0";

  // CSV Export logic
  const handleExport = () => {
    // Generate CSV contents
    const headers = ["Category", ...displayBranches.map(b => b.branchName), "Total"];
    const rows = EXPENSE_ROWS.map(({ key, label }) => {
      const vals = displayBranches.map(b => b[key]);
      const total = vals.reduce((s, v) => s + v, 0);
      return [label, ...vals, total];
    });

    // Add totals row
    const summaryRows: (string | number)[][] = [
      ["Total Expenses", ...divergeRows.map(r => r.expenses), totals.expenses],
      ["Revenue", ...divergeRows.map(r => r.revenue), totals.revenue],
      ["Net Profit", ...divergeRows.map(r => r.profit), totals.profit],
    ];

    // Format & Download file
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(",")), ...summaryRows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `franchise_pnl_${period.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "📊 Report Exported",
      description: `CSV file downloaded successfully for: ${dateSubtext}.`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-6 space-y-5">

      {/* ─── Header ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cross-Branch P&amp;L Report</h1>
          <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
            {currentBranch ? currentBranch.name : "All Branches"} · {dateSubtext}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {period === "Custom Range" && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-gray-800 dark:text-white focus:outline-none"
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-gray-800 dark:text-white focus:outline-none"
              />
            </div>
          )}
          
          <span className="text-xs font-semibold text-gray-500 dark:text-white/50">Period:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value={`This Month - ${thisMonthLabel}`}>This Month - {thisMonthLabel}</option>
            <option value={`Last Month - ${lastMonthLabel}`}>Last Month - {lastMonthLabel}</option>
            <option value="This Quarter">This Quarter</option>
            <option value="This Year">This Year</option>
            <option value="Custom Range">Custom Range</option>
          </select>
          
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="gap-2 border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl"
          >
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#16a34a] rounded-2xl p-5 shadow-lg shadow-green-700/20 dark:shadow-green-900/40">
          <p className="text-green-50 text-sm font-medium mb-1">Total Revenue</p>
          <p className="text-3xl md:text-4xl font-bold text-white">{fmt(totals.revenue)}</p>
          <div className="flex items-center gap-1 text-green-100 text-xs mt-3">
            {kpis.revenueGrowth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {kpis.revenueGrowth >= 0 ? "+" : ""}{kpis.revenueGrowth}% vs last period
          </div>
        </div>
        <div className="bg-[#dc2626] rounded-2xl p-5 shadow-lg shadow-red-700/20 dark:shadow-red-900/40">
          <p className="text-red-50 text-sm font-medium mb-1">Total Expenses</p>
          <p className="text-3xl md:text-4xl font-bold text-white">{fmt(totals.expenses)}</p>
          <div className="flex items-center gap-1 text-red-100 text-xs mt-3">
            <TrendingUp className="h-3.5 w-3.5" />
            {kpis.ordersGrowth >= 0 ? "+" : ""}{kpis.ordersGrowth}% orders vs last period
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 shadow-lg shadow-blue-700/20 dark:shadow-blue-900/40">
          <p className="text-blue-50 text-sm font-medium mb-1">Net Profit</p>
          <p className="text-3xl md:text-4xl font-bold text-white">
            {fmt(totals.profit)}{" "}
            <span className="text-xl font-semibold text-blue-200">({marginPct}%)</span>
          </p>
          <div className="flex items-center gap-1 text-blue-100 text-xs mt-3">
            <TrendingUp className="h-3.5 w-3.5" /> {marginPct}% margin
          </div>
        </div>
      </div>

      {/* ─── Diverging Bar Chart ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm p-5">
        <DivertingBarChart rows={divergeRows} />
      </div>

      {/* ─── Expense Breakdown Table ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">

            {/* ── Header ── */}
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-white/10">
                <th className="text-left px-5 py-4 text-xs font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 w-[140px]">
                  Category
                </th>
                {displayBranches.map((b) => (
                  <th
                    key={b.branchId}
                    className="text-right px-4 py-4 text-xs font-bold bg-gray-50 dark:bg-slate-800"
                    style={{ color: b.color }}
                  >
                    {b.branchName.includes("HQ") ? "Mumbai HQ" : b.branchName.split(" ")[0]}
                  </th>
                ))}
                <th className="text-right px-5 py-4 text-xs font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {/* ── Expense rows ── */}
              {EXPENSE_ROWS.map(({ key, label }, i) => {
                const rowVals = displayBranches.map((b) => b[key]);
                const rowMax  = Math.max(...rowVals);
                const rowMin  = Math.min(...rowVals);
                const rowTotal = rowVals.reduce((s, v) => s + v, 0);

                return (
                  <tr
                    key={key}
                    className={cn(
                      "border-b border-gray-100 dark:border-white/5 hover:bg-gray-50/60 dark:hover:bg-white/[0.03] transition-colors",
                      i % 2 !== 0 ? "bg-gray-50/40 dark:bg-white/[0.015]" : ""
                    )}
                  >
                    <td className="px-5 py-3 text-xs text-gray-600 dark:text-white/60 font-medium">
                      {label}
                    </td>
                    {displayBranches.map((b, bi) => {
                      const val = b[key];
                      // Heat: highest value in row = red tint, lowest = green tint
                      const isHigh = val === rowMax && rowMax !== rowMin;
                      const isLow  = val === rowMin && rowMax !== rowMin;
                      return (
                        <td
                          key={b.branchId}
                          className={cn(
                            "px-4 py-3 text-right text-xs font-medium",
                            isHigh
                              ? "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                              : isLow
                              ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                              : "text-gray-700 dark:text-white/80"
                          )}
                        >
                          {fmt(val)}
                        </td>
                      );
                    })}
                    <td className="px-5 py-3 text-right text-xs font-semibold text-gray-800 dark:text-white/80">
                      {fmt(rowTotal)}
                    </td>
                  </tr>
                );
              })}

              {/* ── Total Expenses ── */}
              <tr className="border-t-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/25">
                <td className="px-5 py-3.5 text-xs font-bold text-red-700 dark:text-red-400">
                  Total Expenses
                </td>
                {divergeRows.map((r) => (
                  <td key={r.id} className="px-4 py-3.5 text-right text-xs font-bold text-red-600 dark:text-red-400">
                    {fmt(r.expenses)}
                  </td>
                ))}
                <td className="px-5 py-3.5 text-right text-xs font-bold text-red-700 dark:text-red-400">
                  {fmt(totals.expenses)}
                </td>
              </tr>

              {/* ── Revenue ── */}
              <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-white/[0.015]">
                <td className="px-5 py-3 text-xs text-gray-700 dark:text-white/80 font-medium">
                  Revenue
                </td>
                {divergeRows.map((r) => (
                  <td key={r.id} className="px-4 py-3 text-right text-xs text-gray-700 dark:text-white/80">
                    {fmt(r.revenue)}
                  </td>
                ))}
                <td className="px-5 py-3 text-right text-xs font-semibold text-gray-800 dark:text-white/80">
                  {fmt(totals.revenue)}
                </td>
              </tr>

              {/* ── Net Profit ── */}
              <tr className="border-t-2 border-gray-200 dark:border-white/10">
                <td className="px-5 py-4 text-xs font-bold text-gray-900 dark:text-white">
                  Net Profit
                </td>
                {divergeRows.map((r) => {
                  const isPos = r.profit >= 0;
                  return (
                    <td
                      key={r.id}
                      className={cn(
                        "px-4 py-4 text-right text-xs font-bold",
                        isPos
                          ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/25"
                          : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/25"
                      )}
                    >
                      {isPos ? "+" : "-"}{fmt(r.profit)}
                    </td>
                  );
                })}
                <td
                  className={cn(
                    "px-5 py-4 text-right text-xs font-bold",
                    totals.profit >= 0
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/25"
                      : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/25"
                  )}
                >
                  {totals.profit >= 0 ? "+" : "-"}{fmt(totals.profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CrossBranchPnL;
