import React, { useState } from "react";
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

  // View/Edit state
  const [viewTemplate, setViewTemplate] = useState<WhatsAppTemplate | null>(
    null
  );
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
      // Generate slug from display name
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
          err instanceof Error ? err.message : "Failed to save template.",
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
      text = text.replace(`{{${v.name}}}`, v.sample);
    });
    return text;
  };

  const canEdit = (template: WhatsAppTemplate) => {
    // Can edit drafts and rejected templates, not approved/pending ones
    return (
      !template.is_default &&
      ["draft", "admin_rejected"].includes(template.status)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <>
      <StandardizedCard className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Message Templates
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {templates.length} template
                {templates.length !== 1 ? "s" : ""} • Create templates for your
                WhatsApp campaigns
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StandardizedButton
              size="sm"
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
              className="flex items-center gap-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Syncing..." : "Sync from Meta"}
            </StandardizedButton>
            <StandardizedButton
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4" />
              New Template
            </StandardizedButton>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No templates yet</p>
            <p className="text-sm">
              Create your first WhatsApp template to start campaigns.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
              const statusConfig =
                TEMPLATE_STATUS_CONFIG[template.status as TemplateStatus] ||
                TEMPLATE_STATUS_CONFIG.draft;

              return (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-700/50 transition-colors cursor-pointer group"
                  onClick={() => openViewDialog(template)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {template.is_default && (
                      <Lock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {template.display_name}
                        </span>
                        <Badge className={statusConfig.color}>
                          {statusConfig.icon} {statusConfig.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        {template.is_default && (
                          <Badge className="bg-amber-100 text-amber-800 text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {template.body.substring(0, 80)}
                        {template.body.length > 80 ? "..." : ""}
                      </p>
                      {template.admin_notes && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {template.admin_notes}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(
                          new Date(template.created_at),
                          "MMM dd, yyyy"
                        )}
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2 ml-4 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* View button */}
                    <StandardizedButton
                      size="sm"
                      variant="secondary"
                      onClick={() => openViewDialog(template)}
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </StandardizedButton>

                    {/* Submit for approval if draft or rejected */}
                    {(template.status === "draft" ||
                      template.status === "admin_rejected") &&
                      !template.is_default && (
                        <StandardizedButton
                          size="sm"
                          onClick={() =>
                            handleSubmitForApproval(template.id)
                          }
                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Send className="h-3 w-3" />
                          Submit
                        </StandardizedButton>
                      )}

                    {/* Delete (non-default only) */}
                    {!template.is_default && (
                      <StandardizedButton
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(template.id)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </StandardizedButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </StandardizedCard>

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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      ).color
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
                  <Badge variant="outline">{viewTemplate.category}</Badge>
                  <Badge variant="outline" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    {viewTemplate.language || "en"}
                  </Badge>
                  {viewTemplate.is_default && (
                    <Badge className="bg-amber-100 text-amber-800 text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>

                {/* Template Name */}
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
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {viewTemplate.display_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Slug: <code>{viewTemplate.name}</code>
                  </p>
                </div>

                {/* Header */}
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
                      placeholder="Optional header"
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      {viewTemplate.header_text || (
                        <span className="text-gray-400 italic">No header</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Body */}
                <div>
                  <Label>Message Body</Label>
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
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border text-sm whitespace-pre-wrap font-mono leading-relaxed">
                      {viewTemplate.body}
                    </div>
                  )}
                </div>

                {/* Variables */}
                {((isEditing ? editVariables : viewTemplate.variables) || []).length > 0 && (
                    <div>
                      <Label>Variables ({(isEditing ? editVariables : viewTemplate.variables).length})</Label>
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

                {/* Footer */}
                <div>
                  <Label className="flex items-center gap-1.5">
                    Footer
                    <Lock className="h-3 w-3 text-amber-500" />
                  </Label>
                  <p className="mt-1 text-sm text-gray-500">
                    {viewTemplate.footer_text || DEFAULT_FOOTER}
                  </p>
                </div>

                {/* Admin notes */}
                {viewTemplate.admin_notes && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1 mb-1">
                      <AlertTriangle className="h-3 w-3" />
                      Admin Notes
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      {viewTemplate.admin_notes}
                    </p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-xs text-gray-400 space-y-0.5">
                  <p>
                    Created:{" "}
                    {format(
                      new Date(viewTemplate.created_at),
                      "MMM dd, yyyy 'at' hh:mm a"
                    )}
                  </p>
                  <p>
                    Updated:{" "}
                    {format(
                      new Date(viewTemplate.updated_at),
                      "MMM dd, yyyy 'at' hh:mm a"
                    )}
                  </p>
                </div>
              </div>

              {/* Right: WhatsApp Preview */}
              <div>
                <Label className="text-sm mb-2 block flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  WhatsApp Preview
                </Label>
                <div className="bg-[#E5DDD5] dark:bg-gray-800 rounded-2xl p-4 min-h-[400px] flex flex-col">
                  {/* Chat header */}
                  <div className="bg-[#075E54] text-white rounded-t-xl px-4 py-3 -mt-4 -mx-4 mb-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                      🏪
                    </div>
                    <div>
                      <p className="font-medium text-sm">Business Name</p>
                      <p className="text-xs text-green-200">
                        Verified Business
                      </p>
                    </div>
                  </div>

                  {/* Message bubble */}
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-3 max-w-[85%] shadow-sm relative ml-auto">
                      {/* Header */}
                      {(isEditing
                        ? editForm.header_text
                        : viewTemplate.header_text) && (
                        <p className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">
                          {isEditing
                            ? editForm.header_text
                            : viewTemplate.header_text}
                        </p>
                      )}

                      {/* Body with sample values */}
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {getPreviewText(
                          isEditing ? editForm.body : viewTemplate.body,
                          viewTemplate.variables || []
                        )}
                      </p>

                      {/* Footer */}
                      <p className="text-xs text-gray-500 mt-2 border-t pt-1">
                        {viewTemplate.footer_text || DEFAULT_FOOTER}
                      </p>

                      {/* Timestamp */}
                      <p className="text-[10px] text-gray-400 text-right mt-1">
                        {new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        ✓✓
                      </p>

                      {/* Tail */}
                      <div className="absolute -right-2 top-0 w-0 h-0 border-l-8 border-l-white dark:border-l-gray-700 border-t-8 border-t-transparent" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
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
                  {canEdit(viewTemplate) && (
                    <StandardizedButton
                      onClick={startEditing}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
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
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Send className="h-4 w-4 mr-1" />
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this template? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
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
