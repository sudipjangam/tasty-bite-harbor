import React, { useState } from "react";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useWhatsAppTemplates,
  useAdminTemplateReview,
  TEMPLATE_STATUS_CONFIG,
  TemplateStatus,
  WhatsAppTemplate,
} from "@/hooks/useWhatsAppTemplates";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Building2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

const AdminTemplateReview: React.FC = () => {
  const { pendingTemplates, isLoading, refetch } = useAdminTemplateReview();
  const { approveTemplate, rejectTemplate } = useWhatsAppTemplates();

  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await approveTemplate(id, true);
      refetch();
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
            Template Approvals
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review and approve WhatsApp templates submitted by restaurants
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto text-lg px-3 py-1">
          {pendingTemplates.length} pending
        </Badge>
      </div>

      {/* Pending Templates */}
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
          {pendingTemplates.map((template: any) => {
            const statusConfig =
              TEMPLATE_STATUS_CONFIG[template.status as TemplateStatus] ||
              TEMPLATE_STATUS_CONFIG.pending_admin;
            const isProcessing = processingId === template.id;

            // Generate preview
            let previewText = template.body;
            (template.variables || []).forEach((v: any) => {
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
                      <Badge className={statusConfig.color}>
                        {statusConfig.icon} {statusConfig.label}
                      </Badge>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <Building2 className="h-3 w-3" />
                      <span>{template.restaurant_name}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(
                          new Date(template.created_at),
                          "MMM dd, yyyy 'at' hh:mm a",
                        )}
                      </span>
                    </div>
                  </div>
                  <code className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {template.name}
                  </code>
                </div>

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
                        {template.variables.map((v: any) => (
                          <span
                            key={v.position}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                          >
                            {`{{${v.position}}}`} = {v.name}
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
                        <p className="text-sm whitespace-pre-wrap">
                          {previewText}
                        </p>
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
                <div className="flex items-center gap-3 border-t pt-3">
                  <StandardizedButton
                    onClick={() => handleApprove(template.id)}
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
                </div>
              </StandardizedCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminTemplateReview;
