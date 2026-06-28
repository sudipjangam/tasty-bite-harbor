import React, { useState } from "react";
import { MOCK_TEAM, MOCK_BRANCHES, OrgRole } from "@/data/franchiseMockData";
import { useFranchise } from "@/contexts/FranchiseContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Crown, Shield, Eye, Mail } from "lucide-react";

const roleConfig: Record<OrgRole, { label: string; icon: React.ReactNode; className: string }> = {
  owner: {
    label: "Owner",
    icon: <Crown className="h-3 w-3" />,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  admin: {
    label: "Admin",
    icon: <Shield className="h-3 w-3" />,
    className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
  viewer: {
    label: "Viewer",
    icon: <Eye className="h-3 w-3" />,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

const TeamManagement: React.FC = () => {
  const { allBranches } = useFranchise();

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Franchise-level roles · {MOCK_TEAM.length} members
          </p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white w-full sm:w-auto">
          <UserPlus className="h-4 w-4" /> Invite Member
        </Button>
      </div>

      {/* Role explanation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.entries(roleConfig) as [OrgRole, typeof roleConfig[OrgRole]][]).map(([role, cfg]) => (
          <div key={role} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2", cfg.className)}>
              {cfg.icon} {cfg.label}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {role === "owner" && "Full access to all branches and org settings"}
              {role === "admin" && "Manage assigned branches, cannot change org settings"}
              {role === "viewer" && "Read-only access to assigned branches"}
            </p>
          </div>
        ))}
      </div>

      {/* Members list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Members</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {MOCK_TEAM.map((member) => {
            const rc = roleConfig[member.role];
            const branchNames = member.accessibleBranches === null
              ? "All Branches"
              : MOCK_BRANCHES
                  .filter((b) => member.accessibleBranches!.includes(b.id))
                  .map((b) => b.name)
                  .join(", ");

            return (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {member.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{member.name}</p>
                    <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold", rc.className)}>
                      {rc.icon} {rc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    Access: <span className="font-medium">{branchNames}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2.5">
                    Edit
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;
