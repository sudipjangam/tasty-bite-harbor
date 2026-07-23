import React, { useState } from "react";
import { MockBranch } from "@/data/franchiseMockData";
import { useFranchise } from "@/contexts/FranchiseContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, MapPin, Phone, User, Star, ShoppingCart,
  TrendingUp, Edit3, Eye, Crown, MoreHorizontal,
  Mail, ShieldAlert, Store, AlertCircle, Sparkles
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// PREDEFINED PALETTE FOR BRANCHES
const PRESET_COLORS = [
  { hex: "#3b82f6", label: "Ocean Blue" },
  { hex: "#10b981", label: "Emerald Green" },
  { hex: "#8b5cf6", label: "Royal Violet" },
  { hex: "#f59e0b", label: "Amber Sun" },
  { hex: "#ef4444", label: "Crimson Red" },
  { hex: "#ec4899", label: "Hot Pink" }
];

interface BranchCardProps {
  branch: MockBranch;
  onEdit: (b: MockBranch) => void;
  onView: (b: MockBranch) => void;
}

const BranchCard: React.FC<BranchCardProps> = ({ branch, onEdit, onView }) => {
  const { formatCurrency } = useFranchise();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col justify-between">
      <div>
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
              <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{branch.address}, {branch.city}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <User className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>{branch.manager}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>{branch.phone}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Revenue</p>
              <p className="text-xs font-bold text-gray-800 dark:text-white">
                {formatCurrency(branch.revenue)}
              </p>
            </div>
            <div className="text-center p-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Orders</p>
              <p className="text-xs font-bold text-gray-800 dark:text-white">
                {branch.orders.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Rating</p>
              <p className="text-xs font-bold text-amber-500 flex items-center justify-center gap-0.5">
                <Star className="h-3 w-3 fill-current" />{branch.rating}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-5 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(branch)}
          className="flex-1 gap-1.5 text-xs h-8 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <Edit3 className="h-3 w-3" /> Edit
        </Button>
        <Button
          size="sm"
          onClick={() => onView(branch)}
          className="flex-1 gap-1.5 text-xs h-8 text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: branch.color, borderColor: branch.color }}
        >
          <Eye className="h-3 w-3" /> View
        </Button>
      </div>
    </div>
  );
};

