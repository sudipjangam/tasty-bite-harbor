import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface WhatsAppTemplate {
  id: string;
  restaurant_id: string;
  name: string;
  display_name: string;
  category: string;
  language: string;
  body: string;
  variables: VariableMapping[];
  header_text: string | null;
  footer_text: string | null;
  buttons: any[];
  status: string;
  admin_notes: string | null;
  meta_response: any;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  restaurant_name?: string | null;
}

export interface VariableMapping {
  position: number;
  name: string;
  sample: string;
}

export type TemplateStatus =
  | "draft"
  | "pending_admin"
  | "admin_approved"
  | "admin_rejected"
  | "meta_pending"
  | "meta_approved"
  | "meta_rejected";

export const TEMPLATE_STATUS_CONFIG: Record<
  TemplateStatus,
  { label: string; color: string; icon: string }
> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: "📝" },
  pending_admin: {
    label: "Under Review",
    color: "bg-yellow-100 text-yellow-800",
    icon: "👀",
  },
  admin_approved: {
    label: "Admin Approved",
    color: "bg-blue-100 text-blue-800",
    icon: "✅",
  },
  admin_rejected: {
    label: "Admin Rejected",
    color: "bg-red-100 text-red-800",
    icon: "❌",
  },
  meta_pending: {
    label: "Meta Pending",
    color: "bg-orange-100 text-orange-800",
    icon: "⏳",
  },
  meta_approved: {
    label: "Approved",
    color: "bg-green-100 text-green-800",
    icon: "✅",
  },
  meta_rejected: {
    label: "Meta Rejected",
    color: "bg-red-100 text-red-800",
    icon: "❌",
  },
};

