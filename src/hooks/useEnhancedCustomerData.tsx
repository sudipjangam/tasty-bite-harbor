
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCustomerData } from "./useCustomerData";

export const useEnhancedCustomerData = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const customerData = useCustomerData();

  // Update customer preferences
  const updatePreferences = useMutation({
    mutationFn: async ({ 
      customerId, 
      preferences 
    }: { 
      customerId: string; 
      preferences: string;
    }) => {
      const { data, error } = await supabase
        .from("customers")
        .update({ preferences })
        .eq("id", customerId)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Preferences Updated",
        description: "Customer preferences have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating preferences:", error);
      toast({
        title: "Error",
        description: "There was a problem updating the preferences.",
        variant: "destructive",
      });
    },
  });

  // Enhanced customer journey tracking
  const trackCustomerJourney = useMutation({
    mutationFn: async ({
      customerId,
      touchpoint,
      details,
      value
    }: {
      customerId: string;
      touchpoint: string;
      details: string;
      value?: number;
    }) => {
      const { data, error } = await supabase
        .from("customer_activities")
        .insert([
          {
            customer_id: customerId,
            activity_type: "journey_touchpoint",
            description: `${touchpoint}: ${details}`,
          }
        ])
        .select();
        
      if (error) throw error;
      return data;
    },
  });

  // Customer segmentation based on behavior
  const getCustomerSegment = (customer: any) => {
    const { total_spent, visit_count, loyalty_tier } = customer;
    
    if (total_spent > 10000 && visit_count > 10) {
      return { segment: "VIP", color: "purple", priority: "high" };
    } else if (total_spent > 5000 && visit_count > 5) {
      return { segment: "Loyal", color: "blue", priority: "medium" };
    } else if (visit_count > 3) {
      return { segment: "Regular", color: "green", priority: "medium" };
    } else if (visit_count <= 1) {
      return { segment: "New", color: "yellow", priority: "high" };
    } else {
      return { segment: "Occasional", color: "gray", priority: "low" };
    }
  };

  // Get customer lifetime value prediction
  const getCustomerLTV = (customer: any) => {
    const { total_spent, visit_count, average_order_value } = customer;
    
    if (visit_count === 0) return 0;
    
    // Simple LTV calculation: AOV * visit frequency * estimated lifetime
    const visitFrequency = visit_count / 12; // visits per month (assuming 1 year of data)
    const estimatedLifetime = 24; // months
    
    return average_order_value * visitFrequency * estimatedLifetime;
  };

  return {
    ...customerData,
    updatePreferences,
    trackCustomerJourney,
    getCustomerSegment,
    getCustomerLTV
  };
};
