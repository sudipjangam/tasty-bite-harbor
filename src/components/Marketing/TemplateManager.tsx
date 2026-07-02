import React, { useState, useMemo } from "react";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useWhatsAppTemplates,
  TEMPLATE_STATUS_CONFIG,
  TemplateStatus,
  WhatsAppTemplate,
  VariableMapping,
} from "@/hooks/useWhatsAppTemplates";
import CreateTemplateDialog from "./CreateTemplateDialog";
import {
  Plus,
  FileText,
  Lock,
  Send,
  Trash2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Pencil,
  Save,
  X,
  Globe,
  Grid,
  List,
  Search,
  Filter,
} from "lucide-react";
import { format } from "date-fns";

const DEFAULT_FOOTER = "billed by Swadeshi Solutions";

const TemplateManager: React.FC = () => {
  const { toast } = useToast();
  const {
    templates,
    isLoading,
    refetch,
    submitForApproval,
    deleteTemplate,
    updateTemplate,
    syncTemplateStatuses,
  } = useWhatsAppTemplates();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Layout and Filters
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "draft">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "UTILITY" | "MARKETING">("all");

  // View/Edit state
  const [viewTemplate, setViewTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: "",
    header_text: "",
    body: "",
    category: "",
  });
  const [editVariables, setEditVariables] = useState<VariableMapping[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTemplate(deleteTarget);
      toast({ title: "Deleted", description: "Template removed." });
      if (viewTemplate?.id === deleteTarget) setViewTemplate(null);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    try {
      await submitForApproval(id);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to submit.",
        variant: "destructive",
      });
    }
  };

  const openViewDialog = (template: WhatsAppTemplate) => {
    setViewTemplate(template);
    setIsEditing(false);
    setEditForm({
      display_name: template.display_name,
      header_text: template.header_text || "",
      body: template.body,
      category: template.category,
    });
    setEditVariables((template.variables || []).map((v: VariableMapping) => ({ ...v })));
  };

  const startEditing = () => {
    if (!viewTemplate) return;
    setEditForm({
      display_name: viewTemplate.display_name,
      header_text: viewTemplate.header_text || "",
      body: viewTemplate.body,
      category: viewTemplate.category,
    });
    setEditVariables((viewTemplate.variables || []).map((v: VariableMapping) => ({ ...v })));
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!viewTemplate) return;
    setIsSaving(true);
    try {
      const slug = editForm.display_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

      await updateTemplate(viewTemplate.id, {
        name: slug,
        display_name: editForm.display_name,
        header_text: editForm.header_text || null,
        body: editForm.body,
        category: editForm.category,
        variables: editVariables,
      } as any);

      toast({ title: "Saved ✅", description: "Template updated." });
      setIsEditing(false);
      setViewTemplate(null);
      refetch();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save template.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Get preview text with sample values
  const getPreviewText = (body: string, variables: VariableMapping[]) => {
    let text = body;
    (variables || []).forEach((v) => {
      text = text.split(`{{${v.name}}}`).join(v.sample);
    });
    return text;
  };

  const canEdit = (template: WhatsAppTemplate) => {
    return (
      !template.is_default &&
      ["draft", "admin_rejected"].includes(template.status)
    );
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Search query filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = template.display_name.toLowerCase().includes(q);
        const matchesSlug = template.name.toLowerCase().includes(q);
        const matchesBody = template.body.toLowerCase().includes(q);
        if (!matchesName && !matchesSlug && !matchesBody) return false;
      }

      // Category filter (case-insensitive)
      if (categoryFilter !== "all" && template.category.toUpperCase() !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const isApproved = template.status === "meta_approved" || template.status === "admin_approved";
        const isPending = template.status === "pending_admin" || template.status === "meta_pending";
        const isDraft = template.status === "draft" || template.status === "admin_rejected" || template.status === "meta_rejected";

        if (statusFilter === "approved" && !isApproved) return false;
        if (statusFilter === "pending" && !isPending) return false;
        if (statusFilter === "draft" && !isDraft) return false;
      }

      return true;
    });
  }, [templates, searchQuery, statusFilter, categoryFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 bg-white/40 dark:bg-white/[0.02] rounded-2xl border border-black/[0.04] dark:border-white/[0.05] backdrop-blur-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" />
          <span className="text-xs text-muted-foreground font-medium animate-pulse">Loading templates...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="
        relative rounded-3xl p-6 overflow-hidden border
        bg-white/60 dark:bg-white/[0.04]
        border-black/[0.06] dark:border-white/[0.08]
        backdrop-blur-xl
        transition-all duration-300
        hover:shadow-[0_12px_40px_rgba(168,85,247,0.06)]
        mb-6
      ">
        {/* Top glow decoration */}
        <div className="absolute top-0 right-1/4 w-96 h-24 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 blur-3xl -z-10 pointer-events-none" />

        {/* ── Header Area ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-black/[0.04] dark:border-white/[0.06] pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-500 shadow-[0_4px_16px_rgba(168,85,247,0.25)] text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Message Templates
                <Badge variant="outline" className="bg-black/[0.04] dark:bg-white/[0.06] text-xs font-semibold px-2 py-0.5 border-none">
                  {templates.length} total
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create and manage custom templates for WhatsApp broadcasts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StandardizedButton
              variant="secondary"
              onClick={async () => {
                setIsSyncing(true);
                try {
                  await syncTemplateStatuses();
                } finally {
                  setIsSyncing(false);
                }
              }}
              disabled={isSyncing}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-purple-500" : "text-muted-foreground"}`}
              />
              <span className="text-xs font-semibold">Sync statuses</span>
            </StandardizedButton>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="
                flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold text-white
                bg-gradient-to-r from-purple-600 to-indigo-500
                shadow-[0_4px_16px_rgba(168,85,247,0.3)]
                hover:shadow-[0_6px_20px_rgba(168,85,247,0.4)]
                hover:-translate-y-0.5
                transition-all duration-200
              "
            >
              <Plus className="h-4 w-4" />
              New Template
            </button>
          </div>
        </div>

        {/* ── Filters Area ── */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by name, slug or body..."
              className="pl-9 h-10 rounded-xl bg-white/40 dark:bg-white/[0.02] border-black/[0.08] dark:border-white/[0.08] focus:border-purple-500/50"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Status tabs */}
            <div className="flex p-0.5 rounded-xl border bg-black/[0.03] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.08]">
              {(["all", "approved", "pending", "draft"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                    ${statusFilter === tab
                      ? "bg-white dark:bg-white/[0.1] text-gray-900 dark:text-white shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Category selection */}
            <div className="flex p-0.5 rounded-xl border bg-black/[0.03] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.08]">
              {(["all", "UTILITY", "MARKETING"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                    ${categoryFilter === cat
                      ? "bg-white dark:bg-white/[0.1] text-gray-900 dark:text-white shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  {cat === "all" ? "All categories" : cat.toLowerCase()}
                </button>
              ))}
            </div>

            {/* View mode toggle */}
            <div className="flex border rounded-xl p-0.5 border-black/[0.08] dark:border-white/[0.08]">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-black/[0.06] dark:bg-white/[0.08] text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-black/[0.06] dark:bg-white/[0.08] text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Templates Content ── */}
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl bg-black/[0.01] dark:bg-white/[0.01] border border-dashed border-black/[0.08] dark:border-white/[0.08]">
            <FileText className="h-12 w-12 text-muted-foreground opacity-30 mb-3" />
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No templates found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
              {templates.length === 0
                ? "Create your first WhatsApp template to launch campaigns."
                : "No templates match your active search filters."}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid Mode: High fidelity visual cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((template) => {
              const statusConfig =
                TEMPLATE_STATUS_CONFIG[template.status as TemplateStatus] ||
                TEMPLATE_STATUS_CONFIG.draft;

              return (
                <div
                  key={template.id}
                  onClick={() => openViewDialog(template)}
                  className="
                    group relative flex flex-col justify-between rounded-2xl p-5 border cursor-pointer overflow-hidden
                    bg-white/40 dark:bg-white/[0.02]
                    border-black/[0.06] dark:border-white/[0.08]
                    hover:border-purple-400/40 dark:hover:border-purple-500/40
                    hover:shadow-[0_8px_30px_rgba(168,85,247,0.06)]
                    transition-all duration-300
                  "
                >
                  <div>
                    {/* Header: title and badges */}
                    <div className="flex items-start justify-between gap-2 mb-3.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {template.is_default && (
                          <Lock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {template.display_name}
                        </span>
                      </div>
                      <Badge className={`${statusConfig.color} border-none font-semibold text-[10px] px-2 py-0.5 whitespace-nowrap`}>
                        {statusConfig.icon} {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Meta bar */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <Badge variant="secondary" className="text-[9px] bg-black/[0.03] dark:bg-white/[0.04] text-muted-foreground border-none">
                        {template.category}
                      </Badge>
                      {template.is_default && (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] border-none font-semibold">
                          Default
                        </Badge>
                      )}
                      {template.restaurant_name && (
                        <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] border-none font-semibold">
                          🏢 {template.restaurant_name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] text-muted-foreground border-black/[0.05] dark:border-white/[0.05]">
                        <Globe className="h-2.5 w-2.5 mr-1 inline" />
                        {template.language}
                      </Badge>
                    </div>

                    {/* Live WhatsApp chat bubble emulator */}
                    <div className="bg-[#E5DDD5] dark:bg-[#0b141a]/60 rounded-xl p-3 border border-black/[0.04] dark:border-white/[0.04] relative min-h-[140px] flex flex-col justify-between mb-4">
                      <div className="flex-1">
                        {template.header_text && (
                          <p className="font-extrabold text-[10px] text-gray-900 dark:text-white mb-1 border-b border-black/[0.05] dark:border-white/[0.05] pb-1">
                            {template.header_text}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-800 dark:text-gray-200 leading-relaxed font-mono whitespace-pre-wrap">
                          {getPreviewText(template.body, template.variables)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/[0.03] dark:border-white/[0.03] text-[9px] text-gray-400">
                        <span className="truncate max-w-[80%]">{template.footer_text || DEFAULT_FOOTER}</span>
                        <span className="text-[10px] font-sans font-semibold text-green-500 leading-none">✓✓</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Timestamps footer */}
                  <div className="flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.04] pt-3.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(template.created_at), "MMM d, yyyy")}
                    </span>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* Submit for approval */}
                      {(template.status === "draft" || template.status === "admin_rejected") && !template.is_default && (
                        <button
                          onClick={() => handleSubmitForApproval(template.id)}
                          className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <Send className="h-3 w-3" />
                          Submit
                        </button>
                      )}

                      {/* Delete */}
                      {!template.is_default && (
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors border border-transparent hover:border-red-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List Mode: Compact, highly structural layout */
          <div className="border border-black/[0.06] dark:border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.08] bg-white/20 dark:bg-white/[0.01]">
            {filteredTemplates.map((template) => {
              const statusConfig =
                TEMPLATE_STATUS_CONFIG[template.status as TemplateStatus] ||
                TEMPLATE_STATUS_CONFIG.draft;

              return (
                <div
                  key={template.id}
                  onClick={() => openViewDialog(template)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors gap-3 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400 flex-shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {template.is_default && (
                          <Lock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        <span className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {template.display_name}
                        </span>
                        <Badge className={`${statusConfig.color} border-none text-[9px] px-1.5 py-0.5`}>
                          {statusConfig.label}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">
                          {template.category}
                        </Badge>
                        {template.restaurant_name && (
                          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] border-none font-semibold">
                            🏢 {template.restaurant_name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {template.body}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-between sm:justify-end ml-11 sm:ml-0 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(template.created_at), "MMM dd, yyyy")}
                    </span>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* Submit */}
                      {(template.status === "draft" || template.status === "admin_rejected") && !template.is_default && (
                        <button
                          onClick={() => handleSubmitForApproval(template.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <Send className="h-3 w-3" />
                          Submit
                        </button>
                      )}

                      {/* Delete */}
                      {!template.is_default && (
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors border border-transparent hover:border-red-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={() => refetch()}
      />

      {/* View/Edit Template Dialog */}
      <Dialog
        open={!!viewTemplate}
        onOpenChange={(o) => {
          if (!o) {
            setViewTemplate(null);
            setIsEditing(false);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#0c0f1c]/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {isEditing ? (
                <>
                  <Pencil className="h-5 w-5 text-blue-600" />
                  Edit Template
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5 text-purple-600" />
                  Template Details
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {viewTemplate && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              {/* Left: Details/Edit Form */}
              <div className="space-y-4">
                {/* Status & Meta info */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={
                      (
                        TEMPLATE_STATUS_CONFIG[
                          viewTemplate.status as TemplateStatus
                        ] || TEMPLATE_STATUS_CONFIG.draft
                      ).color + " border-none text-[10px]"
                    }
                  >
                    {
                      (
                        TEMPLATE_STATUS_CONFIG[
                          viewTemplate.status as TemplateStatus
                        ] || TEMPLATE_STATUS_CONFIG.draft
                      ).icon
                    }{" "}
                    {
                      (
                        TEMPLATE_STATUS_CONFIG[
                          viewTemplate.status as TemplateStatus
                        ] || TEMPLATE_STATUS_CONFIG.draft
                      ).label
                    }
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{viewTemplate.category}</Badge>
                  <Badge variant="outline" className="text-[10px]">
                    <Globe className="h-3 w-3 mr-1" />
                    {viewTemplate.language || "en"}
                  </Badge>
                  {viewTemplate.is_default && (
                    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] border-none font-semibold">
                      <Lock className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>

                {/* Template Name */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Template Name</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.display_name}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          display_name: e.target.value,
                        }))
                      }
                      className="mt-1.5"
                    />
                  ) : (
                    <p className="mt-1.5 text-sm font-bold text-gray-900 dark:text-gray-100">
                      {viewTemplate.display_name}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    Slug: <code>{viewTemplate.name}</code>
                  </p>
                </div>

                {/* Header */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Header</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.header_text}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          header_text: e.target.value,
                        }))
                      }
                      placeholder="Optional header"
                      className="mt-1.5"
                    />
                  ) : (
                    <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">
                      {viewTemplate.header_text || (
                        <span className="text-gray-400 italic text-xs">No header</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Body */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Message Body</Label>
                  {isEditing ? (
                    <>
                      <Textarea
                        value={editForm.body}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            body: e.target.value,
                          }))
                        }
                        rows={6}
                        className="mt-1.5 font-mono text-sm"
                      />
                      <p
                        className={`text-xs mt-1 ${editForm.body.length > 1024 ? "text-red-500" : "text-gray-400"}`}
                      >
                        {editForm.body.length}/1024
                      </p>
                    </>
                  ) : (
                    <div className="mt-1.5 p-3.5 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl border border-black/[0.06] dark:border-white/[0.06] text-xs whitespace-pre-wrap font-mono leading-relaxed">
                      {viewTemplate.body}
                    </div>
                  )}
                </div>

                {/* Variables */}
                {((isEditing ? editVariables : viewTemplate.variables) || []).length > 0 && (
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Variables ({(isEditing ? editVariables : viewTemplate.variables).length})
                    </Label>
                    <div className="mt-1.5 space-y-2 max-h-36 overflow-y-auto">
                      {(isEditing ? editVariables : viewTemplate.variables).map(
                        (v: VariableMapping, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 bg-purple-500/5 dark:bg-purple-500/10 rounded-xl border border-purple-500/10 px-3 py-2 text-xs"
                          >
                            <code className="text-purple-600 dark:text-purple-400 font-bold whitespace-nowrap">{`{{${v.name}}}`}</code>
                            {isEditing ? (
                              <Input
                                value={v.sample}
                                onChange={(e) => {
                                  const updated = [...editVariables];
                                  updated[i] = { ...updated[i], sample: e.target.value };
                                  setEditVariables(updated);
                                }}
                                placeholder={`Sample for ${v.name}`}
                                className="flex-1 h-8 text-xs rounded-lg"
                              />
                            ) : (
                              <span className="text-gray-400 text-[10px] ml-auto italic">
                                sample: {v.sample}
                              </span>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    Footer
                    <Lock className="h-3 w-3 text-amber-500" />
                  </Label>
                  <p className="mt-1 text-sm text-gray-500 font-medium">
                    {viewTemplate.footer_text || DEFAULT_FOOTER}
                  </p>
                </div>

                {/* Admin notes */}
                {viewTemplate.admin_notes && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1 uppercase">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Review Feedback
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {viewTemplate.admin_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: WhatsApp Preview */}
              <div className="flex flex-col">
                <Label className="text-xs font-bold text-muted-foreground uppercase mb-2 block flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  WhatsApp Live Preview
                </Label>
                <div className="bg-[#E5DDD5] dark:bg-[#0b141a]/60 rounded-3xl p-4 min-h-[380px] flex flex-col border border-black/10 dark:border-white/10 shadow-inner flex-1">
                  {/* Chat header */}
                  <div className="bg-[#075E54] dark:bg-[#1f2c34] text-white rounded-2xl px-4 py-3 -mt-2 -mx-2 mb-4 flex items-center gap-3 shadow-md">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                      🏪
                    </div>
                    <div>
                      <p className="font-bold text-xs">Restaurant WhatsApp</p>
                      <p className="text-[10px] text-green-200">Verified Business Account</p>
                    </div>
                  </div>

                  {/* Message bubble */}
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="bg-white dark:bg-[#1f2c34] rounded-2xl p-3.5 max-w-[85%] shadow-[0_2px_8px_rgba(0,0,0,0.08)] relative ml-auto border border-black/[0.04] dark:border-white/[0.04]">
                      {/* Header */}
                      {(isEditing
                        ? editForm.header_text
                        : viewTemplate.header_text) && (
                        <p className="font-extrabold text-xs text-gray-900 dark:text-white mb-1.5 border-b border-black/[0.05] dark:border-white/[0.05] pb-1">
                          {isEditing
                            ? editForm.header_text
                            : viewTemplate.header_text}
                        </p>
                      )}

                      {/* Body with sample values */}
                      <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-mono">
                        {getPreviewText(
                          isEditing ? editForm.body : viewTemplate.body,
                          viewTemplate.variables || []
                        )}
                      </p>

                      {/* Footer */}
                      <p className="text-[10px] text-gray-500 mt-2.5 border-t border-black/[0.04] dark:border-white/[0.04] pt-1">
                        {viewTemplate.footer_text || DEFAULT_FOOTER}
                      </p>

                      {/* Timestamp */}
                      <p className="text-[9px] text-gray-400 text-right mt-1.5">
                        {new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        <span className="text-green-500 ml-0.5">✓✓</span>
                      </p>

                      {/* Tail */}
                      <div className="absolute -right-2 top-0.5 w-0 h-0 border-l-8 border-l-white dark:border-l-[#1f2c34] border-t-8 border-t-transparent" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {viewTemplate && (
            <div className="flex gap-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] mt-4">
              {isEditing ? (
                <>
                  <StandardizedButton
                    variant="secondary"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 h-10 rounded-xl"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Cancel
                  </StandardizedButton>
                  <StandardizedButton
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="flex-1 h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white shadow-md shadow-green-500/20"
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </StandardizedButton>
                </>
              ) : (
                <>
                  <StandardizedButton
                    variant="secondary"
                    onClick={() => setViewTemplate(null)}
                    className="flex-1 h-10 rounded-xl"
                  >
                    Close
                  </StandardizedButton>
                  {canEdit(viewTemplate) && (
                    <StandardizedButton
                      onClick={startEditing}
                      className="flex-1 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white"
                    >
                      <Pencil className="h-4 w-4 mr-1.5" />
                      Edit Template
                    </StandardizedButton>
                  )}
                  {(viewTemplate.status === "draft" ||
                    viewTemplate.status === "admin_rejected") &&
                    !viewTemplate.is_default && (
                      <StandardizedButton
                        onClick={() => {
                          handleSubmitForApproval(viewTemplate.id);
                          setViewTemplate(null);
                        }}
                        className="flex-1 h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white shadow-md shadow-green-500/20"
                      >
                        <Send className="h-4 w-4 mr-1.5" />
                        Submit for Approval
                      </StandardizedButton>
                    )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#0c0f1c]/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-lg">Delete Template</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Delete this template? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white rounded-xl shadow-md shadow-red-500/20 border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TemplateManager;
