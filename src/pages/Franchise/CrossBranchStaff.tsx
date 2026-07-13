import React, { useState } from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import { cn } from "@/lib/utils";
import { Users, Phone, UserCheck, Calendar, RefreshCw, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  present: { label: "Present", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  absent: { label: "Absent", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  leave: { label: "On Leave", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

const CrossBranchStaff: React.FC = () => {
  const { currentBranch, allBranches, staff, payroll } = useFranchise();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"attendance" | "roaming" | "payroll">("attendance");
  const [branchFilter, setBranchFilter] = useState("all");

  // Roaming state — initialise from first real staff member
  const [selectedStaff, setSelectedStaff] = useState(() => staff[0]?.id || "");
  const [primaryBranch, setPrimaryBranch] = useState(() => staff[0]?.branchId || allBranches[0]?.id || "");
  const [secondaryBranches, setSecondaryBranches] = useState<string[]>([]);

  const filtered = staff.filter((s) =>
    currentBranch
      ? s.branchId === currentBranch.id
      : branchFilter === "all" || s.branchId === branchFilter
  );

  const present = filtered.filter((s) => s.status === "present").length;
  const absent = filtered.filter((s) => s.status === "absent").length;
  const onLeave = filtered.filter((s) => s.status === "leave").length;

  const handleToggleSecondary = (bId: string) => {
    if (secondaryBranches.includes(bId)) {
      setSecondaryBranches(secondaryBranches.filter(id => id !== bId));
    } else {
      setSecondaryBranches([...secondaryBranches, bId]);
    }
  };

  const handleUpdateRoster = (e: React.FormEvent) => {
    e.preventDefault();
    const staffMember = staff.find(s => s.id === selectedStaff);
    const secNames = allBranches.filter(b => secondaryBranches.includes(b.id)).map(b => b.name).join(", ");
    toast({
      title: "Roster Configured",
      description: `Assigned roaming access for ${staffMember?.name} to: ${secNames || "None"}.`,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Attendance tracking &amp; roaming employee rosters</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("attendance")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "attendance"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <Calendar className="h-4 w-4" /> Daily Attendance
        </button>
        <button
          onClick={() => setActiveTab("roaming")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "roaming"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <RefreshCw className="h-4 w-4" /> Roaming Staff (Cross-Branch)
        </button>
        <button
          onClick={() => setActiveTab("payroll")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "payroll"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <DollarSign className="h-4 w-4" /> Payroll (Read-Only)
        </button>
      </div>

      {/* ── Tab 1: Attendance ── */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Present", count: present, color: "text-emerald-600" },
              { label: "Absent", count: absent, color: "text-red-500" },
              { label: "On Leave", count: onLeave, color: "text-amber-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                <p className={cn("text-2xl font-bold", s.color)}>{s.count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {!currentBranch && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All Branches</option>
              {allBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((s) => {
              const sc = statusConfig[s.status];
              const branch = allBranches.find((b) => b.id === s.branchId);
              return (
                <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{s.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.role}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: branch?.color }} />
                      <span className="text-[10px] text-gray-400 truncate">{s.branchName}</span>
                    </div>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0", sc.className)}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab 2: Roaming Staff ── */}
      {activeTab === "roaming" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 max-w-xl">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">Configure Cross-Branch Access</h2>
          <p className="text-xs text-gray-500 mb-4">Allow chefs, supervisors, or managers to operate/log into POS screens across multiple branches.</p>

          <form onSubmit={handleUpdateRoster} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select Employee</label>
              <select
                value={selectedStaff}
                onChange={(e) => {
                  setSelectedStaff(e.target.value);
                  const staffObj = staff.find(s => s.id === e.target.value);
                  if (staffObj) setPrimaryBranch(staffObj.branchId);
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
              >
                {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role} - Primary: {s.branchName})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Authorized Secondary Locations</label>
              <div className="space-y-2">
                {allBranches.map((b) => {
                  const isPrimary = b.id === primaryBranch;
                  const isChecked = secondaryBranches.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl border text-sm transition-colors",
                        isPrimary
                          ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-900"
                          : "cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <input
                        type="checkbox"
                        disabled={isPrimary}
                        checked={isPrimary || isChecked}
                        onChange={() => handleToggleSecondary(b.id)}
                        className="accent-violet-600"
                      />
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.color }} />
                        <span className="font-semibold text-gray-900 dark:text-white text-xs">{b.name}</span>
                        {isPrimary && <span className="text-[10px] text-gray-400 font-normal">(Primary Base)</span>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white">
              Save Roaming Permissions
            </Button>
          </form>
        </div>
      )}

      {/* ── Tab 3: Payroll (Read-Only) ── */}
      {activeTab === "payroll" && (
        <div className="space-y-4">
          {/* Header & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {!currentBranch && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Branches</option>
                {allBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/40">
              ⚠️ <strong>Read-Only View:</strong> Payroll updates must be configured at individual branch terminals.
            </div>
          </div>

          {/* Cards Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Base Salary</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                ₹{payroll.filter(p => currentBranch ? p.branchId === currentBranch.id : branchFilter === "all" || p.branchId === branchFilter).reduce((sum, p) => sum + p.baseSalary, 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Deductions</p>
              <p className="text-xl font-bold text-red-500 mt-1">
                ₹{payroll.filter(p => currentBranch ? p.branchId === currentBranch.id : branchFilter === "all" || p.branchId === branchFilter).reduce((sum, p) => sum + p.deductions, 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Net Payroll Cost</p>
              <p className="text-xl font-bold text-violet-600 dark:text-violet-400 mt-1">
                ₹{payroll.filter(p => currentBranch ? p.branchId === currentBranch.id : branchFilter === "all" || p.branchId === branchFilter).reduce((sum, p) => sum + p.netPay, 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3">Period</th>
                    <th className="px-5 py-3 text-right">Base Salary</th>
                    <th className="px-5 py-3 text-right">Deductions</th>
                    <th className="px-5 py-3 text-right">Net Pay</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs text-gray-700 dark:text-gray-300">
                  {payroll
                    .filter(p => currentBranch ? p.branchId === currentBranch.id : branchFilter === "all" || p.branchId === branchFilter)
                    .map((p) => {
                      const branch = allBranches.find(b => b.id === p.branchId);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/30 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">{p.staffName}</td>
                          <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">{p.role}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: branch?.color }} />
                              <span>{p.branchName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">{p.payPeriod}</td>
                          <td className="px-5 py-3.5 text-right font-medium">₹{p.baseSalary.toLocaleString("en-IN")}</td>
                          <td className="px-5 py-3.5 text-right text-red-500 font-medium">-₹{p.deductions.toLocaleString("en-IN")}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-gray-900 dark:text-white">₹{p.netPay.toLocaleString("en-IN")}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Paid
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossBranchStaff;
