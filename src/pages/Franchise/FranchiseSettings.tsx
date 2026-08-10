import React, { useState, useEffect } from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Utensils,
  CreditCard,
  Save,
  History,
  MessageSquare,
  Loader2,
  Trash2,
  Upload,
  ImagePlus,
  Search,
  Calendar,
  Filter,
  Download,
  Shield,
  Tag,
  Plus,
  Edit,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/utils/imageUpload";

interface AuditLog {
  id: string;
  user: string;
  action: string;
  details: any;
  date: string;
  tableName?: string;
}

// Utility function to format raw key-value string/JSON into visual tags & key fields
const formatAuditDetails = (raw: any): { text: string; fields?: Array<{ label: string; value: string }> } => {
  if (!raw) return { text: "No additional details" };

  let dataObj: Record<string, any> | null = null;
  if (typeof raw === "object" && raw !== null) {
    dataObj = raw;
  } else if (typeof raw === "string") {
    // Check if raw string is a key-value string like "id: 9eb...; items: 1x Coffee...; total: 1230;"
    if (raw.includes(";") && raw.includes(":")) {
      const fields: Array<{ label: string; value: string }> = [];
      const parts = raw.split(";");
      for (const part of parts) {
        const colonIdx = part.indexOf(":");
        if (colonIdx > 0) {
          const key = part.slice(0, colonIdx).trim();
          const val = part.slice(colonIdx + 1).trim();
          if (
            val &&
            val !== "null" &&
            key !== "id" &&
            key !== "restaurant_id" &&
            key !== "created_at" &&
            key !== "updated_at" &&
            key !== "table_id" &&
            key !== "room_id" &&
            key !== "qr_session_id"
          ) {
            let cleanKey = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            if (key === "total" || key === "original_subtotal") {
              fields.push({ label: cleanKey, value: `₹${Number(val).toLocaleString("en-IN")}` });
            } else {
              fields.push({ label: cleanKey, value: val });
            }
          }
        }
      }
      if (fields.length > 0) {
        return { text: "", fields: fields.slice(0, 10) };
      }
      return { text: raw };
    }

    try {
      dataObj = JSON.parse(raw);
    } catch {
      return { text: raw };
    }
  }

  if (dataObj) {
    if (dataObj.action) return { text: dataObj.action };
    const fields: Array<{ label: string; value: string }> = [];
    Object.entries(dataObj).forEach(([k, v]) => {
      if (
        v !== null &&
        v !== undefined &&
        v !== "" &&
        k !== "id" &&
        k !== "restaurant_id" &&
        k !== "created_at" &&
        k !== "updated_at"
      ) {
        const cleanKey = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        fields.push({
          label: cleanKey,
          value: typeof v === "object" ? JSON.stringify(v) : String(v),
        });
      }
    });
    if (fields.length > 0) return { text: "", fields: fields.slice(0, 10) };
  }

  return { text: String(raw) };
};

