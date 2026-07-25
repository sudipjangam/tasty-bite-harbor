import React, { useState } from "react";
import { OrgRole } from "@/data/franchiseMockData";
import { useFranchise } from "@/contexts/FranchiseContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Crown, Shield, Eye, Mail, Trash2, Edit3, Check, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

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
  const { team, allBranches, orgRole, inviteTeamMember, updateMemberRole, removeTeamMember } = useFranchise();
  const { user } = useAuth();
  const { toast } = useToast();

  const isViewer = orgRole === "viewer";

  // Dialog controls
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Invite form states
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("admin");
  const [allBranchesAccess, setAllBranchesAccess] = useState(true);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form states
  const [editRole, setEditRole] = useState<OrgRole>("admin");
  const [editAllBranchesAccess, setEditAllBranchesAccess] = useState(true);
  const [editSelectedBranches, setEditSelectedBranches] = useState<string[]>([]);

  const handleOpenInvite = () => {
    if (isViewer) {
      toast({ title: "Access Denied", description: "Viewers cannot invite team members.", variant: "destructive" });
      return;
    }
    setInviteName("");
    setInviteEmail("");
    setInviteRole("admin");
    setAllBranchesAccess(true);
    setSelectedBranches([]);
    setIsInviteOpen(true);
  };

  const handleOpenEdit = (member: any) => {
    if (isViewer) {
      toast({ title: "Access Denied", description: "Viewers cannot edit member roles.", variant: "destructive" });
      return;
    }
    setSelectedMember(member);
    setEditRole(member.role);
    if (member.accessibleBranches === null) {
      setEditAllBranchesAccess(true);
      setEditSelectedBranches([]);
    } else {
      setEditAllBranchesAccess(false);
      setEditSelectedBranches(member.accessibleBranches);
    }
    setIsEditOpen(true);
  };

  const handleOpenRemove = (member: any) => {
    if (isViewer) {
      toast({ title: "Access Denied", description: "Viewers cannot remove members.", variant: "destructive" });
      return;
    }
    // Cannot remove owner or self
    if (member.role === "owner") {
      toast({ title: "Action Blocked", description: "Organization Owner cannot be removed.", variant: "destructive" });
      return;
    }
    if (member.email === user?.email) {
      toast({ title: "Action Blocked", description: "You cannot remove your own account.", variant: "destructive" });
      return;
    }
    setSelectedMember(member);
    setIsRemoveOpen(true);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast({ title: "Error", description: "Name and Email are required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const accessibleBranches = allBranchesAccess ? null : selectedBranches;
    const success = await inviteTeamMember({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      accessibleBranches
    });
    setIsSubmitting(false);

    if (success) {
      toast({ title: "🎉 Invitation Sent", description: `Invited ${inviteName} (${inviteEmail}) as ${inviteRole}.` });
      setIsInviteOpen(false);
    } else {
      toast({ title: "Error", description: "Failed to send invitation.", variant: "destructive" });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setIsSubmitting(true);
    const accessibleBranches = editAllBranchesAccess ? null : editSelectedBranches;
    const success = await updateMemberRole(selectedMember.id, editRole, accessibleBranches);
    setIsSubmitting(false);

    if (success) {
      toast({ title: "Role Updated", description: `Updated permissions for ${selectedMember.name}.` });
      setIsEditOpen(false);
      setSelectedMember(null);
    } else {
      toast({ title: "Error", description: "Failed to update member role.", variant: "destructive" });
    }
  };

  const handleRemoveSubmit = async () => {
    if (!selectedMember) return;
    setIsSubmitting(true);
    const success = await removeTeamMember(selectedMember.id);
    setIsSubmitting(false);

    if (success) {
      toast({ title: "Member Removed", description: `${selectedMember.name} removed from organization.` });
      setIsRemoveOpen(false);
      setSelectedMember(null);
    } else {
      toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" });
    }
  };

  const toggleBranchSelection = (branchId: string, currentSelected: string[], setFn: (vals: string[]) => void) => {
    if (currentSelected.includes(branchId)) {
      setFn(currentSelected.filter(id => id !== branchId));
    } else {
      setFn([...currentSelected, branchId]);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h1>
            {isViewer && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <Lock className="h-3 w-3" /> Read-Only (Viewer)
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Franchise-level roles · {team.length} members
          </p>
        </div>
        <Button
          onClick={handleOpenInvite}
          disabled={isViewer}
          className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white w-full sm:w-auto disabled:opacity-50"
        >
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
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Organization Directory</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {team.map((member) => {
            const rc = roleConfig[member.role] || roleConfig.viewer;
            const isRegionalManager = member.role === "admin" && member.accessibleBranches !== null;
            const displayLabel = isRegionalManager ? "Regional Manager" : rc.label;
            const displayClassName = isRegionalManager
              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
              : rc.className;
            const displayIcon = rc.icon;

            const branchNames = member.accessibleBranches === null
              ? "All Branches"
              : allBranches
                  .filter((b) => member.accessibleBranches!.includes(b.id))
                  .map((b) => b.name)
                  .join(", ") || "No branches assigned";

            const isSelf = member.email === user?.email;
            const isOwner = member.role === "owner";

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
                    {isSelf && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 font-semibold">
                        You
                      </span>
                    )}
                    <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold", displayClassName)}>
                      {displayIcon} {displayLabel}
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
                {!isViewer && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(member)}
                      className="text-xs h-8 px-2.5 gap-1"
                    >
                      <Edit3 className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isOwner || isSelf}
                      onClick={() => handleOpenRemove(member)}
                      className="text-xs h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20 disabled:opacity-40 gap-1"
                      title={isOwner ? "Cannot remove owner" : isSelf ? "Cannot remove self" : "Remove member"}
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── DIALOG 1: INVITE MEMBER ─── */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Invite Team Member</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Grant organization access and assign accessible branches.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="e.g. rahul@tastybite.com"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Organization Role *</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="admin">Admin / Regional Manager</option>
                <option value="viewer">Viewer (Read Only)</option>
              </select>
            </div>

            {/* Branch Access Assignment */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allBranchesAccess}
                  onChange={(e) => setAllBranchesAccess(e.target.checked)}
                  className="accent-violet-600 rounded"
                />
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Grant Access to All Branches</span>
              </label>

              {!allBranchesAccess && (
                <div className="space-y-1.5 pl-5 pt-1">
                  <p className="text-[11px] text-gray-400">Select specific branches:</p>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {allBranches.map((branch) => (
                      <label key={branch.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBranches.includes(branch.id)}
                          onChange={() => toggleBranchSelection(branch.id, selectedBranches, setSelectedBranches)}
                          className="accent-violet-600 rounded"
                        />
                        <span className="truncate">{branch.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isSubmitting} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium">
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 2: EDIT MEMBER ROLE & ACCESS ─── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Member Role & Access</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Update {selectedMember?.name}'s organization permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Organization Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as OrgRole)}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="owner">Owner (Full Access)</option>
                <option value="admin">Admin / Manager</option>
                <option value="viewer">Viewer (Read Only)</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editAllBranchesAccess}
                  onChange={(e) => setEditAllBranchesAccess(e.target.checked)}
                  className="accent-violet-600 rounded"
                />
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Access to All Branches</span>
              </label>

              {!editAllBranchesAccess && (
                <div className="space-y-1.5 pl-5 pt-1">
                  <p className="text-[11px] text-gray-400">Select specific branches:</p>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {allBranches.map((branch) => (
                      <label key={branch.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editSelectedBranches.includes(branch.id)}
                          onChange={() => toggleBranchSelection(branch.id, editSelectedBranches, setEditSelectedBranches)}
                          className="accent-violet-600 rounded"
                        />
                        <span className="truncate">{branch.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isSubmitting} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 3: REMOVE MEMBER CONFIRMATION ─── */}
      <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <DialogContent className="max-w-sm p-6 rounded-2xl bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600">Remove Team Member?</DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Are you sure you want to remove <strong className="text-gray-800 dark:text-gray-200">{selectedMember?.name}</strong> from the organization? They will lose access to all assigned branches.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 pt-3">
            <Button variant="outline" onClick={() => setIsRemoveOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleRemoveSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              {isSubmitting ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagement;
