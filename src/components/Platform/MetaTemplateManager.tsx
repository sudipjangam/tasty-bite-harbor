import React, { useState, useEffect } from "react";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, CheckCircle2, XCircle, Clock, FileText, AlertTriangle, Edit } from "lucide-react";
import CreateMetaTemplateDialog from "./CreateMetaTemplateDialog";

interface MetaTemplate {
  name: string;
  language: string;
  category: string;
  status: string;
  components: any[];
  id: string;
}

export function MetaTemplateManager() {
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MetaTemplate | undefined>(undefined);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-whatsapp-templates", {
        method: "GET",
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error.message || data.error);
      setTemplates(data.data || []);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error fetching Meta templates",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete template ${name}?`)) return;
    setIsDeleting(name);
    try {
      const { data, error } = await supabase.functions.invoke(
        `meta-whatsapp-templates?name=${name}`,
        {
          method: "DELETE",
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error.message || data.error);

      toast({ title: "Template Deleted", description: "Removed from Meta." });
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Delete Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "APPROVED":
        return { label: "Approved", color: "bg-green-100 text-green-800", icon: "✅" };
      case "REJECTED":
        return { label: "Rejected", color: "bg-red-100 text-red-800", icon: "❌" };
      case "PENDING":
        return { label: "Pending", color: "bg-orange-100 text-orange-800", icon: "⏳" };
      default:
        return { label: status, color: "bg-gray-100 text-gray-800", icon: "📝" };
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
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Meta Message Templates
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {templates.length} template{templates.length !== 1 ? "s" : ""} • Live from Meta Business Manager
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StandardizedButton 
              onClick={() => {
                setEditingTemplate(undefined);
                setIsDialogOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
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
            <p className="text-sm">Create your first Meta template to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((tpl) => {
              const statusConfig = getStatusConfig(tpl.status);
              const bodyComponent = tpl.components?.find((c: any) => c.type === "BODY");

              return (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {tpl.name}
                        </span>
                        <Badge className={statusConfig.color}>
                          {statusConfig.icon} {statusConfig.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs uppercase">
                          {tpl.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {tpl.language}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {bodyComponent?.text || "No body content"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <StandardizedButton
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setIsDialogOpen(true);
                      }}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                    </StandardizedButton>
                    <StandardizedButton
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(tpl.name)}
                      disabled={isDeleting === tpl.name}
                      className="flex items-center gap-1"
                    >
                      {isDeleting === tpl.name ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </StandardizedButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </StandardizedCard>

      <CreateMetaTemplateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreated={() => fetchTemplates()}
        initialData={editingTemplate}
      />
    </>
  );
}
