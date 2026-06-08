import React, { useState } from "react";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetaTemplateManager } from "./MetaTemplateManager";
import {
  useWhatsAppTemplates,
  useAdminTemplateReview,
  TEMPLATE_STATUS_CONFIG,
  TemplateStatus,
  WhatsAppTemplate,
  VariableMapping,
} from "@/hooks/useWhatsAppTemplates";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Building2,
  FileText,
  MessageSquare,
  RefreshCw,
  Pencil,
  Save,
  X,
  AlertTriangle,
  User,
  History,
  RotateCcw,
  Search,
} from "lucide-react";
import { format } from "date-fns";

const AdminTemplateReview: React.FC = () => {
  const { toast } = useToast();
  const { allTemplates, pendingTemplates, isLoading, refetch } =
    useAdminTemplateReview();
  const { approveTemplate, rejectTemplate, updateTemplate } =
    useWhatsAppTemplates();

  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // View/Edit state
  const [viewTemplate, setViewTemplate] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: "",
    header_text: "",
    body: "",
    category: "",
  });
  const [editVariables, setEditVariables] = useState<VariableMapping[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // History filter
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleApprove = async (template: WhatsAppTemplate) => {
    setProcessingId(template.id);
    try {
      await approveTemplate(template, true);
      refetch();
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRetrySubmit = async (template: any) => {
    setProcessingId(template.id);
    try {
      // Reset status to pending_admin first so approveTemplate will re-process
      await updateTemplate(template.id, {
        status: "pending_admin",
        admin_notes: "Retrying submission...",
      } as any);
      refetch();
      // Then immediately approve and submit
      await approveTemplate(
        { ...template, status: "pending_admin" } as WhatsAppTemplate,
        true
      );
      refetch();
    } catch (err) {
      console.error("Retry failed:", err);
      toast({
        title: "Retry Failed",
        description:
          err instanceof Error ? err.message : "Failed to resubmit.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = rejectNotes[id]?.trim();
    if (!reason) return;
    setProcessingId(id);
    try {
      await rejectTemplate(id, reason);
      setShowRejectInput(null);
      setRejectNotes((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      refetch();
    } finally {
      setProcessingId(null);
    }
  };

  const openViewDialog = (template: any) => {
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
        description:
          err instanceof Error ? err.message : "Failed to save.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getPreviewText = (body: string, variables: VariableMapping[]) => {
    let text = body;
    (variables || []).forEach((v) => {
      text = text.replace(`{{${v.name}}}`, v.sample);
    });
    return text;
  };

  // Filter templates for history tab
  const filteredHistory = allTemplates.filter((t: any) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.display_name?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.restaurant_name?.toLowerCase().includes(q) ||
        t.creator_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const config =
      TEMPLATE_STATUS_CONFIG[status as TemplateStatus] ||
      TEMPLATE_STATUS_CONFIG.draft;
    return (
      <Badge className={config.color}>
        {config.icon} {config.label}
      </Badge>
    );
  };

  // Render a single template card (used in both pending and detail views)
  const renderTemplateCard = (template: any) => {
    const isProcessing = processingId === template.id;

    let previewText = template.body;
    (template.variables || []).forEach((v: any) => {
      previewText = previewText.replace(`{{${v.name}}}`, v.sample);
      previewText = previewText.replace(`{{${v.position}}}`, v.sample);
    });

    return (
      <StandardizedCard key={template.id} className="p-5">
        {/* Template Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {template.display_name}
              </h3>
              {getStatusBadge(template.status)}
              <Badge variant="outline">{template.category}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 flex-wrap">
              <Building2 className="h-3 w-3" />
              <span>{template.restaurant_name}</span>
              <span>•</span>
              <User className="h-3 w-3" />
              <span>{template.creator_name || "System"}</span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>
                {format(
                  new Date(template.created_at),
                  "MMM dd, yyyy 'at' hh:mm a"
                )}
              </span>
            </div>
            {template.updated_at !== template.created_at && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                <History className="h-3 w-3" />
                Updated:{" "}
                {format(
                  new Date(template.updated_at),
                  "MMM dd, yyyy 'at' hh:mm a"
                )}
              </div>
            )}
          </div>
          <code className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {template.name}
          </code>
        </div>

        {/* Admin notes (errors/warnings) */}
        {template.admin_notes && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3" />
              Admin Notes
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {template.admin_notes}
            </p>
          </div>
        )}

        {/* Meta response (if has error) */}
        {template.meta_response?.error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-1 mb-1">
              <XCircle className="h-3 w-3" />
              Meta API Error
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 font-mono">
              {JSON.stringify(
                template.meta_response.error?.message ||
                  template.meta_response.error,
                null,
                2
              )}
            </p>
          </div>
        )}

        {/* WhatsApp Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Raw template */}
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">
              <FileText className="h-3 w-3 inline mr-1" />
              Template Content
            </Label>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm font-mono">
              {template.header_text && (
                <p className="font-bold mb-1">{template.header_text}</p>
              )}
              <p className="whitespace-pre-wrap">{template.body}</p>
              {template.footer_text && (
                <p className="text-gray-500 mt-2 text-xs">
                  {template.footer_text}
                </p>
              )}
            </div>
            {template.variables?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {template.variables.map((v: any, i: number) => (
                  <span
                    key={i}
                    className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded"
                  >
                    {`{{${v.position}}}`} = {v.name} ({v.sample})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Phone preview */}
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">
              <Eye className="h-3 w-3 inline mr-1" />
              WhatsApp Preview
            </Label>
            <div className="bg-[#E5DDD5] dark:bg-gray-700 rounded-lg p-3 min-h-[120px]">
              <div className="bg-white dark:bg-gray-600 rounded-lg p-3 max-w-[90%] shadow-sm">
                {template.header_text && (
                  <p className="font-bold text-sm mb-1">
                    {template.header_text}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{previewText}</p>
                {template.footer_text && (
                  <p className="text-xs text-gray-500 mt-1">
                    {template.footer_text}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 text-right mt-1">
                  9:41 AM ✓✓
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 border-t pt-3 flex-wrap">
          {/* Pending: Approve & Reject */}
          {(template.status === "pending_admin" ||
            template.status === "meta_pending") && (
            <>
              <StandardizedButton
                onClick={() => handleApprove(template as WhatsAppTemplate)}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve & Submit to Meta
              </StandardizedButton>

              {showRejectInput === template.id ? (
                <div className="flex-1 flex items-end gap-2">
                  <div className="flex-1">
                    <Textarea
                      value={rejectNotes[template.id] || ""}
                      onChange={(e) =>
                        setRejectNotes((prev) => ({
                          ...prev,
                          [template.id]: e.target.value,
                        }))
                      }
                      placeholder="Rejection reason (required)..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <StandardizedButton
                    onClick={() => handleReject(template.id)}
                    disabled={
                      isProcessing || !rejectNotes[template.id]?.trim()
                    }
                    variant="danger"
                    className="flex items-center gap-1"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </StandardizedButton>
                  <StandardizedButton
                    variant="secondary"
                    onClick={() => setShowRejectInput(null)}
                    size="sm"
                  >
                    Cancel
                  </StandardizedButton>
                </div>
              ) : (
                <StandardizedButton
                  variant="danger"
                  onClick={() => setShowRejectInput(template.id)}
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </StandardizedButton>
              )}
            </>
          )}

          {/* Failed/Approved (not yet on Meta): Retry button */}
          {(template.status === "admin_approved" ||
            template.status === "admin_rejected") && (
            <>
              <StandardizedButton
                onClick={() => handleRetrySubmit(template)}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Retry Submit to Meta
              </StandardizedButton>
            </>
          )}

          {/* Always show Edit & View */}
          <StandardizedButton
            variant="secondary"
            onClick={() => openViewDialog(template)}
            className="flex items-center gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            View / Edit
          </StandardizedButton>
        </div>
      </StandardizedCard>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30">
          <ShieldCheck className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Template Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review, approve, edit, and track all WhatsApp templates
          </p>
        </div>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="requests" className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            Pending Review
            {pendingTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {pendingTemplates.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            All Templates
            <Badge variant="outline" className="ml-1 text-xs">
              {allTemplates.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="meta" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Meta Active
          </TabsTrigger>
        </TabsList>

        {/* Pending Review Tab */}
        <TabsContent value="requests" className="space-y-4">
          {pendingTemplates.length === 0 ? (
            <StandardizedCard className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-400 mb-3" />
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                All caught up!
              </p>
              <p className="text-sm text-gray-500">
                No templates pending approval.
              </p>
            </StandardizedCard>
          ) : (
            <div className="space-y-4">
              {pendingTemplates.map((template: any) =>
                renderTemplateCard(template)
              )}
            </div>
          )}
        </TabsContent>

        {/* All Templates History Tab */}
        <TabsContent value="history" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, restaurant, creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_admin">Pending Review</SelectItem>
                <SelectItem value="admin_approved">Admin Approved</SelectItem>
                <SelectItem value="admin_rejected">Rejected</SelectItem>
                <SelectItem value="meta_pending">Meta Pending</SelectItem>
                <SelectItem value="meta_approved">Meta Approved</SelectItem>
                <SelectItem value="meta_rejected">Meta Rejected</SelectItem>
              </SelectContent>
            </Select>
            <StandardizedButton
              variant="secondary"
              size="sm"
              onClick={refetch}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </StandardizedButton>
          </div>

          {/* Results count */}
          <p className="text-xs text-gray-500">
            Showing {filteredHistory.length} of {allTemplates.length} templates
          </p>

          {filteredHistory.length === 0 ? (
            <StandardizedCard className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No templates match your filters.</p>
            </StandardizedCard>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((template: any) =>
                renderTemplateCard(template)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="meta">
          <MetaTemplateManager />
        </TabsContent>
      </Tabs>

      {/* View/Edit Dialog */}
      <Dialog
        open={!!viewTemplate}
        onOpenChange={(o) => {
          if (!o) {
            setViewTemplate(null);
            setIsEditing(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
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
            <div className="space-y-4">
              {/* Status & metadata */}
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(viewTemplate.status)}
                <Badge variant="outline">{viewTemplate.category}</Badge>
                <Badge variant="outline" className="text-xs">
                  {viewTemplate.language || "en"}
                </Badge>
              </div>

              {/* History info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="font-medium">Restaurant:</span>
                  <span>{viewTemplate.restaurant_name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-medium">Created by:</span>
                  <span>{viewTemplate.creator_name || "System"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">Created:</span>
                  <span>
                    {format(
                      new Date(viewTemplate.created_at),
                      "MMM dd, yyyy 'at' hh:mm a"
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <History className="h-3.5 w-3.5" />
                  <span className="font-medium">Last updated:</span>
                  <span>
                    {format(
                      new Date(viewTemplate.updated_at),
                      "MMM dd, yyyy 'at' hh:mm a"
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="font-medium">Slug:</span>
                  <code className="text-xs">{viewTemplate.name}</code>
                </div>
              </div>

              {/* Admin notes */}
              {viewTemplate.admin_notes && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Admin Notes
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    {viewTemplate.admin_notes}
                  </p>
                </div>
              )}

              {/* Meta response */}
              {viewTemplate.meta_response && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Meta API Response
                  </p>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                    {JSON.stringify(viewTemplate.meta_response, null, 2)}
                  </pre>
                </div>
              )}

              {/* Editable fields */}
              <div>
                <Label>Template Name</Label>
                {isEditing ? (
                  <Input
                    value={editForm.display_name}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        display_name: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 font-medium">
                    {viewTemplate.display_name}
                  </p>
                )}
              </div>

              <div>
                <Label>Header</Label>
                {isEditing ? (
                  <Input
                    value={editForm.header_text}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        header_text: e.target.value,
                      }))
                    }
                    className="mt-1"
                    placeholder="Optional"
                  />
                ) : (
                  <p className="mt-1 text-sm">
                    {viewTemplate.header_text || (
                      <span className="text-gray-400 italic">No header</span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <Label>Message Body</Label>
                {isEditing ? (
                  <>
                    <Textarea
                      value={editForm.body}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, body: e.target.value }))
                      }
                      rows={8}
                      className="mt-1 font-mono text-sm"
                    />
                    <p
                      className={`text-xs mt-1 ${editForm.body.length > 1024 ? "text-red-500" : "text-gray-400"}`}
                    >
                      {editForm.body.length}/1024
                    </p>
                  </>
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border text-sm whitespace-pre-wrap font-mono">
                    {viewTemplate.body}
                  </div>
                )}
              </div>

              {/* Variables */}
              {(isEditing ? editVariables : viewTemplate.variables)?.length > 0 && (
                <div>
                  <Label>
                    Variables ({(isEditing ? editVariables : viewTemplate.variables).length})
                  </Label>
                  <div className="mt-1 space-y-2">
                    {(isEditing ? editVariables : viewTemplate.variables).map(
                      (v: VariableMapping, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded px-3 py-2 text-sm"
                        >
                          <code className="text-blue-600 whitespace-nowrap">{`{{${v.name}}}`}</code>
                          {isEditing ? (
                            <Input
                              value={v.sample}
                              onChange={(e) => {
                                const updated = [...editVariables];
                                updated[i] = { ...updated[i], sample: e.target.value };
                                setEditVariables(updated);
                              }}
                              placeholder={`Sample for ${v.name}`}
                              className="flex-1 h-8 text-sm"
                            />
                          ) : (
                            <span className="text-gray-400 ml-auto">
                              sample: {v.sample}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {viewTemplate && (
            <div className="flex gap-3 pt-4 border-t">
              {isEditing ? (
                <>
                  <StandardizedButton
                    variant="secondary"
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </StandardizedButton>
                  <StandardizedButton
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </StandardizedButton>
                </>
              ) : (
                <>
                  <StandardizedButton
                    variant="secondary"
                    onClick={() => setViewTemplate(null)}
                    className="flex-1"
                  >
                    Close
                  </StandardizedButton>
                  <StandardizedButton
                    onClick={() => setIsEditing(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit Template
                  </StandardizedButton>
                  {(viewTemplate.status === "admin_approved" ||
                    viewTemplate.status === "admin_rejected") && (
                    <StandardizedButton
                      onClick={() => {
                        handleRetrySubmit(viewTemplate);
                        setViewTemplate(null);
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Retry Submit
                    </StandardizedButton>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTemplateReview;