export const useWhatsAppTemplates = () => {
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Fetch templates for the restaurant
  const {
    data: templates = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["wa-templates", restaurantId, isAdmin],
    queryFn: async () => {
      if (!isAdmin && !restaurantId) return [];

      let query = supabase.from("whatsapp_templates" as any);

      if (isAdmin) {
        query = query.select("*, restaurants(name)");
      } else {
        query = query.select("*").eq("restaurant_id", restaurantId);
      }

      const { data, error } = await query
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching templates:", error);
        return [];
      }

      return (data || [])
        .map((t: any) => ({
          ...t,
          restaurant_name: t.restaurants?.name || null,
          variables: t.variables || [],
          buttons: t.buttons || [],
        }))
        .filter((t: any) => isAdmin || !t.is_default) as WhatsAppTemplate[];
    },
    enabled: isAdmin || !!restaurantId,
  });

  // Get only approved templates (for campaign builder)
  const approvedTemplates = templates.filter(
    (t) => t.status === "meta_approved" || t.status === "admin_approved",
  );

  // Create template
  const createTemplate = async (
    template: Omit<
      WhatsAppTemplate,
      | "id"
      | "restaurant_id"
      | "created_by"
      | "created_at"
      | "updated_at"
      | "admin_notes"
      | "meta_response"
    >,
  ) => {
    if (!restaurantId) throw new Error("No restaurant");

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("whatsapp_templates" as any)
      .insert({
        restaurant_id: restaurantId,
        name: template.name,
        display_name: template.display_name,
        category: template.category,
        language: template.language || "en",
        body: template.body,
        variables: template.variables as any,
        header_text: template.header_text,
        footer_text: template.footer_text,
        buttons: template.buttons as any,
        status: template.status || "draft",
        is_default: false,
        created_by: userData?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["wa-templates"] });
    return data;
  };

  // Update template
  const updateTemplate = async (
    id: string,
    updates: Partial<WhatsAppTemplate>,
  ) => {
    const { error } = await supabase
      .from("whatsapp_templates" as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["wa-templates"] });
  };

  // Delete template
  const deleteTemplate = async (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (template?.is_default) {
      toast({
        title: "Cannot delete",
        description: "Default templates cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase
      .from("whatsapp_templates" as any)
      .delete()
      .eq("id", id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["wa-templates"] });
  };

  // Submit for admin approval
  const submitForApproval = async (id: string) => {
    await updateTemplate(id, { status: "pending_admin" } as any);
    toast({
      title: "Submitted! 📤",
      description: "Template submitted to Swadeshi Solutions for review.",
    });
  };

  // Admin: Approve template and submit to MSG91
  // Accepts full template object so it works from Platform Admin (different restaurant scope)
  const approveTemplate = async (
    idOrTemplate: string | WhatsAppTemplate,
    autoSubmitToMeta = true,
  ) => {
    const template =
      typeof idOrTemplate === "string"
        ? templates.find((t) => t.id === idOrTemplate)
        : idOrTemplate;
    const id =
      typeof idOrTemplate === "string" ? idOrTemplate : idOrTemplate.id;

    if (!template) {
      console.error("approveTemplate: template not found for id", id);
      toast({
        title: "Error",
        description: "Template not found. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    if (autoSubmitToMeta) {
      // Submit to MSG91 API
      try {
        await updateTemplate(id, { status: "meta_pending" } as any);

        const { data: configData } = await supabase
          .from("platform_config" as any)
          .select("value")
          .eq("key", "whatsapp")
          .maybeSingle();
        const provider = configData?.value?.provider || "msg91";

        let funcName = "create-msg91-template";
        let funcOptions: any = {
          body: {
            templateName: template.name,
            language: template.language,
            category: template.category,
            bodyText: template.body,
            headerText: template.header_text,
            footerText: template.footer_text,
            variables: template.variables,
            buttons: template.buttons,
          },
        };

        if (provider === "meta_cloud") {
          funcName = "meta-whatsapp-templates";

          const vars = (template.variables || []) as VariableMapping[];

          // Scan body for ACTUALLY used variables ({{name}} patterns)
          const usedVarRegex = /\{\{(\w+)\}\}/g;
          const usedVarNames: string[] = [];
          let match;
          const bodyText = template.body;
          while ((match = usedVarRegex.exec(bodyText)) !== null) {
            if (!usedVarNames.includes(match[1])) {
              usedVarNames.push(match[1]);
            }
          }

          // Convert named variables to positional {{1}}, {{2}} — only for vars actually in body
          let metaBody = bodyText;
          const sampleValues: string[] = [];
          usedVarNames.forEach((varName, i) => {
            const varInfo = vars.find(v => v.name === varName);
            sampleValues.push(varInfo?.sample || `sample_${varName}`);
            // replaceAll to handle variable used multiple times
            metaBody = metaBody.split(`{{${varName}}}`).join(`{{${i + 1}}}`);
          });

          const bodyComponent: any = {
            type: "BODY",
            text: metaBody,
          };
          // Attach example sample values ONLY if variables exist
          if (sampleValues.length > 0) {
            bodyComponent.example = {
              body_text: [sampleValues],
            };
          }

          const components: any[] = [bodyComponent];
          if (template.header_text) components.push({ type: "HEADER", format: "TEXT", text: template.header_text });
          if (template.footer_text) components.push({ type: "FOOTER", text: template.footer_text });
          
          funcOptions = {
            body: {
              name: template.name,
              language: template.language,
              category: template.category || "MARKETING",
              components
            }
          };
        }

        const { data, error } = await supabase.functions.invoke(
          funcName,
          funcOptions
        );

        if (error) throw error;

        // Meta API returns { id, status, category } on success, or { error: {...} } on failure
        // MSG91 returns { success: true } on success
        const isMetaSuccess = provider === "meta_cloud"
          ? (data?.id && !data?.error)
          : data?.success;

        if (isMetaSuccess) {
          await updateTemplate(id, {
            status: "meta_approved",
            admin_notes: "Approved by admin and submitted to Meta",
            meta_response: data,
          } as any);
          toast({
            title: "Approved & Submitted ✅",
            description: provider === "meta_cloud"
              ? `Template submitted to Meta (ID: ${data?.id}). Status: ${data?.status || "PENDING"}`
              : "Template approved and submitted to MSG91.",
          });
        } else {
          const errorMsg = provider === "meta_cloud"
            ? JSON.stringify(data?.error?.message || data?.error || "Unknown error")
            : JSON.stringify(data?.error || "Unknown error");
          await updateTemplate(id, {
            status: "admin_approved",
            admin_notes: `Approved by admin. Submission returned: ${errorMsg}`,
            meta_response: data,
          } as any);
          toast({
            title: "Approved ✅",
            description: `Template approved but submission had issues: ${errorMsg}`,
            variant: "destructive",
          });
        }
      } catch (err) {
        await updateTemplate(id, {
          status: "admin_approved",
          admin_notes: `Approved but submission failed: ${err instanceof Error ? err.message : "Unknown"}`,
        } as any);
        toast({
          title: "Approved ✅",
          description:
            "Template approved but auto-submit failed. Can retry later.",
        });
      }
    } else {
      await updateTemplate(id, {
        status: "admin_approved",
        admin_notes: "Approved by admin",
      } as any);
      toast({ title: "Approved ✅", description: "Template approved." });
    }

    // Also invalidate admin pending list
    queryClient.invalidateQueries({ queryKey: ["admin-pending-templates"] });
  };

  // Admin: Reject template
  const rejectTemplate = async (id: string, reason: string) => {
    await updateTemplate(id, {
      status: "admin_rejected",
      admin_notes: reason,
    } as any);
    toast({
      title: "Rejected ❌",
      description: "Template rejected with feedback sent to owner.",
    });
    queryClient.invalidateQueries({ queryKey: ["admin-pending-templates"] });
  };

  // Sync template statuses from MSG91/Meta
  const syncTemplateStatuses = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "sync-msg91-template-status",
        {
          body: { restaurantId },
        },
      );
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["wa-templates"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-templates"] });

      toast({
        title: "Synced ✅",
        description: `Synced ${data?.synced || 0} template statuses from Meta.`,
      });
      return data;
    } catch (err) {
      toast({
        title: "Sync failed",
        description:
          err instanceof Error ? err.message : "Failed to sync statuses",
        variant: "destructive",
      });
    }
  };

  return {
    templates,
    approvedTemplates,
    isLoading,
    refetch,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    submitForApproval,
    approveTemplate,
    rejectTemplate,
    syncTemplateStatuses,
    restaurantId,
  };
};

// Hook for platform admin — fetches ALL pending templates across restaurants
export const useAdminTemplateReview = () => {
  const queryClient = useQueryClient();

  const { data: allTemplates = [], isLoading } = useQuery({
    queryKey: ["admin-all-templates"],
    queryFn: async () => {
      // Fetch templates with restaurant name only (created_by join breaks when null)
      const { data, error } = await supabase
        .from("whatsapp_templates" as any)
        .select("*, restaurants(name)")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching templates:", error);
        return [];
      }

      // Collect unique creator IDs to batch-fetch names
      const creatorIds = [...new Set(
        (data || []).map((t: any) => t.created_by).filter(Boolean)
      )];
      
      let creatorMap: Record<string, string> = {};
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles" as any)
          .select("id, first_name, last_name, email")
          .in("id", creatorIds);
        (profiles || []).forEach((p: any) => {
          const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
          creatorMap[p.id] = name || p.email || "Unknown";
        });
      }

      return (data || []).map((t: any) => ({
        ...t,
        restaurant_name: t.restaurants?.name || "Unknown",
        creator_name: t.created_by ? (creatorMap[t.created_by] || "Unknown") : "System",
        variables: t.variables || [],
        buttons: t.buttons || [],
      })) as (WhatsAppTemplate & { restaurant_name: string; creator_name: string })[];
    },
  });

  const pendingTemplates = allTemplates.filter(
    (t) => t.status === "pending_admin" || t.status === "meta_pending"
  );

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-all-templates"] });
  };

  return { allTemplates, pendingTemplates, isLoading, refetch };
};
