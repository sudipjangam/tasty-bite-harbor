/**
 * useCRMSync - Auto-sync customer data to CRM on payment completion.
 *
 * This hook provides a function that:
 * 1. Upserts a customer record in the `customers` table (matched by phone)
 * 2. Awards loyalty points based on `loyalty_programs.points_per_amount`
 * 3. Records a `loyalty_transactions` entry
 * 4. Links the `customer_id` back to the order
 * 5. Tracks order-count-based loyalty (e.g., every Nth order free)
 */

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface SyncCustomerParams {
  customerName: string;
  customerPhone?: string;
  orderTotal: number;
  orderId?: string;
  source: "pos" | "qsr" | "room" | "quickserve";
}

interface SyncResult {
  customerId: string;
  pointsEarned: number;
  isNewCustomer: boolean;
  orderCount: number;
  isFreeOrder: boolean;
}

export const useCRMSync = () => {
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /**
   * Sync customer to CRM after payment.
   * - Upserts customer by phone number (or name if no phone)
   * - Awards loyalty points
   * - Records transaction
   */
  const syncCustomerToCRM = useCallback(
    async (params: SyncCustomerParams): Promise<SyncResult | null> => {
      const { customerName, customerPhone, orderTotal, orderId, source } =
        params;

      // Need at least a name to sync
      if (!customerName?.trim() || !restaurantId) {
        return null;
      }

      const trimmedName = customerName.trim();
      const trimmedPhone = customerPhone?.trim() || null;

      // Skip generic/placeholder names
      const genericNames = [
        "nc",
        "delivery",
        "takeaway",
        "dine-in",
        "dine in",
        "pos order",
        "qsr order",
        "qsr-order",
        "walk-in",
        "walk in",
        "guest",
      ];
      if (genericNames.includes(trimmedName.toLowerCase())) {
        return null;
      }

      try {
        // --- Step 1: Find or create customer ---
        let customerId: string | null = null;
        let isNewCustomer = false;
        let existingOrderCount = 0;

        // Try to find existing customer by phone first (most reliable), then by name
        let existingCustomer = null;

        if (trimmedPhone) {
          const { data } = await supabase
            .from("customers")
            .select("id, name, loyalty_points, loyalty_tier, visit_count, total_spent")
            .eq("restaurant_id", restaurantId)
            .eq("phone", trimmedPhone)
            .maybeSingle();
          existingCustomer = data;
        }

        // Fallback: try matching by exact name if no phone match
        if (!existingCustomer && !trimmedPhone) {
          const { data } = await supabase
            .from("customers")
            .select("id, name, loyalty_points, loyalty_tier, visit_count, total_spent")
            .eq("restaurant_id", restaurantId)
            .eq("name", trimmedName)
            .maybeSingle();
          existingCustomer = data;
        }

        if (existingCustomer) {
          customerId = existingCustomer.id;
          existingOrderCount = existingCustomer.visit_count || 0;

          // Update existing customer: refresh name, last visit, increment visit_count and total_spent
          const currentTotalSpent = existingCustomer.total_spent || 0;
          const updates: Record<string, any> = {
            last_visit_date: new Date().toISOString(),
            visit_count: existingOrderCount + 1,
            total_spent: currentTotalSpent + orderTotal,
            average_order_value:
              (currentTotalSpent + orderTotal) / (existingOrderCount + 1),
          };

          // Update name if provided and different
          if (trimmedName && trimmedName !== existingCustomer.name) {
            updates.name = trimmedName;
          }

          // Update phone if newly provided
          if (trimmedPhone) {
            updates.phone = trimmedPhone;
          }

          await supabase
            .from("customers")
            .update(updates)
            .eq("id", customerId);
        } else {
          // Create new customer
          isNewCustomer = true;
          const { data: newCustomer, error: insertError } = await supabase
            .from("customers")
            .insert({
              name: trimmedName,
              phone: trimmedPhone,
              restaurant_id: restaurantId,
              last_visit_date: new Date().toISOString(),
              visit_count: 1,
              total_spent: orderTotal,
              average_order_value: orderTotal,
              loyalty_points: 0,
              tags: [],
            })
            .select("id")
            .single();

          if (insertError) {
            console.error("❌ CRM Sync - Failed to create customer:", insertError);
            return null;
          }
          customerId = newCustomer.id;
        }

        if (!customerId) return null;

        // --- Step 2: Link customer_id to the order ---
        if (orderId) {
          // Try updating orders table first
          await supabase
            .from("orders")
            .update({ customer_name: trimmedName, customer_phone: trimmedPhone })
            .eq("id", orderId)
            .then(() => {});

          // Also try kitchen_orders (orderId might be a kitchen_order ID)
          await supabase
            .from("kitchen_orders")
            .update({ customer_name: trimmedName, customer_phone: trimmedPhone })
            .eq("id", orderId)
            .then(() => {});
        }

        // --- Step 3: Award loyalty points ---
        let pointsEarned = 0;

        // Skip loyalty for non-chargeable orders
        if (orderTotal > 0) {
          // Fetch loyalty program settings
          const { data: loyaltyProgram } = await supabase
            .from("loyalty_programs")
            .select("is_enabled, points_per_amount, free_order_interval")
            .eq("restaurant_id", restaurantId)
            .maybeSingle();

          if (loyaltyProgram?.is_enabled !== false) {
            const pointsPerAmount = loyaltyProgram?.points_per_amount ?? 1;

            // Fetch customer's current tier to get multiplier
            let multiplier = 1;
            if (!isNewCustomer && existingCustomer) {
              const tierName = existingCustomer.loyalty_tier;
              if (tierName && tierName !== "None") {
                const { data: tier } = await supabase
                  .from("loyalty_tiers")
                  .select("points_multiplier")
                  .eq("restaurant_id", restaurantId)
                  .eq("name", tierName)
                  .maybeSingle();

                if (tier?.points_multiplier) {
                  multiplier = tier.points_multiplier;
                }
              }
            }

            // Calculate: (orderTotal / 100) * pointsPerAmount * multiplier
            pointsEarned = Math.floor(
              (orderTotal / 100) * pointsPerAmount * multiplier
            );

            if (pointsEarned > 0) {
              // Update customer points
              const currentPoints = isNewCustomer
                ? 0
                : existingCustomer?.loyalty_points || 0;

              await supabase
                .from("customers")
                .update({ loyalty_points: currentPoints + pointsEarned })
                .eq("id", customerId);

              // Record loyalty transaction
              const { data: { user } } = await supabase.auth.getUser();

              await supabase.from("loyalty_transactions").insert({
                restaurant_id: restaurantId,
                customer_id: customerId,
                transaction_type: "earn",
                points: pointsEarned,
                source: source,
                source_id: orderId || null,
                notes: `Earned ${pointsEarned} points from ${source} order of ₹${orderTotal.toFixed(2)}`,
                created_by: user?.id || null,
              });
            }
          }
        }

        // --- Step 4: Check order-count loyalty (free order) ---
        const newOrderCount = existingOrderCount + 1;
        let isFreeOrder = false;

        // Fetch free_order_interval if it exists
        const { data: programForInterval } = await supabase
          .from("loyalty_programs")
          .select("free_order_interval")
          .eq("restaurant_id", restaurantId)
          .maybeSingle();

        const freeInterval = (programForInterval as any)?.free_order_interval;
        if (freeInterval && freeInterval > 0 && newOrderCount % (freeInterval + 1) === 0) {
          isFreeOrder = true;
        }

        // --- Step 5: Invalidate queries to refresh CRM UI ---
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        queryClient.invalidateQueries({ queryKey: ["customer-orders"] });

        // --- Step 6: Show feedback ---
        const messages: string[] = [];
        if (isNewCustomer) {
          messages.push(`New customer "${trimmedName}" added to CRM`);
        }
        if (pointsEarned > 0) {
          messages.push(`+${pointsEarned} loyalty points earned`);
        }
        if (isFreeOrder) {
          messages.push(`🎉 This is their FREE order! (Order #${newOrderCount})`);
        }

        if (messages.length > 0) {
          toast({
            title: isNewCustomer ? "Customer Added to CRM" : "Customer Updated",
            description: messages.join(" • "),
          });
        }

        return {
          customerId,
          pointsEarned,
          isNewCustomer,
          orderCount: newOrderCount,
          isFreeOrder,
        };
      } catch (error) {
        console.error("❌ CRM Sync error:", error);
        // Don't show error toast — CRM sync is a best-effort side effect
        return null;
      }
    },
    [restaurantId, queryClient, toast]
  );

  return { syncCustomerToCRM };
};
