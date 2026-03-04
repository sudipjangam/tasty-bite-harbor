import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";

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

  // Fetch templates for the restaurant
  const {
    data: templates = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["wa-templates", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("whatsapp_templates" as any)
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching templates:", error);
        return [];
      }
      return (data || []).map((t: any) => ({
        ...t,
        variables: t.variables || [],
        buttons: t.buttons || [],
      })) as WhatsAppTemplate[];
    },
    enabled: !!restaurantId,
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
  const approveTemplate = async (id: string, autoSubmitToMeta = true) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;

    if (autoSubmitToMeta) {
      // Submit to MSG91 API
      try {
        await updateTemplate(id, { status: "meta_pending" } as any);

        const { data, error } = await supabase.functions.invoke(
          "create-msg91-template",
          {
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
          },
        );

        if (error) throw error;

        if (data?.success) {
          await updateTemplate(id, {
            status: "meta_approved",
            admin_notes: "Approved by admin and submitted to Meta",
            meta_response: data.data,
          } as any);
          toast({
            title: "Approved & Submitted ✅",
            description: "Template approved and submitted to MSG91/Meta.",
          });
        } else {
          await updateTemplate(id, {
            status: "admin_approved",
            admin_notes: `Approved by admin. MSG91 submission returned: ${JSON.stringify(data?.error || "Unknown error")}`,
            meta_response: data,
          } as any);
          toast({
            title: "Approved ✅",
            description:
              "Template approved. MSG91 submission had issues — check details.",
            variant: "destructive",
          });
        }
      } catch (err) {
        await updateTemplate(id, {
          status: "admin_approved",
          admin_notes: `Approved but MSG91 submission failed: ${err instanceof Error ? err.message : "Unknown"}`,
        } as any);
        toast({
          title: "Approved ✅",
          description:
            "Template approved but MSG91 auto-submit failed. Can retry later.",
        });
      }
    } else {
      await updateTemplate(id, {
        status: "admin_approved",
        admin_notes: "Approved by admin",
      } as any);
      toast({ title: "Approved ✅", description: "Template approved." });
    }
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
    restaurantId,
  };
};

// Hook for platform admin — fetches ALL pending templates across restaurants
export const useAdminTemplateReview = () => {
  const queryClient = useQueryClient();

  const { data: pendingTemplates = [], isLoading } = useQuery({
    queryKey: ["admin-pending-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates" as any)
        .select("*, restaurants(name)")
        .in("status", ["pending_admin", "meta_pending"])
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Error fetching pending templates:", error);
        return [];
      }
      return (data || []).map((t: any) => ({
        ...t,
        restaurant_name: t.restaurants?.name || "Unknown",
        variables: t.variables || [],
        buttons: t.buttons || [],
      })) as (WhatsAppTemplate & { restaurant_name: string })[];
    },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-pending-templates"] });
  };

  return { pendingTemplates, isLoading, refetch };
};
