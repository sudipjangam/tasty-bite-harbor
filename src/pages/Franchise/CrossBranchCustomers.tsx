import React, { useState } from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import { cn } from "@/lib/utils";
import { Users, Search, Award, Star, Gift, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const tierConfig = {
  Silver: { className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  Gold: { className: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400" },
  Platinum: { className: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400" },
};

const CrossBranchCustomers: React.FC = () => {
  const { customers, allBranches } = useFranchise();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"customers" | "loyalty">("customers");
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  // Loyalty Settings State
  const [pointsRate, setPointsRate] = useState(5);
  const [goldMin, setGoldMin] = useState(300);
  const [goldDiscount, setGoldDiscount] = useState(10);
  const [platMin, setPlatMin] = useState(800);
  const [platDiscount, setPlatDiscount] = useState(15);
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()));

    const matchesTier = tierFilter === "all" || c.tier === tierFilter;

    return matchesSearch && matchesTier;
  });

  const handleSaveLoyalty = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLoyalty(true);
    setTimeout(() => {
      setSavingLoyalty(false);
      toast({
        title: "Loyalty Scheme Updated",
        description: "Chain-wide loyalty multipliers and tier structures have been saved successfully.",
      });
    }, 1000);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Loyalty</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Chain-wide shared customer profiles &amp; loyalty scheme settings
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("customers")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "customers"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <Users className="h-4 w-4" /> Shared Customers Directory
        </button>
        <button
          onClick={() => setActiveTab("loyalty")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "loyalty"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <Award className="h-4 w-4" /> Chain Loyalty Rules
        </button>
      </div>

      {/* Tab 1: Shared Customers */}
      {activeTab === "customers" && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers by name, phone, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-450 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 sm:w-48"
            >
              <option value="all">All Tiers</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Platinum">Platinum</option>
            </select>
          </div>

          {/* Directory Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <th className="px-5 py-3.5">Customer Name</th>
                    <th className="px-5 py-3.5">Contact Details</th>
                    <th className="px-5 py-3.5">Loyalty Points</th>
                    <th className="px-5 py-3.5">Visits</th>
                    <th className="px-5 py-3.5 text-right">Total Spent</th>
                    <th className="px-5 py-3.5">Locations Checked In</th>
                    <th className="px-5 py-3.5 text-center">Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs text-gray-700 dark:text-gray-300">
                  {filtered.map((c) => {
                    const tc = tierConfig[c.tier];
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/30 transition-colors">
                        <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{c.name}</td>
                        <td className="px-5 py-4">
                          <p className="font-mono">{c.phone}</p>
                          {c.email && <p className="text-[10px] text-gray-400 mt-0.5">{c.email}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            <span className="font-bold text-gray-950 dark:text-white">{c.loyaltyPoints} pts</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium">{c.totalVisits}</td>
                        <td className="px-5 py-4 text-right font-semibold">₹{c.totalSpent.toLocaleString("en-IN")}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {c.branchesVisited.map((code) => {
                              const br = allBranches.find(b => b.code === code.split("-")[0]);
                              return (
                                <span
                                  key={code}
                                  className="text-[9px] px-1.5 py-0.5 rounded font-medium text-white"
                                  style={{ background: br?.color || "#888" }}
                                >
                                  {code}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", tc.className)}>
                            {c.tier}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                        No customers match search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Loyalty Rules settings */}
      {activeTab === "loyalty" && (
        <form onSubmit={handleSaveLoyalty} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 max-w-xl space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-755">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <Gift className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Loyalty Rules &amp; Ratios</h2>
              <p className="text-xs text-gray-500">Configure point accumulation ratios and discount rewards for tiers.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Points Generation Rate</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={pointsRate}
                  onChange={(e) => setPointsRate(Number(e.target.value))}
                  className="w-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-semibold"
                />
                <span className="text-xs text-gray-500">loyalty points earned per every ₹100 spent.</span>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Tiers thresholds &amp; discounts</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Gold Tier Entry Points</label>
                  <input
                    type="number"
                    value={goldMin}
                    onChange={(e) => setGoldMin(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Gold Tier Discount (%)</label>
                  <input
                    type="number"
                    value={goldDiscount}
                    onChange={(e) => setGoldDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Platinum Tier Entry Points</label>
                  <input
                    type="number"
                    value={platMin}
                    onChange={(e) => setPlatMin(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Platinum Tier Discount (%)</label>
                  <input
                    type="number"
                    value={platDiscount}
                    onChange={(e) => setPlatDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={savingLoyalty} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white">
            <Save className="h-4 w-4 mr-2" />
            {savingLoyalty ? "Updating Rules..." : "Save Loyalty Scheme"}
          </Button>
        </form>
      )}
    </div>
  );
};

export default CrossBranchCustomers;
