
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Customer, CustomerNote, CustomerActivity } from "@/types/customer";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export const useCustomerData = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  // Subscribe to all relevant tables using the reusable hook
  useRealtimeSubscription({
    table: "customers",
    queryKey: "customers",
    filter: restaurantId ? { column: "restaurant_id", value: restaurantId } : null
  });

  // Fetch customers data
  const {
    data: customers = [],
    isLoading: isLoadingCustomers,
    error: customersError,
    refetch: refetchCustomers
  } = useQuery({
    queryKey: ["customers", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return [];

      // Get all customers associated with this restaurant
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) {
        console.error("Error fetching customers:", error);
        throw error;
      }

      // For each customer, enrich their data with information from all order types
      const enrichedCustomers = await Promise.all(
        data.map(async (customer) => {
          // Get regular orders
          const { data: orderData } = await supabase
            .from("orders")
            .select("total, created_at")
            .eq("restaurant_id", restaurantId)
            .eq("customer_name", customer.name)
            .order("created_at", { ascending: false });
            
          // Get room food orders
          const { data: roomFoodOrders } = await supabase
            .from("room_food_orders")
            .select("total, created_at")
            .eq("restaurant_id", restaurantId)
            .eq("customer_name", customer.name)
            .order("created_at", { ascending: false });
            
          // Get reservations
          const { data: reservations } = await supabase
            .from("reservations")
            .select("created_at")
            .eq("restaurant_id", restaurantId)
            .eq("customer_name", customer.name)
            .order("created_at", { ascending: false });

          // Combine all interactions to calculate metrics
          const allOrders = [
            ...(orderData || []).map(o => ({ total: o.total, date: o.created_at })),
            ...(roomFoodOrders || []).map(o => ({ total: o.total, date: o.created_at }))
          ];
          
          // Calculate metrics
          const totalSpent = allOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
          const visitCount = allOrders.length + (reservations?.length || 0);
          const averageOrderValue = visitCount > 0 ? totalSpent / visitCount : 0;
          
          // Find most recent interaction date
          const allDates = [
            ...allOrders.map(o => new Date(o.date).getTime()),
            ...(reservations || []).map(r => new Date(r.created_at).getTime())
          ];
          
          const lastVisitDate = allDates.length > 0 
            ? new Date(Math.max(...allDates)).toISOString()
            : customer.last_visit_date;

          return {
            id: customer.id,
            name: customer.name,
            email: customer.email || null,
            phone: customer.phone || null,
            address: customer.address || null,
            birthday: customer.birthday || null,
            created_at: customer.created_at,
            restaurant_id: customer.restaurant_id,
            loyalty_points: customer.loyalty_points || 0,
            loyalty_tier: calculateLoyaltyTier(
              totalSpent,
              visitCount,
              calculateDaysSince(lastVisitDate)
            ),
            tags: customer.tags || [],
            preferences: customer.preferences || null,
            last_visit_date: lastVisitDate || null,
            total_spent: totalSpent,
            visit_count: visitCount,
            average_order_value: averageOrderValue,
          };
        })
      );

      return enrichedCustomers;
    },
  });

  // Fetch customer notes
  const getCustomerNotes = async (customerId: string) => {
    const { data, error } = await supabase
      .from("customer_notes")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching customer notes:", error);
      throw error;
    }

    return data || [];
  };

  // Fetch customer activities
  const getCustomerActivities = async (customerId: string) => {
    const { data, error } = await supabase
      .from("customer_activities")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching customer activities:", error);
      throw error;
    }

    return data || [];
  };

  // Fetch customer orders from all sources
  const getCustomerOrders = async (customerName: string) => {
    if (!restaurantId || !customerName) return [];
    
    // Get standard orders
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("customer_name", customerName)
      .order("created_at", { ascending: false });
      
    if (ordersError) {
      console.error("Error fetching customer orders:", ordersError);
      throw ordersError;
    }
    
    // Get room food orders
    const { data: roomOrders, error: roomError } = await supabase
      .from("room_food_orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("customer_name", customerName)
      .order("created_at", { ascending: false });
      
    if (roomError) {
      console.error("Error fetching room food orders:", roomError);
      throw roomError;
    }
    
    // Combine and format all orders
    const allOrders = [
      ...(orders || []).map((order) => ({
        id: order.id,
        date: order.created_at,
        amount: order.total,
        order_id: order.id,
        status: order.status,
        items: order.items || [],
        source: "pos"
      })),
      ...(roomOrders || []).map((order) => ({
        id: order.id,
        date: order.created_at,
        amount: order.total,
        order_id: order.id,
        status: order.status,
        items: order.items || [],
        source: "room_service"
      }))
    ];
    
    // Sort by date, most recent first
    return allOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Add note mutation
  const addNote = useMutation({
    mutationFn: async ({ 
      customerId, 
      content, 
      createdBy 
    }: { 
      customerId: string; 
      content: string; 
      createdBy: string;
    }) => {
      const { data, error } = await supabase
        .from("customer_notes")
        .insert([
          {
            customer_id: customerId,
            restaurant_id: restaurantId,
            content: content,
            created_by: createdBy
          }
        ])
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ["customer-notes", customerId] });
      toast({
        title: "Note Added",
        description: "Customer note has been successfully added.",
      });
    },
    onError: (error) => {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "There was a problem adding the note.",
        variant: "destructive",
      });
    },
  });

  // Add customer activity
  const addActivity = useMutation({
    mutationFn: async ({ 
      customerId, 
      activityType, 
      description 
    }: { 
      customerId: string; 
      activityType: string; 
      description: string;
    }) => {
      const { data, error } = await supabase
        .from("customer_activities")
        .insert([
          {
            customer_id: customerId,
            restaurant_id: restaurantId,
            activity_type: activityType,
            description: description,
          }
        ])
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ["customer-activities", customerId] });
    },
    onError: (error) => {
      console.error("Error recording activity:", error);
    },
  });

  // Add/update customer mutation
  const saveCustomer = useMutation({
    mutationFn: async (customer: Partial<Customer>) => {
      if (!restaurantId) {
        throw new Error("No restaurant ID available");
      }

      // If editing existing customer
      if (customer.id) {
        const { data, error } = await supabase
          .from("customers")
          .update({
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            birthday: customer.birthday,
            preferences: customer.preferences,
            tags: customer.tags || []
          })
          .eq("id", customer.id)
          .select();
          
        if (error) throw error;
        return data;
      } 
      // If creating new customer
      else {
        const { data, error } = await supabase
          .from("customers")
          .insert([
            {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              address: customer.address,
              birthday: customer.birthday,
              preferences: customer.preferences,
              restaurant_id: restaurantId,
              tags: customer.tags || []
            }
          ])
          .select();
          
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Success",
        description: "Customer information has been saved.",
      });
    },
    onError: (error) => {
      console.error("Error saving customer:", error);
      toast({
        title: "Error",
        description: "There was a problem saving the customer information.",
        variant: "destructive",
      });
    },
  });

  // Add/remove tag mutation
  const updateTags = useMutation({
    mutationFn: async ({ 
      customerId, 
      tags 
    }: { 
      customerId: string; 
      tags: string[];
    }) => {
      const { data, error } = await supabase
        .from("customers")
        .update({ tags })
        .eq("id", customerId)
        .select();
        
      if (error) throw error;
      
      // Record activity
      await addActivity.mutateAsync({
        customerId,
        activityType: "tag_updated",
        description: "Customer tags were updated"
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Tags Updated",
        description: "Customer tags have been updated.",
      });
    },
    onError: (error) => {
      console.error("Error updating tags:", error);
      toast({
        title: "Error",
        description: "There was a problem updating the tags.",
        variant: "destructive",
      });
    },
  });

  // Helper function to calculate loyalty tier
  function calculateLoyaltyTier(
    totalSpent: number,
    visitCount: number,
    daysSinceLastVisit: number
  ): Customer["loyalty_tier"] {
    // Simplified loyalty tier calculation logic
    if (totalSpent > 20000 && visitCount > 15) return "Diamond";
    if (totalSpent > 10000 && visitCount > 10) return "Platinum";
    if (totalSpent > 5000 && visitCount > 8) return "Gold";
    if (totalSpent > 2500 && visitCount > 5) return "Silver";
    if (totalSpent > 1000 || visitCount > 3) return "Bronze";
    return "None";
  }
  
  // Calculate days since a given date
  function calculateDaysSince(dateString?: string | null): number {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    customers,
    isLoadingCustomers,
    customersError,
    getCustomerNotes,
    getCustomerActivities,
    getCustomerOrders,
    addNote,
    addActivity,
    saveCustomer,
    updateTags,
    refetchCustomers
  };
};
