import React, { useState } from "react";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useWhatsAppTemplates,
  TEMPLATE_STATUS_CONFIG,
  TemplateStatus,
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
} from "lucide-react";
import { format } from "date-fns";

const TemplateManager: React.FC = () => {
  const { toast } = useToast();
  const {
    templates,
    isLoading,
    refetch,
    submitForApproval,
    deleteTemplate,
    syncTemplateStatuses,
  } = useWhatsAppTemplates();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Delete this template? This cannot be undone.",
    );
    if (!confirmed) return;
    try {
      await deleteTemplate(id);
      toast({ title: "Deleted", description: "Template removed." });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive",
      });
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
                {templates.length} template{templates.length !== 1 ? "s" : ""} •
                Create templates for your WhatsApp campaigns
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
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
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
                        {format(new Date(template.created_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {/* Submit for approval if draft or rejected */}
                    {(template.status === "draft" ||
                      template.status === "admin_rejected") &&
                      !template.is_default && (
                        <StandardizedButton
                          size="sm"
                          onClick={() => handleSubmitForApproval(template.id)}
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
                        variant="destructive"
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
    </>
  );
};

export default TemplateManager;
