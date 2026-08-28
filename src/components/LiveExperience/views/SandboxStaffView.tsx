import React from "react";
import { Users, ShieldCheck, Lock, Check, Key, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const SandboxStaffView: React.FC = () => {
  const roles = [
    {
      name: "Owner / Admin",
      color: "bg-purple-600 text-white",
      permissions: ["View P&L & Net Profit", "Change Menu & Pricing", "86 Stock Kill Switch", "POS Billing & Discounts", "Staff Shift Approval"],
    },
    {
      name: "Floor Manager",
      color: "bg-blue-600 text-white",
      permissions: ["POS Billing & Discounts", "Table Management", "Issue NC Orders", "Kitchen Priority Bump"],
    },
    {
      name: "Head Chef / KDS",
      color: "bg-amber-600 text-white",
      permissions: ["KDS Queue Progression", "Item 86 Out of Stock", "Station Routing", "Print KOT Slips"],
    },
    {
      name: "Waiter / Captain",
      color: "bg-emerald-600 text-white",
      permissions: ["Take Table Orders", "Punch KOT", "Request Bill", "Self Clock-In / Clock-Out"],
    },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-indigo-600" />
          Staff Roles & Granular Row-Level Security (RLS)
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enforce strict permission boundaries so staff only see what their role allows (Zero revenue leakage)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {roles.map((role) => (
          <div
            key={role.name}
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                {role.name}
              </h3>
              <Badge className={`text-xs font-bold ${role.color}`}>{role.name}</Badge>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Granted Privileges
              </span>
              <div className="space-y-1.5">
                {role.permissions.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3" />
                    </div>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
