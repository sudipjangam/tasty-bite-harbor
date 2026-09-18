import React, { useState } from "react";
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
  Edit3,
  Sparkles,
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MockBranch } from "@/data/franchiseMockData";

// ─── KPI Card ────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string;
  growth?: number;
  icon: React.ReactNode;
  color: string;
  subtext?: string;
  onClick?: () => void;
}
const KpiCard: React.FC<KpiCardProps> = ({ title, value, growth, icon, color, subtext, onClick }) => (
  <div
    onClick={onClick}
    className={cn(
      "bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-4 transition-all relative overflow-hidden",
      onClick
        ? "cursor-pointer hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500/50 group hover:scale-[1.01]"
        : "hover:shadow-md"
    )}
  >
    <div className={cn("p-3 rounded-xl transition-transform", color, onClick && "group-hover:scale-105")}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{title}</p>
        {onClick && (
          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
            <Edit3 className="h-2.5 w-2.5" /> Edit
          </span>
        )}
      </div>
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
      {subtext && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
          {subtext}
        </p>
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
    demoMode,
    dateRange,
    setDateRange,
    updateBranchRating,
  } = useFranchise();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Rating Modal States
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState<string>("");
  const [ratingInput, setRatingInput] = useState<number>(4.8);
  const [reviewsInput, setReviewsInput] = useState<number>(50);
  const [isSavingRating, setIsSavingRating] = useState(false);

  const handleOpenRatingModal = (branch?: MockBranch) => {
    const target = branch || currentBranch || allBranches[0];
    if (!target) return;
    setTargetBranchId(target.id);
    setRatingInput(target.rating > 0 ? target.rating : 4.8);
    setReviewsInput(target.totalReviews || 0);
    setIsRatingModalOpen(true);
  };

  const handleSaveRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBranchId) return;
    setIsSavingRating(true);
    const target = allBranches.find(b => b.id === targetBranchId);
    const success = await updateBranchRating(targetBranchId, Number(ratingInput), Number(reviewsInput));
    setIsSavingRating(false);
    if (success) {
      toast({
        title: "Store Rating Updated",
        description: `Successfully set rating for ${target?.name || "branch"} to ${Number(ratingInput).toFixed(1)}/5 (${reviewsInput} reviews).`,
      });
      setIsRatingModalOpen(false);
    } else {
      toast({
        title: "Update Failed",
        description: "Failed to update branch rating in database.",
        variant: "destructive"
      });
    }
  };

  // If a specific branch is selected, show that branch's data only
  const displayBranches = currentBranch ? [currentBranch] : allBranches;

  // Revenue trend filtered by branch
  // Keys in revenueTrend are always first-word-lowercase of branch name
  const branchKey = (name: string) => name.split(" ")[0].toLowerCase();

  const trendData = revenueTrend.map((d) => {
    if (!currentBranch) return d;
    const val = d[currentBranch.name] ?? d[currentBranch.id] ?? d[branchKey(currentBranch.name)] ?? 0;
    // Re-key the data under the display name for Recharts
    return { date: d.date, [currentBranch.name]: val };
  });

  // In demo mode use fixed mock keys; in live mode use unique branch names
  const trendKeys = currentBranch
    ? [currentBranch.name]
    : demoMode
    ? ["mumbai", "pune", "nashik", "nagpur"]
    : allBranches.map((b) => b.name);

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
      {/* Page header with Date Range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAllBranches ? "Franchise Overview" : `${currentBranch!.name} — Overview`}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })} · {dateRange === "today" ? "Today" : dateRange === "7d" ? "Last 7 Days" : dateRange === "90d" ? "Last 90 Days" : "Last 30 Days"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 self-start sm:self-auto">
          {[
            { id: "today", label: "Today" },
            { id: "7d", label: "7 Days" },
            { id: "30d", label: "30 Days" },
            { id: "90d", label: "90 Days" },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDateRange(preset.id as any)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                dateRange === preset.id
                  ? "bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
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
        {(() => {
          const currentRating = isAllBranches ? kpis.avgRating : (currentBranch?.rating ?? 0);
          const currentReviews = isAllBranches
            ? allBranches.reduce((acc, b) => acc + (b.totalReviews || 0), 0)
            : (currentBranch?.totalReviews ?? 0);
          return (
            <KpiCard
              title="Avg Rating"
              value={currentRating > 0 ? `${currentRating.toFixed(1)}/5` : "No ratings"}
              subtext={
                currentRating > 0
                  ? `${currentReviews > 0 ? `${currentReviews} reviews · ` : ""}Tap to update`
                  : "Tap to set store rating"
              }
              icon={<Star className="h-5 w-5 text-white" />}
              color="bg-gradient-to-br from-amber-500 to-orange-500"
              onClick={() => handleOpenRatingModal(currentBranch || undefined)}
            />
          );
        })()}
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
            Revenue Trend — {dateRange === "today" ? "Today" : dateRange === "7d" ? "Last 7 Days" : dateRange === "90d" ? "Last 14 Days" : "Last 7 Days"}
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
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Action</th>
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
                    <button
                      onClick={() => handleOpenRatingModal(branch)}
                      title="Click to update store rating"
                      className="inline-flex items-center justify-end gap-1 text-amber-500 text-xs font-semibold hover:underline group cursor-pointer"
                    >
                      <Star className="h-3 w-3 fill-current group-hover:scale-110 transition-transform" />
                      {branch.rating > 0 ? `${branch.rating.toFixed(1)}/5` : "Set"}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      branch.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", branch.status === "active" ? "bg-emerald-500" : "bg-gray-400")} />
                      {branch.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => navigate(`/franchise/branches?edit=${branch.id}`)}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20 dark:hover:text-violet-400 transition-colors"
                    >
                      <Edit3 className="h-3 w-3" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── STORE RATING & REVIEWS MODAL ─── */}
      <Dialog open={isRatingModalOpen} onOpenChange={setIsRatingModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white relative">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Star className="h-5 w-5 fill-current text-amber-200" /> Update Store Rating
            </h2>
            <p className="text-xs text-amber-100 mt-1">
              Set customer review scores and ratings for your franchise stores.
            </p>
          </div>

          <form onSubmit={handleSaveRating} className="p-6 space-y-4 bg-white dark:bg-gray-900">
            {allBranches.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Select Branch
                </label>
                <select
                  value={targetBranchId}
                  onChange={(e) => {
                    setTargetBranchId(e.target.value);
                    const b = allBranches.find(item => item.id === e.target.value);
                    if (b) {
                      setRatingInput(b.rating > 0 ? b.rating : 4.8);
                      setReviewsInput(b.totalReviews || 0);
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {allBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Quick Star Rating (1 - 5 Stars)
              </label>
              <div className="flex items-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingInput(star)}
                    className={cn(
                      "p-2 rounded-xl border transition-all flex items-center justify-center",
                      ratingInput >= star
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-500 shadow-sm"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 hover:text-amber-400"
                    )}
                  >
                    <Star className={cn("h-5 w-5", ratingInput >= star && "fill-current")} />
                  </button>
                ))}
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 ml-2">
                  {Number(ratingInput).toFixed(1)} / 5.0
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Exact Score (0.0 - 5.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  required
                  value={ratingInput}
                  onChange={(e) => setRatingInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Total Reviews Count
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={reviewsInput}
                  onChange={(e) => setReviewsInput(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 96"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              💡 Store ratings synchronize with branch receipts, digital QR menus, and Google / Zomato aggregated public scores.
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRatingModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingRating}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium text-xs"
              >
                {isSavingRating ? "Saving Rating..." : "Save Rating"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FranchiseDashboard;