const FranchiseSettings: React.FC = () => {
  const { org, allBranches, demoMode, team, refetch, orgRole, isFranchiseOwner } = useFranchise();
  const { toast } = useToast();
  const isAdminOrOwner = isFranchiseOwner || orgRole === "owner" || orgRole === "admin";

  const [activeTab, setActiveTab] = useState<"settings" | "audit">("settings");
  const [orgName, setOrgName] = useState(org.name);
  const [menuMode, setMenuMode] = useState(org.menuMode);
  const [saving, setSaving] = useState(false);

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(org.logoUrl || null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Audit log filter & pagination states
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days" | "30days">("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, actionFilter]);

  // WhatsApp digest config
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestRecipients, setDigestRecipients] = useState<string[]>([]);
  const [deliveryTime, setDeliveryTime] = useState("21:30");

  // Sync org details if context updates
  useEffect(() => {
    setOrgName(org.name);
    setMenuMode(org.menuMode);
    setLogoUrl(org.logoUrl || null);
  }, [org.name, org.menuMode, org.logoUrl]);

  // Initialise digest recipients to first 2 team members
  useEffect(() => {
    if (team.length > 0 && digestRecipients.length === 0) {
      setDigestRecipients(team.slice(0, 2).map((m) => m.id));
    }
  }, [team]);

  // Fetch audit logs
  useEffect(() => {
    if (activeTab !== "audit") return;

    if (demoMode) {
      setAuditLogs([
        { id: "log-1", user: "Rajesh Kumar", action: "UPDATE", details: "items: 1x Paneer Tikka @280; status: completed; total: 280", date: "2026-06-28 11:34 PM" },
        { id: "log-2", user: "Sonal Mehta", action: "UPDATE", details: "role: Chef; accessible_branches: Pune Branch", date: "2026-06-28 09:12 PM" },
        { id: "log-3", user: "Rajesh Kumar", action: "INSERT", details: "item: Basmati Rice; quantity: 15kg; source: Mumbai HQ; destination: Nashik Branch", date: "2026-06-28 04:45 PM" },
        { id: "log-4", user: "Rajesh Kumar", action: "SETTINGS", details: "menu_mode: Master Menu; updated_by: Rajesh Kumar", date: "2026-06-28 10:20 AM" },
      ]);
      return;
    }

    setLoadingLogs(true);
    const branchIds = (allBranches || []).map((b) => b.id).filter(Boolean);
    const targetIds = Array.from(new Set([org.id, ...branchIds].filter(Boolean)));

    const fetchLogs = async () => {
      try {
        let query = supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (targetIds.length > 0) {
          query = query.or(`restaurant_id.in.(${targetIds.join(",")}),record_id.eq.${org.id}`);
        } else if (org.id) {
          query = query.or(`restaurant_id.eq.${org.id},record_id.eq.${org.id}`);
        }

        // Apply date filter at query level
        const now = new Date();
        if (dateFilter === "today") {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          query = query.gte("created_at", start);
        } else if (dateFilter === "7days") {
          const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("created_at", start);
        } else if (dateFilter === "30days") {
          const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("created_at", start);
        }

        const { data: logsData, error: logsError } = await query;
        if (logsError) throw logsError;

        const userIds = Array.from(new Set((logsData || []).map((l: any) => l.user_id).filter(Boolean)));
        let profileMap: Record<string, string> = {};

        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", userIds);

          if (profilesData) {
            profilesData.forEach((p: any) => {
              const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim();
              profileMap[p.id] = fullName || "User";
            });
          }
        }

        const formatted = (logsData || []).map((r: any) => ({
          id: r.id,
          user: r.user_id ? profileMap[r.user_id] || "System User" : "System",
          action: r.action || "Activity Logged",
          details: r.details || r.description || r.new_values || r.table_name || "",
          date: r.created_at
            ? new Date(r.created_at).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          tableName: r.table_name || "",
        }));

        setAuditLogs(formatted);
      } catch (err) {
        console.error("Error fetching audit logs:", err);
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchLogs();
  }, [activeTab, demoMode, org.id, allBranches, dateFilter]);

  // Handle logo upload immediately on file select — identical pattern to Settings.tsx
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Logo must be under 2MB",
        variant: "destructive",
      });
      return;
    }

    setLogoUploading(true);
    try {
      // Upload via imageUpload utility (Supabase storage with Data URL fallback)
      const url = await uploadImage(file, { resize: false });

      // Persist directly to organizations DB if not demo mode
      if (!demoMode && org.id) {
        const { error: dbError } = await supabase
          .from("organizations")
          .update({ logo_url: url })
          .eq("id", org.id);
        if (dbError) throw dbError;

        // Log action in audit logs
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("audit_logs").insert({
          action: "SETTINGS",
          table_name: "organizations",
          record_id: org.id,
          user_id: user?.id || null,
          restaurant_id: org.id,
          new_values: { action: "Organization logo updated" },
        });

        refetch();
      }

      setLogoUrl(url);
      toast({
        title: "Logo uploaded! ✅",
        description: "Organization logo has been saved",
      });
    } catch (error: any) {
      console.error("Logo upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoRemove = async () => {
    setLogoUrl("");
    if (!demoMode && org.id) {
      await supabase
        .from("organizations")
        .update({ logo_url: null })
        .eq("id", org.id);

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_logs").insert({
        action: "SETTINGS",
        table_name: "organizations",
        record_id: org.id,
        user_id: user?.id || null,
        restaurant_id: org.id,
        new_values: { action: "Organization logo removed" },
      });

      refetch();
    }
    toast({
      title: "Logo removed",
      description: "Organization logo has been removed",
    });
  };

  const handleSave = async () => {
    if (!orgName.trim()) {
      toast({
        title: "Validation Error",
        description: "Organization name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Track changes for audit log
      const changes: string[] = [];
      if (orgName !== org.name) changes.push(`Name: "${org.name}" → "${orgName}"`);
      if (menuMode !== org.menuMode) changes.push(`Menu mode: "${org.menuMode}" → "${menuMode}"`);

      if (!demoMode && org.id) {
        const { error } = await supabase
          .from("organizations")
          .update({ name: orgName, menu_mode: menuMode, logo_url: logoUrl })
          .eq("id", org.id);
        if (error) throw error;

        // Insert audit log entry for changes
        if (changes.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("audit_logs").insert({
            action: "SETTINGS",
            table_name: "organizations",
            record_id: org.id,
            user_id: user?.id || null,
            restaurant_id: org.id,
            new_values: { action: changes.join("; ") },
          });
        }

        refetch();
      }

      toast({
        title: "Settings Saved",
        description: "Franchise settings updated successfully.",
      });
    } catch (err: any) {
      console.error("Save settings error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAuditLog = async (logId: string) => {
    if (!isAdminOrOwner) {
      toast({
        title: "Permission Denied",
        description: "Only admins or owners can delete audit logs.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!demoMode) {
        const { error } = await supabase
          .from("audit_logs")
          .delete()
          .eq("id", logId);

        if (error) throw error;
      }
      setAuditLogs((prev) => prev.filter((l) => l.id !== logId));
      toast({
        title: "Log Deleted",
        description: "Audit log entry removed.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete audit log.",
        variant: "destructive",
      });
    }
  };

  const handleSendTestDigest = () => {
    const recipientNames = team
      .filter((m) => digestRecipients.includes(m.id))
      .map((m) => m.name)
      .join(", ");
    toast({
      title: "Test Digest Sent",
      description: `Dispatched daily performance summary to: ${recipientNames || "No recipients"} via WhatsApp.`,
    });
  };

  const toggleRecipient = (id: string) => {
    setDigestRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  // Filter logs in memory based on search and action
  const filteredLogs = auditLogs.filter((log) => {
    const detailsStr = typeof log.details === "string" ? log.details : JSON.stringify(log.details || "");
    const matchesSearch =
      !searchTerm ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      detailsStr.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction =
      actionFilter === "all" || log.action.toUpperCase().includes(actionFilter.toUpperCase());

    return matchesSearch && matchesAction;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Action badge styling helper
  const getActionBadge = (action: string) => {
    const actUpper = action.toUpperCase();
    if (actUpper.includes("INSERT") || actUpper.includes("CREATE")) {
      return {
        bg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        icon: <Plus className="h-3 w-3" />,
        label: "INSERT",
      };
    }
    if (actUpper.includes("UPDATE") || actUpper.includes("EDIT")) {
      return {
        bg: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        icon: <Edit className="h-3 w-3" />,
        label: "UPDATE",
      };
    }
    if (actUpper.includes("DELETE") || actUpper.includes("REMOVE")) {
      return {
        bg: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
        icon: <Trash2 className="h-3 w-3" />,
        label: "DELETE",
      };
    }
    return {
      bg: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
      icon: <Shield className="h-3 w-3" />,
      label: action,
    };
  };

  // Export filtered logs to CSV
  const exportLogsCSV = () => {
    const headers = ["Timestamp", "Action", "Initiator", "Details"];
    const rows = filteredLogs.map((l) => [
      `"${l.date}"`,
      `"${l.action}"`,
      `"${l.user}"`,
      `"${typeof l.details === "string" ? l.details.replace(/"/g, '""') : JSON.stringify(l.details)}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `franchise-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings &amp; Logs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure franchise options and track activity logs</p>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "settings"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          General Settings
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "audit"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <History className="h-4 w-4" /> Audit Activity Logs
        </button>
      </div>

      {activeTab === "settings" ? (
        <div className="space-y-6 max-w-2xl">
          {/* Org Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Organization Details</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Organization Name *</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Organization name (required)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Organization Logo — identical to Settings.tsx */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Organization Logo
                </label>
                <div className="p-5 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl border border-rose-100 dark:border-rose-800">
                  <div className="flex items-center gap-5">
                    {/* Logo Preview */}
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-rose-200 dark:border-rose-700 flex items-center justify-center overflow-hidden bg-white dark:bg-gray-800 flex-shrink-0">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Organization Logo"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <ImagePlus className="h-8 w-8 text-rose-300" />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-1">
                        {logoUrl ? "Logo uploaded" : "No logo uploaded"}
                      </p>
                      <p className="text-xs text-rose-500 dark:text-rose-400 mb-3">
                        PNG, JPG or SVG. Max 2MB. Used on bills and receipts.
                      </p>
                      <div className="flex gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg hover:from-rose-600 hover:to-pink-600 transition-all shadow-md">
                          {logoUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          {logoUrl ? "Change" : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                            disabled={logoUploading}
                          />
                        </label>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={handleLogoRemove}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Franchise Type</label>
                <input
                  type="text"
                  value={org.type || "Franchise"}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-500 cursor-not-allowed capitalize"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Owner</label>
                  <input
                    type="text"
                    value={org.ownerName}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Total Branches</label>
                  <input
                    type="text"
                    value={`${allBranches.length} / ${org.maxBranches}`}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Menu Mode */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Utensils className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Menu Mode</h2>
            </div>
            <div className="p-5 space-y-3">
              {[
                { value: "independent", label: "Independent", desc: "Each branch manages its own menu completely" },
                { value: "master", label: "Master Menu", desc: "HQ creates master items, branches can customize prices" },
                { value: "shared", label: "Shared", desc: "All branches use the exact same menu, no customization" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    menuMode === opt.value
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="menuMode"
                    value={opt.value}
                    checked={menuMode === opt.value}
                    onChange={() => setMenuMode(opt.value as any)}
                    className="mt-0.5 accent-violet-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Subscription</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{org.plan} Plan</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Up to {org.maxBranches} branches · Active
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                  {org.plan}
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Daily Digest */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">WhatsApp Daily Digest</h2>
                  <p className="text-[11px] text-gray-400">Send daily sales, orders &amp; P&amp;L summaries via WhatsApp</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={digestEnabled}
                  onChange={(e) => setDigestEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-650 peer-checked:bg-violet-600"></div>
              </label>
            </div>
            {digestEnabled && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Recipient Subscribers</label>
                  <div className="space-y-2">
                    {team.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No team members found</p>
                    ) : (
                      team.map((member) => (
                        <label
                          key={member.id}
                          className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={digestRecipients.includes(member.id)}
                            onChange={() => toggleRecipient(member.id)}
                            className="accent-violet-600 w-4 h-4 rounded"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-gray-900 dark:text-white">{member.name}</span>
                            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 capitalize">
                              {member.role}
                            </span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Scheduled Time</label>
                    <input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-950 dark:text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleSendTestDigest}
                      variant="outline"
                      type="button"
                      className="w-full text-xs py-1.5 h-auto border-violet-600 text-violet-600 hover:bg-violet-50 dark:border-violet-400 dark:text-violet-400 dark:hover:bg-violet-900/10"
                    >
                      🚀 Send Test Digest
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      ) : (
        /* Rich Audit Log Visualization with Filters */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                Franchise Activity &amp; Audit Trail
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Showing {filteredLogs.length} activity records across all franchise branches
              </p>
            </div>
            <Button
              onClick={exportLogsCSV}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search action, user, details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Time Range Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none cursor-pointer"
              >
                <option value="all">Time Range: All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>

            {/* Action Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none cursor-pointer"
              >
                <option value="all">Action: All Types</option>
                <option value="INSERT">Insert / Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="SETTINGS">Settings</option>
              </select>
            </div>
          </div>

          {/* Log List */}
          {loadingLogs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              <span className="ml-2.5 text-sm text-gray-500 dark:text-gray-400">Loading audit activity…</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
              <History className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No matching audit logs found</p>
              <p className="text-xs text-gray-400 mt-1">Try clearing your search term or changing the date filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-4">
                {paginatedLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const detailsParsed = formatAuditDetails(log.details);

                  return (
                    <div
                      key={log.id}
                      className="p-4 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-150 dark:border-gray-700/80 shadow-sm hover:border-violet-300 dark:hover:border-violet-700 transition-all space-y-3"
                    >
                      {/* Log Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.bg}`}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                          {log.tableName && (
                            <span className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded">
                              {log.tableName}
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{log.date}</span>
                      </div>

                      {/* Formatted Log Details */}
                      {detailsParsed.fields ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-gray-900/70 rounded-lg border border-slate-100 dark:border-gray-800">
                          {detailsParsed.fields.map((f, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                {f.label}
                              </span>
                              <span className="text-xs font-medium text-gray-800 dark:text-gray-200 block truncate">
                                {f.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        detailsParsed.text && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 font-medium bg-slate-50 dark:bg-gray-900/70 p-2.5 rounded-lg border border-slate-100 dark:border-gray-800">
                            {detailsParsed.text}
                          </p>
                        )
                      )}

                      {/* Initiator User */}
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 pt-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span>Initiator:</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{log.user}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Footer */}
              {filteredLogs.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
                  <div className="text-gray-500 dark:text-gray-400 font-medium">
                    Showing{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {(currentPage - 1) * pageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {Math.min(currentPage * pageSize, filteredLogs.length)}
                    </span>{" "}
                    of <span className="font-semibold text-gray-900 dark:text-white">{filteredLogs.length}</span> entries
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-300 font-medium cursor-pointer"
                    >
                      <option value={5}>5 / page</option>
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                      <option value={50}>50 / page</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs border-gray-200 dark:border-gray-700"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Previous
                      </Button>

                      <span className="px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Page {currentPage} of {totalPages}
                      </span>

                      <Button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage >= totalPages}
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs border-gray-200 dark:border-gray-700"
                      >
                        Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FranchiseSettings;