const BranchManagement: React.FC = () => {
  const { allBranches, addBranch, updateBranch, formatCurrency, demoMode } = useFranchise();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  // Dialog open controls
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<MockBranch | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formManager, setFormManager] = useState("");
  const [formManagerPhone, setFormManagerPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formColor, setFormColor] = useState("#3b82f6");
  const [formIsHq, setFormIsHq] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setFormName("");
    setFormCode("");
    setFormManager("");
    setFormManagerPhone("");
    setFormAddress("");
    setFormCity("");
    setFormPhone("");
    setFormEmail("");
    setFormColor("#3b82f6");
    setFormIsHq(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (branch: MockBranch) => {
    setSelectedBranch(branch);
    setFormName(branch.name);
    setFormCode(branch.code);
    setFormManager(branch.manager);
    setFormManagerPhone(branch.managerPhone || "");
    setFormAddress(branch.address);
    setFormCity(branch.city);
    setFormPhone(branch.phone);
    setFormEmail(branch.email);
    setFormColor(branch.color);
    setFormIsHq(branch.isHeadquarters);
    setIsEditOpen(true);
  };

  const handleOpenView = (branch: MockBranch) => {
    setSelectedBranch(branch);
    setIsViewOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      toast({ title: "Error", description: "Name and Code are required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const success = await addBranch({
      name: formName,
      code: formCode,
      manager: formManager,
      managerPhone: formManagerPhone,
      address: formAddress,
      city: formCity,
      phone: formPhone,
      email: formEmail,
      color: formColor,
      isHeadquarters: formIsHq
    });
    setIsSaving(false);

    if (success) {
      toast({
        title: "✨ Branch Created",
        description: `Successfully onboarded ${formName} (${formCode})!`,
      });
      setIsAddOpen(false);
      resetForm();
    } else {
      toast({ title: "Database Error", description: "Failed to create branch on Supabase", variant: "destructive" });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    setIsSaving(true);
    const success = await updateBranch(selectedBranch.id, {
      name: formName,
      code: formCode,
      manager: formManager,
      managerPhone: formManagerPhone,
      address: formAddress,
      city: formCity,
      phone: formPhone,
      email: formEmail,
      color: formColor,
      isHeadquarters: formIsHq
    });
    setIsSaving(false);

    if (success) {
      toast({
        title: "✍️ Branch Updated",
        description: `Successfully saved changes for ${formName}!`,
      });
      setIsEditOpen(false);
      setSelectedBranch(null);
    } else {
      toast({ title: "Database Error", description: "Failed to update branch on Supabase", variant: "destructive" });
    }
  };

  const filtered = allBranches.filter(
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
            {allBranches.length} branches · {allBranches.filter((b) => b.status === "active").length} active
          </p>
        </div>
        <Button 
          onClick={handleOpenAdd}
          className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 w-full sm:w-auto hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
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
          <BranchCard 
            key={branch.id} 
            branch={branch} 
            onEdit={handleOpenEdit}
            onView={handleOpenView}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No branches found</p>
        </div>
      )}

      {/* ─── DIALOG 1: ADD BRANCH ─── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <div className="p-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white relative">
            <div className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 transition-colors p-1.5 rounded-full cursor-pointer">
              <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Store className="h-5 w-5 text-purple-200" /> Onboard New Branch
            </h2>
            <p className="text-xs text-purple-100 mt-1">Configure layout codes and base manager parameters.</p>
          </div>

          <form onSubmit={handleAddSubmit} className="p-6 space-y-4 bg-white dark:bg-gray-900">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Pune Express"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Branch Code *</label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. BR-03"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Manager Name</label>
                <input
                  type="text"
                  value={formManager}
                  onChange={(e) => setFormManager(e.target.value)}
                  placeholder="e.g. Amit Patil"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Manager Phone</label>
                <input
                  type="tel"
                  value={formManagerPhone}
                  onChange={(e) => setFormManagerPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Store Phone</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 020-56789"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Store Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. pune@tastybite.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Road name, building"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">City</label>
                <input
                  type="text"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="e.g. Pune"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Accent Color picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Accent Theme Color</label>
              <div className="flex gap-2.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setFormColor(c.hex)}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all border-2 relative",
                      formColor === c.hex ? "border-slate-800 dark:border-white scale-110 shadow-md" : "border-transparent"
                    )}
                    style={{ backgroundColor: c.hex }}
                  >
                    {formColor === c.hex && (
                      <span className="absolute inset-0 m-auto w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* HQ Checkbox */}
            <label className="flex items-center gap-2.5 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsHq}
                onChange={(e) => setFormIsHq(e.target.checked)}
                className="accent-violet-600 rounded"
              />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Set as Headquarters (HQ) Branch</span>
            </label>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium">
                {isSaving ? "Creating..." : "Onboard Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 2: EDIT BRANCH ─── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <div className="p-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white relative">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-purple-200" /> Edit Branch Details
            </h2>
            <p className="text-xs text-purple-100 mt-1">Modify branch identity and parameters.</p>
          </div>

          <form onSubmit={handleEditSubmit} className="p-6 space-y-4 bg-white dark:bg-gray-900">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Branch Code *</label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Manager Name</label>
                <input
                  type="text"
                  value={formManager}
                  onChange={(e) => setFormManager(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Manager Phone</label>
                <input
                  type="tel"
                  value={formManagerPhone}
                  onChange={(e) => setFormManagerPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Store Phone</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Store Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">City</label>
                <input
                  type="text"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Accent Theme Color</label>
              <div className="flex gap-2.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setFormColor(c.hex)}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all border-2 relative",
                      formColor === c.hex ? "border-slate-800 dark:border-white scale-110 shadow-md" : "border-transparent"
                    )}
                    style={{ backgroundColor: c.hex }}
                  >
                    {formColor === c.hex && (
                      <span className="absolute inset-0 m-auto w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsHq}
                onChange={(e) => setFormIsHq(e.target.checked)}
                className="accent-violet-600 rounded"
              />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Set as Headquarters (HQ) Branch</span>
            </label>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium">
                {isSaving ? "Saving Changes..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 3: VIEW BRANCH ─── */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          {selectedBranch && (
            <div className="bg-white dark:bg-gray-900">
              {/* Colored Gradient Top Strip */}
              <div 
                className="px-6 py-8 text-white relative flex flex-col justify-end min-h-[140px]"
                style={{ background: `linear-gradient(135deg, ${selectedBranch.color}dd, ${selectedBranch.color})` }}
              >
                <div className="absolute top-4 right-4 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold border border-white/20">
                  {selectedBranch.status}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/25">
                    <Store className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 drop-shadow-sm">
                      {selectedBranch.name}
                      {selectedBranch.isHeadquarters && (
                        <Crown className="h-4 w-4 text-amber-300 fill-amber-300 shrink-0" />
                      )}
                    </h2>
                    <p className="text-xs text-white/80 font-mono tracking-wider mt-0.5">{selectedBranch.code}</p>
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="p-6 grid grid-cols-3 gap-3 border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 shadow-sm text-center">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Gross Revenue</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(selectedBranch.revenue)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 shadow-sm text-center">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Order Volume</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                    {selectedBranch.orders.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 shadow-sm text-center">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Profit Margin</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center justify-center gap-0.5">
                    <TrendingUp className="h-3.5 w-3.5" /> {selectedBranch.profitMargin}%
                  </p>
                </div>
              </div>

              {/* Branch details body */}
              <div className="p-6 space-y-5">
                {/* Manager profile card */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-gray-100 dark:border-gray-800/80 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center font-bold text-violet-600 dark:text-violet-400">
                    {selectedBranch.manager.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Store Manager</h3>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{selectedBranch.manager}</p>
                    {selectedBranch.managerPhone && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {selectedBranch.managerPhone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Operational Contacts</h4>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>Phone: {selectedBranch.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>Email: {selectedBranch.email}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono">Location Address</h4>
                    <div className="mt-2 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                      <span>{selectedBranch.address}, {selectedBranch.city}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Launched On</h4>
                      <p className="text-xs font-semibold text-gray-800 dark:text-white mt-1">{selectedBranch.openedDate}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Rating Score</h4>
                      <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" /> {selectedBranch.rating} / 5.0
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-6 pt-0">
                <Button 
                  onClick={() => {
                    setIsViewOpen(false);
                    handleOpenEdit(selectedBranch);
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  Edit Branch Details
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchManagement;
