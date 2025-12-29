import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  Customer,
  CustomerNote,
  CustomerActivity,
  CustomerLoyaltyTier,
} from "@/types/customer";
import { LoyaltyTierDB } from "@/types/loyalty";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

// Default tier thresholds (used when no custom tiers exist)
const DEFAULT_TIERS = [
  { name: "Diamond", min_spent: 20000, min_visits: 15, points_required: 5000 },
  { name: "Platinum", min_spent: 10000, min_visits: 10, points_required: 2500 },
  { name: "Gold", min_spent: 5000, min_visits: 8, points_required: 1000 },
  { name: "Silver", min_spent: 2500, min_visits: 5, points_required: 500 },
  { name: "Bronze", min_spent: 1000, min_visits: 3, points_required: 100 },
  { name: "None", min_spent: 0, min_visits: 0, points_required: 0 },
];

export const useCustomerData = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  // Subscribe to all relevant tables using the reusable hook
  useRealtimeSubscription({
    table: "customers",
    queryKey: "customers",
    filter: restaurantId
      ? { column: "restaurant_id", value: restaurantId }
      : null,
  });

  // Fetch loyalty tiers from database
  const { data: dbTiers = [] } = useQuery({
    queryKey: ["loyalty-tiers", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("loyalty_tiers")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: false }); // Order by display_order descending for tier calculation

      if (error) {
        console.error("Error fetching loyalty tiers:", error);
        return [];
      }
      return (data || []).map((tier) => ({
        ...tier,
        min_spent: tier.min_spent ?? 0,
        min_visits: tier.min_visits ?? 0,
        points_required: tier.points_required ?? 0,
      })) as LoyaltyTierDB[];
    },
    enabled: !!restaurantId,
  });

  // Calculate loyalty tier based on database tiers or defaults
  const calculateLoyaltyTierFromDB = (
    totalSpent: number,
    visitCount: number,
    loyaltyPoints: number
  ): CustomerLoyaltyTier => {
    // Use database tiers if available, otherwise use defaults
    const tiers =
      dbTiers.length > 0
        ? dbTiers.sort((a, b) => (b.min_spent || 0) - (a.min_spent || 0)) // Sort by min_spent descending
        : DEFAULT_TIERS;

    for (const tier of tiers) {
      const minSpent = "min_spent" in tier ? tier.min_spent || 0 : 0;
      const minVisits = "min_visits" in tier ? tier.min_visits || 0 : 0;

      // Customer qualifies for tier if they meet BOTH spending and visit requirements
      if (totalSpent >= minSpent && visitCount >= minVisits) {
        return tier.name as CustomerLoyaltyTier;
      }
    }
    return "None";
  };

  // Fetch customers data with OPTIMIZED batch loading (fixes N+1 query problem)
  const {
    data: customers = [],
    isLoading: isLoadingCustomers,
    error: customersError,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ["customers", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return [];

      // STEP 1: Fetch all customers
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (customersError) {
        console.error("Error fetching customers:", customersError);
        throw customersError;
      }

      if (!customersData || customersData.length === 0) {
        return [];
      }

      // STEP 2: Batch fetch ALL orders, room_food_orders, and reservations for this restaurant
      // This is 3 queries total instead of 3*N queries!
      const [ordersResult, roomOrdersResult, reservationsResult] =
        await Promise.all([
          supabase
            .from("orders")
            .select("customer_name, total, created_at")
            .eq("restaurant_id", restaurantId),
          supabase
            .from("room_food_orders")
            .select("customer_name, total, created_at")
            .eq("restaurant_id", restaurantId),
          supabase
            .from("reservations")
            .select("customer_name, created_at")
            .eq("restaurant_id", restaurantId),
        ]);

      // Create lookup maps for efficient O(1) access by customer name
      const ordersByCustomer = new Map<
        string,
        Array<{ total: number; created_at: string }>
      >();
      const roomOrdersByCustomer = new Map<
        string,
        Array<{ total: number; created_at: string }>
      >();
      const reservationsByCustomer = new Map<
        string,
        Array<{ created_at: string }>
      >();

      // Populate orders map
      (ordersResult.data || []).forEach((order) => {
        const name = order.customer_name || "";
        if (!ordersByCustomer.has(name)) {
          ordersByCustomer.set(name, []);
        }
        ordersByCustomer.get(name)!.push({
          total: Number(order.total) || 0,
          created_at: order.created_at,
        });
      });

      // Populate room orders map
      (roomOrdersResult.data || []).forEach((order) => {
        const name = order.customer_name || "";
        if (!roomOrdersByCustomer.has(name)) {
          roomOrdersByCustomer.set(name, []);
        }
        roomOrdersByCustomer.get(name)!.push({
          total: Number(order.total) || 0,
          created_at: order.created_at,
        });
      });

      // Populate reservations map
      (reservationsResult.data || []).forEach((res) => {
        const name = res.customer_name || "";
        if (!reservationsByCustomer.has(name)) {
          reservationsByCustomer.set(name, []);
        }
        reservationsByCustomer.get(name)!.push({
          created_at: res.created_at,
        });
      });

      // STEP 3: Enrich customers using the pre-fetched data (in-memory processing)
      const enrichedCustomers = customersData.map((customer) => {
        const customerOrders = ordersByCustomer.get(customer.name) || [];
        const customerRoomOrders =
          roomOrdersByCustomer.get(customer.name) || [];
        const customerReservations =
          reservationsByCustomer.get(customer.name) || [];

        // Combine all orders
        const allOrders = [
          ...customerOrders.map((o) => ({
            total: o.total,
            date: o.created_at,
          })),
          ...customerRoomOrders.map((o) => ({
            total: o.total,
            date: o.created_at,
          })),
        ];

        // Calculate metrics
        const totalSpent = allOrders.reduce(
          (sum, order) => sum + order.total,
          0
        );
        const visitCount = allOrders.length + customerReservations.length;
        const averageOrderValue = visitCount > 0 ? totalSpent / visitCount : 0;

        // Find most recent interaction date
        const allDates = [
          ...allOrders.map((o) => new Date(o.date).getTime()),
          ...customerReservations.map((r) => new Date(r.created_at).getTime()),
        ];

        const lastVisitDate =
          allDates.length > 0
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
          loyalty_tier: calculateLoyaltyTierFromDB(
            totalSpent,
            visitCount,
            customer.loyalty_points || 0
          ),
          tags: customer.tags || [],
          preferences: customer.preferences || null,
          last_visit_date: lastVisitDate || null,
          total_spent: totalSpent,
          visit_count: visitCount,
          average_order_value: averageOrderValue,
        };
      });

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
        source: "pos",
      })),
      ...(roomOrders || []).map((order) => ({
        id: order.id,
        date: order.created_at,
        amount: order.total,
        order_id: order.id,
        status: order.status,
        items: order.items || [],
        source: "room_service",
      })),
    ];

    // Sort by date, most recent first
    return allOrders.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  // Fetch customer room billings (room stays/checkouts)
  const getCustomerRoomBillings = async (customerName: string) => {
    if (!restaurantId || !customerName) return [];

    const { data, error } = await supabase
      .from("room_billings")
      .select(
        `
        *,
        rooms:room_id (name, room_number)
      `
      )
      .eq("restaurant_id", restaurantId)
      .eq("customer_name", customerName)
      .order("checkout_date", { ascending: false });

    if (error) {
      console.error("Error fetching room billings:", error);
      return [];
    }

    return (data || []).map((billing) => ({
      id: billing.id,
      checkoutDate: billing.checkout_date,
      roomName: billing.rooms?.name || billing.rooms?.room_number || "Room",
      daysStayed: billing.days_stayed,
      roomCharges: billing.room_charges,
      foodOrdersTotal: billing.food_orders_total || 0,
      serviceCharge: billing.service_charge,
      totalAmount: billing.total_amount,
      paymentMethod: billing.payment_method,
      paymentStatus: billing.payment_status,
    }));
  };

  // Fetch customer reservations (room bookings)
  const getCustomerReservations = async (customerName: string) => {
    if (!restaurantId || !customerName) return [];

    const { data, error } = await supabase
      .from("reservations")
      .select(
        `
        *,
        rooms:room_id (name, room_number)
      `
      )
      .eq("restaurant_id", restaurantId)
      .eq("customer_name", customerName)
      .order("start_time", { ascending: false });

    if (error) {
      console.error("Error fetching reservations:", error);
      return [];
    }

    return (data || []).map((reservation) => ({
      id: reservation.id,
      startTime: reservation.start_time,
      endTime: reservation.end_time,
      roomName:
        reservation.rooms?.name || reservation.rooms?.room_number || "Room",
      status: reservation.status,
      notes: reservation.notes,
      specialOccasion: reservation.special_occasion,
    }));
  };

  // Get comprehensive customer profile with data from all sources
  const getCustomerComprehensiveData = async (customerName: string) => {
    if (!restaurantId || !customerName) {
      return {
        posOrders: [],
        roomBillings: [],
        reservations: [],
        stats: {
          totalPosSpend: 0,
          totalRoomSpend: 0,
          totalRoomFoodSpend: 0,
          totalLifetimeValue: 0,
          posOrderCount: 0,
          roomStayCount: 0,
          reservationCount: 0,
          avgOrderValue: 0,
          lastVisit: null,
        },
      };
    }

    // Fetch all data in parallel
    const [posOrders, roomBillings, reservations] = await Promise.all([
      getCustomerOrders(customerName),
      getCustomerRoomBillings(customerName),
      getCustomerReservations(customerName),
    ]);

    // Calculate stats
    const posOrdersOnly = posOrders.filter((o) => o.source === "pos");
    const roomFoodOrders = posOrders.filter((o) => o.source === "room_service");

    const totalPosSpend = posOrdersOnly.reduce(
      (sum, o) => sum + (o.amount || 0),
      0
    );
    const totalRoomFoodSpend = roomFoodOrders.reduce(
      (sum, o) => sum + (o.amount || 0),
      0
    );
    const totalRoomSpend = roomBillings.reduce(
      (sum, b) => sum + (b.totalAmount || 0),
      0
    );
    const totalLifetimeValue = totalPosSpend + totalRoomSpend;

    const allDates = [
      ...posOrders.map((o) => new Date(o.date)),
      ...roomBillings.map((b) => new Date(b.checkoutDate)),
    ].filter((d) => !isNaN(d.getTime()));

    const lastVisit =
      allDates.length > 0
        ? new Date(Math.max(...allDates.map((d) => d.getTime())))
        : null;

    const totalOrders = posOrdersOnly.length + roomFoodOrders.length;
    const avgOrderValue =
      totalOrders > 0 ? (totalPosSpend + totalRoomFoodSpend) / totalOrders : 0;

    return {
      posOrders: posOrdersOnly,
      roomFoodOrders,
      roomBillings,
      reservations,
      stats: {
        totalPosSpend,
        totalRoomSpend,
        totalRoomFoodSpend,
        totalLifetimeValue,
        posOrderCount: posOrdersOnly.length,
        roomFoodOrderCount: roomFoodOrders.length,
        roomStayCount: roomBillings.length,
        reservationCount: reservations.length,
        avgOrderValue,
        lastVisit: lastVisit?.toISOString() || null,
      },
    };
  };

  // Add note mutation
  const addNote = useMutation({
    mutationFn: async ({
      customerId,
      content,
      createdBy,
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
            created_by: createdBy,
          },
        ])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({
        queryKey: ["customer-notes", customerId],
      });
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
      description,
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
          },
        ])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({
        queryKey: ["customer-activities", customerId],
      });
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
            tags: customer.tags || [],
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
              tags: customer.tags || [],
            },
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
      tags,
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
        description: "Customer tags were updated",
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

  // Delete customer mutation
  const deleteCustomer = useMutation({
    mutationFn: async (customerId: string) => {
      // First delete related records
      await supabase
        .from("customer_notes")
        .delete()
        .eq("customer_id", customerId);
      await supabase
        .from("customer_activities")
        .delete()
        .eq("customer_id", customerId);

      // Then delete the customer
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Customer Deleted",
        description: "The customer has been successfully deleted.",
      });
    },
    onError: (error) => {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "There was a problem deleting the customer.",
        variant: "destructive",
      });
    },
  });

  return {
    customers,
    isLoadingCustomers,
    customersError,
    getCustomerNotes,
    getCustomerActivities,
    getCustomerOrders,
    getCustomerRoomBillings,
    getCustomerReservations,
    getCustomerComprehensiveData,
    addNote,
    addActivity,
    saveCustomer,
    updateTags,
    deleteCustomer,
    refetchCustomers,
  };
};
