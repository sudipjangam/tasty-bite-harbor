import React from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Store,
  Star,
  DollarSign,
  ArrowRight,
  Users,
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
  const { 
    currentBranch, 
    allBranches, 
    isAllBranches, 
    kpis, 
    revenueTrend, 
    formatCurrency,
    staff,
    demoMode
  } = useFranchise();
  const navigate = useNavigate();

  // If a specific branch is selected, show that branch's data only
  const displayBranches = currentBranch ? [currentBranch] : allBranches;

  // Revenue trend filtered by branch
  // Keys in revenueTrend are always first-word-lowercase of branch name
  const branchKey = (name: string) => name.split(" ")[0].toLowerCase();

  const trendData = revenueTrend.map((d) => {
    if (!currentBranch) return d;
    const key = branchKey(currentBranch.name) as keyof typeof d;
    // Re-key the data under the display name for Recharts
    return { date: d.date, [currentBranch.name]: d[key] ?? 0 };
  });

  // In demo mode the context emits fixed keys "mumbai","pune"... so use them;
  // in live mode derive from allBranches (same algorithm as context uses)
  const trendKeys = currentBranch
    ? [currentBranch.name]
    : demoMode
    ? ["mumbai", "pune", "nashik", "nagpur"]
    : allBranches.map((b) => branchKey(b.name));

  const trendColors = currentBranch
    ? [currentBranch.color]
    : allBranches.length > 0
    ? allBranches.map((b) => b.color)
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
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })} · Last 30 days
        </p>
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

      {/* Staff Count and Attendance Widget */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Branch Staff & Attendance
            </h2>
          </div>
          <button
            onClick={() => navigate("/franchise/staff")}
            className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
          >
            Manage Staff <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayBranches.map((branch) => {
            const branchStaff = staff.filter((s) => s.branchId === branch.id);
            const total = branchStaff.length;
            const present = branchStaff.filter((s) => s.status === "present").length;
            const absent = branchStaff.filter((s) => s.status === "absent").length;
            const leave = branchStaff.filter((s) => s.status === "leave").length;
            const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;

            return (
              <div
                key={branch.id}
                className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: branch.color }}
                    />
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate max-w-[120px]">
                      {branch.name}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {presentPct}% Present
                  </span>
                </div>
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Total Staff</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{total}</span>
                  </div>
                  {/* Stacked percentage bar */}
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${total > 0 ? (present / total) * 100 : 0}%` }}
                      className="h-full bg-emerald-500"
                      title={`Present: ${present}`}
                    />
                    <div
                      style={{ width: `${total > 0 ? (absent / total) * 100 : 0}%` }}
                      className="h-full bg-red-500"
                      title={`Absent: ${absent}`}
                    />
                    <div
                      style={{ width: `${total > 0 ? (leave / total) * 100 : 0}%` }}
                      className="h-full bg-amber-500"
                      title={`On Leave: ${leave}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {present} P
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {absent} A
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {leave} L
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
