import React, { useState } from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Download } from "lucide-react";

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
  const maxRev = Math.max(...rows.map((r) => r.revenue));
  const maxExp = Math.max(...rows.map((r) => r.expenses));

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

              {/* ── Expenses section (bars left-align from center) ── */}
              <div className="flex-1 flex items-center h-full">
                {/* Expense bar */}
                <div
                  className="h-full bg-red-500 flex items-center justify-center px-2 overflow-hidden"
                  style={{
                    width: `${expPct}%`,
                    minWidth: 60,
                    borderRadius: "0 6px 6px 0",
                  }}
                >
                  <span className="text-white text-xs font-semibold whitespace-nowrap truncate">
                    {fmt(row.expenses)}
                  </span>
                </div>

                {/* Profit/margin outside to the right */}
                <span
                  className={cn(
                    "ml-2.5 text-xs font-bold whitespace-nowrap shrink-0",
                    isPos
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500 dark:text-red-400"
                  )}
                >
                  {isPos ? "+" : "-"}{fmt(Math.abs(row.profit))}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── X-axis ── */}
      <div className="flex items-center mt-3" style={{ marginLeft: 88 }}>
        {/* Left section label */}
        <div className="flex-1 flex justify-start">
          <span className="text-[10px] text-gray-400 dark:text-white/30">0</span>
        </div>
        {/* Center 0 */}
        <div className="shrink-0 text-[10px] text-gray-400 dark:text-white/30 -translate-x-1">0</div>
        {/* Right section labels */}
        <div className="flex-1 flex justify-between pl-2">
          {[20, 40, 60, 80, 100].map((v) => (
            <span key={v} className="text-[10px] text-gray-400 dark:text-white/30">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────
const CrossBranchPnL: React.FC = () => {
  const { currentBranch, pnlBranches } = useFranchise();
  const [period, setPeriod] = useState("This Month - June 2026");

  const displayBranches = currentBranch
    ? pnlBranches.filter((b) => b.branchId === currentBranch.id)
    : pnlBranches;

  // Build diverging rows
  const divergeRows: DivergeRow[] = displayBranches.map((b) => {
    const expenses = b.foodCost + b.laborCost + b.rent + b.utilities + b.marketing + b.other;
    const profit   = b.revenue - expenses;
    const margin   = ((profit / b.revenue) * 100).toFixed(0);
    const shortName = b.branchName.includes("HQ") ? "Mumbai HQ" : b.branchName.split(" ")[0];
    return { id: b.branchId, name: shortName, revenue: b.revenue, expenses, profit, margin, color: b.color };
  });

  // Aggregate
  const totals = divergeRows.reduce(
    (acc, r) => ({ revenue: acc.revenue + r.revenue, expenses: acc.expenses + r.expenses, profit: acc.profit + r.profit }),
    { revenue: 0, expenses: 0, profit: 0 }
  );
  const marginPct = ((totals.profit / totals.revenue) * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-6 space-y-5">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cross-Branch P&amp;L Report</h1>
          <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
            {currentBranch ? currentBranch.name : "All Branches"} · June 2026
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 dark:text-white/50">Period:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option>This Month - June 2026</option>
            <option>Last Month - May 2026</option>
            <option>This Quarter</option>
            <option>This Year</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/10"
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
            <TrendingUp className="h-3.5 w-3.5" /> +18.5% vs last month
          </div>
        </div>
        <div className="bg-[#dc2626] rounded-2xl p-5 shadow-lg shadow-red-700/20 dark:shadow-red-900/40">
          <p className="text-red-50 text-sm font-medium mb-1">Total Expenses</p>
          <p className="text-3xl md:text-4xl font-bold text-white">{fmt(totals.expenses)}</p>
          <div className="flex items-center gap-1 text-red-100 text-xs mt-3">
            <TrendingDown className="h-3.5 w-3.5" /> +8.2% vs last month
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
