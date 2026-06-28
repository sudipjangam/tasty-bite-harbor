import React from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import {
  MOCK_BRANCHES,
  MOCK_FRANCHISE_KPIS,
  MOCK_REVENUE_TREND,
  formatCurrency,
} from "@/data/franchiseMockData";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Store,
  Star,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── KPI Card ────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string;
  growth?: number;
  icon: React.ReactNode;
  color: string;
}
const KpiCard: React.FC<KpiCardProps> = ({ title, value, growth, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-4 hover:shadow-md transition-shadow">
    <div className={cn("p-3 rounded-xl", color)}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">
        {value}
      </p>
      {growth !== undefined && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium mt-1",
            growth >= 0 ? "text-emerald-600" : "text-red-500"
          )}
        >
          {growth >= 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {Math.abs(growth)}% vs last month
        </div>
      )}
    </div>
  </div>
);

// ─── Dashboard Page ───────────────────────────────────────────
const FranchiseDashboard: React.FC = () => {
  const { currentBranch, allBranches, isAllBranches } = useFranchise();
  const navigate = useNavigate();

  // If a specific branch is selected, show that branch's data only
  const displayBranches = currentBranch ? [currentBranch] : allBranches;
  const kpis = MOCK_FRANCHISE_KPIS;

  // Revenue trend filtered by branch
  const trendData = MOCK_REVENUE_TREND.map((d) => {
    if (!currentBranch) return d;
    const key = currentBranch.name.split(" ")[0].toLowerCase() as keyof typeof d;
    return { date: d.date, [currentBranch.name]: d[key] ?? 0 };
  });

  const trendKeys = currentBranch
    ? [currentBranch.name]
    : ["mumbai", "pune", "nashik", "nagpur"];

  const trendColors = currentBranch
    ? [currentBranch.color]
    : ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"];

  // Order distribution for pie
  const pieData = displayBranches.map((b) => ({
    name: b.name,
    value: b.orders,
    color: b.color,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isAllBranches ? "Franchise Overview" : `${currentBranch!.name} — Overview`}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">June 2026 · Last 30 days</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(isAllBranches ? kpis.totalRevenue : (currentBranch?.revenue ?? 0))}
          growth={kpis.revenueGrowth}
          icon={<DollarSign className="h-5 w-5 text-white" />}
          color="bg-gradient-to-br from-emerald-500 to-green-600"
        />
        <KpiCard
          title="Total Orders"
          value={(isAllBranches ? kpis.totalOrders : (currentBranch?.orders ?? 0)).toLocaleString()}
          growth={kpis.ordersGrowth}
          icon={<ShoppingCart className="h-5 w-5 text-white" />}
          color="bg-gradient-to-br from-blue-500 to-indigo-600"
        />
        <KpiCard
          title={isAllBranches ? "Active Branches" : "Profit Margin"}
          value={
            isAllBranches
              ? `${kpis.activeBranches}/${kpis.totalBranches}`
              : `${currentBranch?.profitMargin ?? 0}%`
          }
          icon={<Store className="h-5 w-5 text-white" />}
          color="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <KpiCard
          title="Avg Rating"
          value={`${isAllBranches ? kpis.avgRating : (currentBranch?.rating ?? 0)}/5`}
          icon={<Star className="h-5 w-5 text-white" />}
          color="bg-gradient-to-br from-amber-500 to-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Revenue Trend — Last 7 Days
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              {trendKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={trendColors[i]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Order Distribution
          </h2>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v} orders`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-3">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                  <span className="text-gray-600 dark:text-gray-400 truncate max-w-[90px]">
                    {entry.name}
                  </span>
                </div>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Branch Performance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Branch Performance</h2>
          <button
            onClick={() => navigate("/franchise/branches")}
            className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Branch</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Orders</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Profit %</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Rating</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {displayBranches.map((branch) => (
                <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: branch.color }} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{branch.name}</p>
                        <p className="text-xs text-gray-400">{branch.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-gray-800 dark:text-gray-200">
                    {formatCurrency(branch.revenue)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {branch.orders.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right hidden md:table-cell">
                    <span className={cn(
                      "text-xs font-semibold",
                      branch.profitMargin >= 30 ? "text-emerald-600" :
                      branch.profitMargin >= 25 ? "text-amber-600" : "text-red-500"
                    )}>
                      {branch.profitMargin}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                    <span className="flex items-center justify-end gap-1 text-amber-500 text-xs font-medium">
                      <Star className="h-3 w-3 fill-current" />{branch.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FranchiseDashboard;
