import React, { useState } from "react";
import { MOCK_BRANCHES, formatCurrency, MockBranch } from "@/data/franchiseMockData";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, MapPin, Phone, User, Star, ShoppingCart,
  TrendingUp, Edit3, Eye, Crown, MoreHorizontal,
} from "lucide-react";

const BranchCard: React.FC<{ branch: MockBranch }> = ({ branch }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group overflow-hidden">
    {/* Color strip top */}
    <div className="h-1.5 w-full" style={{ background: branch.color }} />

    <div className="p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">{branch.name}</h3>
            {branch.isHeadquarters && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Crown className="h-2.5 w-2.5" /> HQ
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{branch.code}</span>
        </div>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {branch.status === "active" ? "Active" : branch.status}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{branch.address}, {branch.city}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span>{branch.manager}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span>{branch.phone}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Revenue</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">
            {formatCurrency(branch.revenue)}
          </p>
        </div>
        <div className="text-center p-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Orders</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">
            {branch.orders.toLocaleString()}
          </p>
        </div>
        <div className="text-center p-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Rating</p>
          <p className="text-sm font-bold text-amber-500 flex items-center justify-center gap-0.5">
            <Star className="h-3 w-3 fill-current" />{branch.rating}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs h-8"
        >
          <Edit3 className="h-3 w-3" /> Edit
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-1.5 text-xs h-8"
          style={{ background: branch.color, borderColor: branch.color }}
        >
          <Eye className="h-3 w-3" /> View
        </Button>
      </div>
    </div>
  </div>
);

const BranchManagement: React.FC = () => {
  const [search, setSearch] = useState("");
  const filtered = MOCK_BRANCHES.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branch Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {MOCK_BRANCHES.length} branches · {MOCK_BRANCHES.filter((b) => b.status === "active").length} active
          </p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Add Branch
        </Button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search branches by name or city..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />

      {/* Branch grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {filtered.map((branch) => (
          <BranchCard key={branch.id} branch={branch} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No branches found</p>
        </div>
      )}
    </div>
  );
};

export default BranchManagement;
