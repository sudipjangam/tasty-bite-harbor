import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SplitPortion {
  payerName: string;
  payerPhone: string;
  payerEmail?: string;
  amount: number;
  percentage: number;
  items?: string[]; // For item-based splits
}

export interface SplitBillData {
  checkInId: string;
  originalAmount: number;
  splitMethod: "percentage" | "equal" | "items";
  portions: SplitPortion[];
}

export interface SplitBillRecord {
  id: string;
  check_in_id: string;
  original_amount: number;
  split_method: string;
  num_portions: number;
  created_at: string;
  portions: {
    id: string;
    payer_name: string;
    payer_phone: string;
    amount: number;
    percentage: number;
    payment_status: string;
  }[];
}

export const useSplitBilling = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch restaurant ID
  useEffect(() => {
    const fetchRestaurantId = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("restaurant_id")
          .eq("id", user.id)
          .single();

        if (profile?.restaurant_id) {
          setRestaurantId(profile.restaurant_id);
        }
      } catch (error) {
        console.error("Error fetching restaurant ID:", error);
      }
    };

    fetchRestaurantId();
  }, []);

  // Create split bill
  const createSplitMutation = useMutation({
    mutationFn: async (data: SplitBillData) => {
      if (!restaurantId) throw new Error("No restaurant ID");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Create main split bill record
      const { data: splitBill, error: splitError } = await supabase
        .from("split_bills")
        .insert({
          restaurant_id: restaurantId,
          check_in_id: data.checkInId,
          original_amount: data.originalAmount,
          split_method: data.splitMethod,
          num_portions: data.portions.length,
          created_by: user?.id,
        })
        .select()
        .single();

      if (splitError) throw splitError;

      // 2. Create portions
      const portionsToInsert = data.portions.map((portion, index) => ({
        split_bill_id: splitBill.id,
        payer_name: portion.payerName,
        payer_phone: portion.payerPhone,
        payer_email: portion.payerEmail || null,
        amount: portion.amount,
        percentage: portion.percentage,
        payment_status: "pending",
        items: portion.items ? JSON.stringify(portion.items) : null,
        invoice_number: `INV-SPLIT-${splitBill.id
          .substring(0, 6)
          .toUpperCase()}-${index + 1}`,
      }));

      const { error: portionsError } = await supabase
        .from("split_bill_portions")
        .insert(portionsToInsert);

      if (portionsError) throw portionsError;

      return splitBill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-bills"] });
      toast({
        title: "Bill Split Created",
        description:
          "The bill has been successfully split between multiple payers",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Split Failed",
        description: "Failed to split the bill",
      });
      console.error("Split bill error:", error);
    },
  });

  // Mark portion as paid
  const markPortionPaidMutation = useMutation({
    mutationFn: async ({
      portionId,
      paymentMethod,
    }: {
      portionId: string;
      paymentMethod: string;
    }) => {
      const { error } = await supabase
        .from("split_bill_portions")
        .update({
          payment_status: "paid",
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
        })
        .eq("id", portionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-bills"] });
      toast({
        title: "Payment Recorded",
        description: "Portion marked as paid",
      });
    },
  });

  // Calculate equal split
  const calculateEqualSplit = (
    totalAmount: number,
    numPayers: number
  ): number[] => {
    const baseAmount = Math.floor((totalAmount / numPayers) * 100) / 100;
    const remainder = totalAmount - baseAmount * numPayers;

    const amounts = Array(numPayers).fill(baseAmount);
    // Add remainder to first payer
    amounts[0] = Math.round((amounts[0] + remainder) * 100) / 100;

    return amounts;
  };

  // Calculate percentage split
  const calculatePercentageSplit = (
    totalAmount: number,
    percentages: number[]
  ): number[] => {
    return percentages.map(
      (pct) => Math.round(((totalAmount * pct) / 100) * 100) / 100
    );
  };

  return {
    restaurantId,
    createSplit: createSplitMutation.mutateAsync,
    isCreating: createSplitMutation.isPending,
    markPortionPaid: markPortionPaidMutation.mutate,
    isMarkingPaid: markPortionPaidMutation.isPending,
    calculateEqualSplit,
    calculatePercentageSplit,
  };
};
