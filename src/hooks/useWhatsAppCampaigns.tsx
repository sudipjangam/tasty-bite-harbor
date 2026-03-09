import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";

export interface LoyaltyTier {
  id: string;
  name: string;
  color: string | null;
  display_order: number;
  points_required: number;
  min_spent: number | null;
  min_visits: number | null;
}

export interface WhatsAppCustomer {
  id: string;
  name: string;
  phone: string | null;
  loyalty_tier: string | null;
  loyalty_tier_id: string | null;
  total_spent: number;
  visit_count: number;
  loyalty_points: number;
}

export interface WhatsAppSend {
  id: string;
  campaign_id: string | null;
  customer_phone: string;
  customer_name: string;
  template_name: string;
  status: string;
  failure_reason: string | null;
  sent_at: string;
}

export const useWhatsAppCampaigns = () => {
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();

  // Fetch loyalty tiers for the restaurant
  const { data: loyaltyTiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ["loyalty-tiers", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("loyalty_tiers")
        .select(
          "id, name, color, display_order, points_required, min_spent, min_visits",
        )
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as LoyaltyTier[];
    },
    enabled: !!restaurantId,
  });

  // Fetch customers with phone numbers (join loyalty_tiers for tier name)
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["wa-customers", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, name, phone, loyalty_tier_id, total_spent, visit_count, loyalty_points, loyalty_tiers(name)",
        )
        .eq("restaurant_id", restaurantId)
        .not("phone", "is", null)
        .order("name");
      if (error) throw error;
      // Map the joined tier name to a flat field
      return (data || []).map((c: any) => ({
        ...c,
        loyalty_tier: c.loyalty_tiers?.name || null,
      })) as WhatsAppCustomer[];
    },
    enabled: !!restaurantId,
  });

  // Fetch WhatsApp send history
  const { data: sendHistory = [], isLoading: sendsLoading } = useQuery({
    queryKey: ["wa-send-history", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("whatsapp_campaign_sends" as any)
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("sent_at", { ascending: false })
        .limit(200);
      if (error) {
        console.error("Error fetching WA sends:", error);
        return [];
      }
      return (data || []) as WhatsAppSend[];
    },
    enabled: !!restaurantId,
  });

  // Fetch restaurant details for template variables
  const { data: restaurant } = useQuery({
    queryKey: ["restaurant-details", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data, error } = await supabase
        .from("restaurants")
        .select("name, phone, address")
        .eq("id", restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Get customers matching selected tier IDs
  const getCustomersByTiers = (
    selectedTierIds: string[],
  ): WhatsAppCustomer[] => {
    if (selectedTierIds.length === 0) return customers;

    // Map tier IDs to tier names
    const tierNames = loyaltyTiers
      .filter((t) => selectedTierIds.includes(t.id))
      .map((t) => t.name.toLowerCase());

    return customers.filter((c) => {
      if (c.loyalty_tier_id && selectedTierIds.includes(c.loyalty_tier_id))
        return true;
      if (c.loyalty_tier && tierNames.includes(c.loyalty_tier.toLowerCase()))
        return true;
      return false;
    });
  };

  // Map a variable name to the actual runtime value
  const resolveVariable = (
    varName: string,
    customer: WhatsAppCustomer,
    extras: { discountText?: string; promoCode?: string },
  ): string => {
    switch (varName) {
      case "customer_name":
        return customer.name || "Guest";
      case "restaurant_name":
        return restaurant?.name || "Restaurant";
      case "amount":
        return (
          extras.discountText ||
          (extras.promoCode ? `Use code ${extras.promoCode}` : "Special offer")
        );
      case "order_date":
        return new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      case "contact_number":
        return restaurant?.phone || "";
      case "discount_code":
        return extras.promoCode || "";
      default:
        return "";
    }
  };

  // Send WhatsApp campaign to selected customers
  const sendCampaign = async (
    targetCustomers: WhatsAppCustomer[],
    campaignId: string | null,
    promoCode?: string,
    discountText?: string,
    onProgress?: (sent: number, total: number) => void,
    templateName?: string,
  ) => {
    if (!restaurantId || !restaurant) throw new Error("Restaurant not loaded");

    const results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: [],
    };

    const total = targetCustomers.length;
    const useTemplate = templateName || "invoice_with_contact";

    // Fetch the template definition from DB to know which variables it needs
    let templateVars: { position: number; name: string; sample: string }[] = [];
    let templateButtons: any[] = [];
    let hasUrlButton = false;

    const { data: templateDef } = await supabase
      .from("whatsapp_templates" as any)
      .select("variables, buttons, body")
      .eq("name", useTemplate)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (templateDef) {
      templateVars = (templateDef as any).variables || [];
      templateButtons = (templateDef as any).buttons || [];
      // Check if template body or buttons suggest a URL button
      hasUrlButton = templateButtons.some(
        (b: any) => b.type === "URL" || b.subtype === "url",
      );
    } else {
      // Fallback: hardcoded variable lists for known templates
      if (useTemplate === "invoice_with_contact") {
        templateVars = [
          { position: 1, name: "customer_name", sample: "Guest" },
          { position: 2, name: "restaurant_name", sample: "Restaurant" },
          { position: 3, name: "amount", sample: "₹0" },
          { position: 4, name: "order_date", sample: "01 Jan 2026" },
          { position: 5, name: "contact_number", sample: "0000000000" },
        ];
        hasUrlButton = true;
      } else if (useTemplate === "welcome_offer") {
        templateVars = [
          { position: 1, name: "customer_name", sample: "Guest" },
        ];
        hasUrlButton = false;
      }
    }

    console.log(
      `Campaign: template="${useTemplate}", vars=${templateVars.length}, urlButton=${hasUrlButton}`,
    );

    for (let i = 0; i < targetCustomers.length; i++) {
      const customer = targetCustomers[i];
      if (!customer.phone) continue;

      try {
        // Build ONLY the variables this template needs
        const variables: Record<string, string> = {};
        for (const v of templateVars) {
          variables[v.name] = resolveVariable(v.name, customer, {
            discountText,
            promoCode,
          });
        }

        // Build buttons if template has URL button
        const buttons: { type: string; value: string }[] = [];
        if (hasUrlButton) {
          // For invoice_with_contact, the URL is the bill viewer
          buttons.push({
            type: "url",
            value: customer.phone?.replace(/\D/g, "") || "",
          });
        }

        const { data, error } = await supabase.functions.invoke(
          "send-msg91-whatsapp",
          {
            body: {
              phoneNumber: customer.phone,
              templateName: useTemplate,
              variables,
              buttons: buttons.length > 0 ? buttons : undefined,
            },
          },
        );

        if (error) throw error;

        // Log the send
        await supabase.from("whatsapp_campaign_sends" as any).insert({
          campaign_id: campaignId,
          restaurant_id: restaurantId,
          customer_id: customer.id,
          customer_phone: customer.phone,
          customer_name: customer.name,
          template_name: useTemplate,
          status: "sent",
          msg91_request_id: data?.data?.request_id || null,
        });

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(
          `${customer.name}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );

        await supabase.from("whatsapp_campaign_sends" as any).insert({
          campaign_id: campaignId,
          restaurant_id: restaurantId,
          customer_id: customer.id,
          customer_phone: customer.phone || "",
          customer_name: customer.name,
          template_name: useTemplate,
          status: "failed",
          failure_reason: err instanceof Error ? err.message : "Unknown error",
        });
      }

      onProgress?.(i + 1, total);

      // Small delay between sends to respect rate limits
      if (i < targetCustomers.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Refresh send history
    queryClient.invalidateQueries({ queryKey: ["wa-send-history"] });

    return results;
  };

  // Analytics from send history
  const analytics = {
    totalSent: sendHistory.length,
    successful: sendHistory.filter(
      (s) => s.status === "sent" || s.status === "delivered",
    ).length,
    failed: sendHistory.filter((s) => s.status === "failed").length,
    delivered: sendHistory.filter((s) => s.status === "delivered").length,
    read: sendHistory.filter((s) => s.status === "read").length,
    deliveryRate:
      sendHistory.length > 0
        ? Math.round(
            (sendHistory.filter((s) => s.status !== "failed").length /
              sendHistory.length) *
              100,
          )
        : 0,
  };

  return {
    loyaltyTiers,
    customers,
    sendHistory,
    restaurant,
    analytics,
    getCustomersByTiers,
    sendCampaign,
    isLoading: tiersLoading || customersLoading || sendsLoading,
    restaurantId,
  };
};
