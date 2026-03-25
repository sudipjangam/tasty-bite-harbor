import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import CustomerList from "@/components/CRM/CustomerList";
import CustomerFullProfile from "@/components/CRM/CustomerFullProfile";
import CustomerDialog from "@/components/CRM/CustomerDialog";
import RealtimeCustomers from "@/components/CRM/RealtimeCustomers";
import QRCodeGenerator from "@/components/CRM/QRCodeGenerator";
import { Customer } from "@/types/customer";
import { LoyaltyProgramDB, LoyaltyTierDB } from "@/types/loyalty";
import {
  User,
  Users,
  TrendingUp,
  Heart,
  QrCode,
  Merge,
  Settings,
  Crown,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Star,
  Gift,
} from "lucide-react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { supabase } from "@/integrations/supabase/client";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const Customers = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showPointsSettings, setShowPointsSettings] = useState(false);
  const [showTierManager, setShowTierManager] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTierDB | null>(null);
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();

  const {
    customers,
    isLoadingCustomers,
    saveCustomer,
    deleteCustomer,
    getCustomerNotes,
    getCustomerActivities,
    getCustomerOrders,
    addNote,
    updateTags,
    getAllRoomBillings,
    mergeDuplicateCustomers,
  } = useCustomerData();

  // Fetch loyalty program settings
  const { data: loyaltyProgram } = useQuery({
    queryKey: ["loyalty-program", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data, error } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .single();
      if (error && error.code !== "PGRST116") return null;
      return data as LoyaltyProgramDB | null;
    },
    enabled: !!restaurantId,
  });

  // Fetch loyalty tiers
  const { data: loyaltyTiers = [] } = useQuery({
    queryKey: ["loyalty-tiers", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("loyalty_tiers")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("display_order");
      if (error) return [];
      return (data || []).map((t) => ({
        ...t,
        min_spent: t.min_spent ?? 0,
        min_visits: t.min_visits ?? 0,
        points_multiplier: t.points_multiplier ?? 1,
        color: t.color ?? "bg-gray-500",
        benefits: Array.isArray(t.benefits) ? t.benefits : [],
      })) as LoyaltyTierDB[];
    },
    enabled: !!restaurantId,
  });

  const [pointsPerAmount, setPointsPerAmount] = useState(1);
  const [spendThreshold, setSpendThreshold] = useState(100);
  const [amountPerPoint, setAmountPerPoint] = useState(1);
  const [pointsExpiryDays, setPointsExpiryDays] = useState<number | null>(null);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [maxRedemptionPercentage, setMaxRedemptionPercentage] = useState(100);

  useEffect(() => {
    if (loyaltyProgram) {
      setPointsPerAmount(loyaltyProgram.points_per_amount ?? 1);
      setSpendThreshold((loyaltyProgram as any).spend_threshold ?? 100);
      setAmountPerPoint(loyaltyProgram.amount_per_point ?? 1);
      setPointsExpiryDays(loyaltyProgram.points_expiry_days ?? null);
      setLoyaltyEnabled(loyaltyProgram.is_enabled ?? true);
      setMaxRedemptionPercentage(
        (loyaltyProgram as any).max_redemption_percentage ?? 100,
      );
    }
  }, [loyaltyProgram]);

  // Save program settings
  const saveProgramSettings = async () => {
    if (!restaurantId) return;
    const settings = {
      is_enabled: loyaltyEnabled,
      points_per_amount: pointsPerAmount,
      spend_threshold: spendThreshold,
      amount_per_point: amountPerPoint,
      points_expiry_days: pointsExpiryDays,
      max_redemption_percentage: maxRedemptionPercentage,
    };
    try {
      if (loyaltyProgram) {
        await supabase
          .from("loyalty_programs")
          .update(settings)
          .eq("id", loyaltyProgram.id);
      } else {
        await supabase
          .from("loyalty_programs")
          .insert([{ ...settings, restaurant_id: restaurantId }]);
      }
      queryClient.invalidateQueries({ queryKey: ["loyalty-program"] });
      setShowPointsSettings(false);
      toast({ title: "Loyalty settings saved!" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Save tier mutation
  const saveTierMutation = useMutation({
    mutationFn: async (tier: Partial<LoyaltyTierDB> & { id?: string }) => {
      if (!restaurantId) throw new Error("No restaurant ID");
      const tierData = {
        name: tier.name,
        points_required: tier.points_required || 0,
        min_spent: tier.min_spent || 0,
        min_visits: tier.min_visits || 0,
        points_multiplier: tier.points_multiplier || 1,
        benefits: tier.benefits || [],
        color: tier.color || "bg-gray-500",
        display_order: tier.display_order ?? loyaltyTiers.length,
        restaurant_id: restaurantId,
      };
      if (tier.id && !tier.id.startsWith("default-")) {
        const { error } = await supabase
          .from("loyalty_tiers")
          .update(tierData)
          .eq("id", tier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("loyalty_tiers")
          .insert([tierData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-tiers"] });
      setEditingTier(null);
      toast({ title: "Tier saved successfully" });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Delete tier mutation
  const deleteTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const { error } = await supabase
        .from("loyalty_tiers")
        .delete()
        .eq("id", tierId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-tiers"] });
      toast({ title: "Tier deleted" });
    },
  });

  // State for enriched customers with comprehensive data
  const [enrichedCustomers, setEnrichedCustomers] = useState<Customer[]>([]);
  const [roomBillingsMap, setRoomBillingsMap] = useState<
    Record<string, number>
  >({});

  // Fetch all room billings on mount to calculate global stats
  useEffect(() => {
    const fetchRoomBillings = async () => {
      const billings = await getAllRoomBillings();

      // Aggregate room spend by customer name (normalized)
      const spendMap: Record<string, number> = {};
      billings.forEach((bill) => {
        if (bill.customerName) {
          const normalizedName = bill.customerName.toLowerCase().trim();
          spendMap[normalizedName] =
            (spendMap[normalizedName] || 0) + bill.totalAmount;
        }
      });
      setRoomBillingsMap(spendMap);
    };

    fetchRoomBillings();
  }, []);

  // Update enriched customers when customers or room billings change
  useEffect(() => {
    if (customers.length > 0) {
      const enriched = customers.map((customer) => {
        const normalizedName = customer.name.toLowerCase().trim();
        const roomSpend = roomBillingsMap[normalizedName] || 0;

        return {
          ...customer,
          // Add a temporary field for comprehensive total spent (POS + Room)
          // We can use this in the UI
          total_spent: customer.total_spent + roomSpend,
        };
      });
      setEnrichedCustomers(enriched);
    }
  }, [customers, roomBillingsMap]);

  // Customer orders query - includes all order types
  const {
    data: customerOrders = [],
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["customer-orders", selectedCustomer?.name], // Using name to fetch orders
    queryFn: () =>
      selectedCustomer
        ? getCustomerOrders(selectedCustomer.name)
        : Promise.resolve([]),
    enabled: !!selectedCustomer,
  });

  // Customer notes query
  const { data: customerNotes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["customer-notes", selectedCustomer?.id],
    queryFn: () =>
      selectedCustomer
        ? getCustomerNotes(selectedCustomer.id)
        : Promise.resolve([]),
    enabled: !!selectedCustomer,
  });

  // Customer activities query
  const { data: customerActivities = [], refetch: refetchActivities } =
    useQuery({
      queryKey: ["customer-activities", selectedCustomer?.id],
      queryFn: () =>
        selectedCustomer
          ? getCustomerActivities(selectedCustomer.id)
          : Promise.resolve([]),
      enabled: !!selectedCustomer,
    });

  // Use enriched customers for stats if available, otherwise fallback to basic customers
  const displayCustomers =
    enrichedCustomers.length > 0 ? enrichedCustomers : customers;

  // Update selected customer when the displayCustomers array changes
  useEffect(() => {
    if (selectedCustomer && displayCustomers.length > 0) {
      const updatedCustomer = displayCustomers.find(
        (c) => c.id === selectedCustomer.id,
      );
      if (updatedCustomer) {
        // Only update if data actually changed to avoid infinite loops
        // Only check if total_spent changed, which is what we modified
        if (updatedCustomer.total_spent !== selectedCustomer.total_spent) {
          setSelectedCustomer(updatedCustomer);
        }
      }
    }
  }, [displayCustomers, selectedCustomer]);

  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    // Ensure we select the enriched version if available
    const enriched =
      displayCustomers.find((c) => c.id === customer.id) || customer;
    setSelectedCustomer(enriched);
  };

  // Handle add customer button
  const handleAddCustomer = () => {
    setCustomerToEdit(null);
    setDialogOpen(true);
  };

  // Handle edit customer button
  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    setDialogOpen(true);
  };

  // Handle filter button click
  const handleFilterCustomers = (filters: any) => {
    // Implement filtering logic
    console.log("Filter applied:", filters);
  };

  // Handle add note - uses actual logged in user's name
  const handleAddNote = (customerId: string, content: string) => {
    if (content.trim()) {
      // Get the user's display name from auth context
      const userName =
        user?.first_name && user?.last_name
          ? `${user.first_name} ${user.last_name}`.trim()
          : user?.first_name || user?.email?.split("@")[0] || "Staff Member";

      addNote.mutate(
        {
          customerId,
          content,
          createdBy: userName,
        },
        {
          onSuccess: () => {
            refetchNotes();
            refetchActivities();
          },
        },
      );
    }
  };

  // Handle add tag
  const handleAddTag = (customerId: string, tag: string) => {
    if (!tag.trim()) return;

    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      const updatedTags = [...(customer.tags || [])];
      if (!updatedTags.includes(tag)) {
        updatedTags.push(tag);
        updateTags.mutate({ customerId, tags: updatedTags });
      }
    }
  };

  // Handle remove tag
  const handleRemoveTag = (customerId: string, tag: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer && customer.tags) {
      const updatedTags = customer.tags.filter((t) => t !== tag);
      updateTags.mutate({ customerId, tags: updatedTags });
    }
  };

  // Handle customer updates
  const handleUpdateCustomer = (
    customer: Customer,
    updates: Partial<Customer>,
  ) => {
    const updatedCustomer = { ...customer, ...updates };
    setSelectedCustomer(updatedCustomer);
    // The actual database update is handled by the LoyaltyManagement component
  };

  // Total spent from all sources (POS + Room) - using enriched data
  const totalSpent = displayCustomers.reduce(
    (sum, customer) => sum + customer.total_spent,
    0,
  );

  // Average order value calculation
  const totalVisits = displayCustomers.reduce(
    (sum, customer) => sum + customer.visit_count,
    0,
  );
  const averageOrderValue = totalVisits > 0 ? totalSpent / totalVisits : 0;

  // Loyal customers: Gold tier and above (Diamond, Platinum, Gold)
  const loyalCustomers = displayCustomers.filter(
    (customer) =>
      customer.loyalty_tier === "Diamond" ||
      customer.loyalty_tier === "Platinum" ||
      customer.loyalty_tier === "Gold",
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-950">
      {/* Enable real-time updates for all customer-related data */}
      <RealtimeCustomers />

      {/* Modern Header with Stats */}
      <div className="p-6 pb-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              Customer Relationship Management
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 ml-12">
            Build lasting relationships and track customer data
          </p>

          {/* QR Code Button */}
          <Dialog open={showQRGenerator} onOpenChange={setShowQRGenerator}>
            <DialogTrigger asChild>
              <Button className="ml-12 mt-3 gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                <QrCode className="h-4 w-4" />
                Get Enrollment QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Customer Self-Enrollment</DialogTitle>
              </DialogHeader>
              <QRCodeGenerator />
            </DialogContent>
          </Dialog>

          {/* Merge Duplicates Button */}
          <Button
            variant="outline"
            className="ml-2 mt-3 gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
            onClick={() => mergeDuplicateCustomers.mutate()}
            disabled={mergeDuplicateCustomers.isPending}
          >
            <Merge className="h-4 w-4" />
            {mergeDuplicateCustomers.isPending
              ? "Merging..."
              : "Merge Duplicates"}
          </Button>

          {/* Loyalty Points Settings */}
          <Dialog
            open={showPointsSettings}
            onOpenChange={setShowPointsSettings}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="ml-2 mt-3 gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
              >
                <Settings className="h-4 w-4" />
                Loyalty Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-0">
              {/* Premium gradient header */}
              <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-5 sm:p-6 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-white text-lg font-bold">
                      Loyalty Program Settings
                    </DialogTitle>
                    <DialogDescription className="text-emerald-100 text-sm mt-0.5">
                      Configure how customers earn & redeem points
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-5">
                {/* Toggle Section */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/60 dark:to-gray-800/40 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg ${loyaltyEnabled ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-gray-200 dark:bg-gray-700"}`}
                    >
                      <Star
                        className={`h-4 w-4 ${loyaltyEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">
                        Loyalty Program
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {loyaltyEnabled
                          ? "Customers earn points on every order"
                          : "Points earning is paused"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className={`rounded-full px-4 font-semibold shadow-sm transition-all ${
                      loyaltyEnabled
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                        : "bg-gray-300 hover:bg-gray-400 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                    }`}
                    onClick={() => setLoyaltyEnabled(!loyaltyEnabled)}
                  >
                    {loyaltyEnabled ? "✓ Active" : "Inactive"}
                  </Button>
                </div>

                <div className={`space-y-5 transition-all ${!loyaltyEnabled ? 'opacity-40 blur-[1px] pointer-events-none select-none' : ''}`}>
                {/* How Points Are Earned */}
                <div className="rounded-xl border border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/80 to-indigo-50/50 dark:from-purple-900/20 dark:to-indigo-900/10 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-bold text-purple-800 dark:text-purple-300">
                      How Points Are Earned
                    </h3>
                  </div>

                  {/* Simple sentence: On every ₹[X] spend, customer earns [Y] points */}
                  <div className="rounded-lg bg-purple-100/60 dark:bg-purple-900/30 p-3">
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                      On every <span className="font-bold text-purple-600 dark:text-purple-300">₹{spendThreshold || '___'}</span> spend, customer earns <span className="font-bold text-purple-600 dark:text-purple-300">{pointsPerAmount || '___'}</span> points
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <span className="p-0.5 bg-purple-200 dark:bg-purple-800 rounded">
                          💰
                        </span>
                        For every ₹ (spend)
                      </Label>
                      <Input
                        type="number"
                        value={spendThreshold}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSpendThreshold(val === "" ? ("" as any) : Number(val));
                        }}
                        placeholder="e.g. 50"
                        className="border-purple-200 dark:border-purple-700 focus:ring-purple-500 bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <span className="p-0.5 bg-purple-200 dark:bg-purple-800 rounded">
                          ⭐
                        </span>
                        Points earned
                      </Label>
                      <Input
                        type="number"
                        value={pointsPerAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPointsPerAmount(val === "" ? ("" as any) : Number(val));
                        }}
                        placeholder="e.g. 10"
                        className="border-purple-200 dark:border-purple-700 focus:ring-purple-500 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </div>

                {/* How Points Are Used */}
                <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/10 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                      How Points Are Used
                    </h3>
                  </div>

                  <div className="rounded-lg bg-amber-100/60 dark:bg-amber-900/30 p-3">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      1 point = <span className="font-bold text-amber-600 dark:text-amber-300">₹{amountPerPoint || '___'}</span> discount · Customer can use points for up to <span className="font-bold text-amber-600 dark:text-amber-300">{maxRedemptionPercentage || '___'}%</span> of the bill
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <span className="p-0.5 bg-amber-200 dark:bg-amber-800 rounded">
                          💎
                        </span>
                        1 point = ₹ ?
                      </Label>
                      <Input
                        type="number"
                        value={amountPerPoint}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAmountPerPoint(val === "" ? ("" as any) : Number(val));
                        }}
                        placeholder="e.g. 1"
                        className="border-amber-200 dark:border-amber-700 focus:ring-amber-500 bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <span className="p-0.5 bg-amber-200 dark:bg-amber-800 rounded">
                          🛡️
                        </span>
                        Max bill % payable by points
                      </Label>
                      <Input
                        type="number"
                        value={maxRedemptionPercentage}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setMaxRedemptionPercentage("" as any);
                          } else {
                            setMaxRedemptionPercentage(Number(val));
                          }
                        }}
                        placeholder="e.g. 50"
                        className="border-amber-200 dark:border-amber-700 focus:ring-amber-500 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Points Expiry */}
                <div className="rounded-xl border border-rose-200 dark:border-rose-800/50 bg-gradient-to-br from-rose-50/60 to-pink-50/40 dark:from-rose-900/15 dark:to-pink-900/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⏳</span>
                    <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">
                      Points Expiry
                    </h3>
                  </div>
                  <div className="max-w-xs space-y-1.5">
                    <Label className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                      Expire after how many days?
                    </Label>
                    <Input
                      type="number"
                      value={pointsExpiryDays || ""}
                      onChange={(e) =>
                        setPointsExpiryDays(
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      placeholder="Leave empty = never expire"
                      className="border-rose-200 dark:border-rose-700 focus:ring-rose-500 bg-white dark:bg-gray-800"
                    />
                    <p className="text-[11px] text-rose-500 dark:text-rose-400">
                      {pointsExpiryDays
                        ? `Points will expire ${pointsExpiryDays} days after last visit`
                        : "Points will never expire ✓"}
                    </p>
                  </div>
                </div>

                {/* Live Preview */}
                {loyaltyProgram && (
                  <div className="rounded-xl overflow-hidden border border-indigo-200 dark:border-indigo-800/50">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>📋</span> Summary
                      </p>
                    </div>
                    <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 space-y-1.5">
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-700 text-xs">
                          ₹{spendThreshold} → {pointsPerAmount} pts
                        </Badge>
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-700 text-xs">
                          1 pt = ₹{amountPerPoint}
                        </Badge>
                        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border-rose-200 dark:border-rose-700 text-xs">
                          Max {maxRedemptionPercentage}% of bill
                        </Badge>
                        <Badge
                          className={`text-xs ${pointsExpiryDays ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-700" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"}`}
                        >
                          {pointsExpiryDays
                            ? `Expires in ${pointsExpiryDays} days`
                            : "No expiry ✓"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <Button
                  className="w-full py-5 rounded-xl font-bold text-base bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.01]"
                  onClick={saveProgramSettings}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Manage Tiers */}
          <Dialog
            open={showTierManager}
            onOpenChange={(open) => {
              setShowTierManager(open);
              if (!open) setEditingTier(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="ml-2 mt-3 gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
              >
                <Crown className="h-4 w-4" />
                Manage Tiers
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] max-h-[85vh]">
              <DialogHeader>
                <DialogTitle>
                  {editingTier
                    ? `${editingTier.id ? "Edit" : "Create"} Tier`
                    : "Manage Loyalty Tiers"}
                </DialogTitle>
                <DialogDescription>
                  {editingTier
                    ? "Set spending thresholds, visit requirements, and benefits for this tier"
                    : "Customize your loyalty tiers — set different levels based on spending and visits"}
                </DialogDescription>
              </DialogHeader>

              {editingTier ? (
                /* Tier Edit Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tier Name</Label>
                      <Input
                        value={editingTier.name}
                        onChange={(e) =>
                          setEditingTier({
                            ...editingTier,
                            name: e.target.value,
                          })
                        }
                        placeholder="e.g. Gold, VIP"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Points Required</Label>
                      <Input
                        type="number"
                        value={editingTier.points_required}
                        onChange={(e) =>
                          setEditingTier({
                            ...editingTier,
                            points_required: Number(e.target.value),
                          })
                        }
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Total Spend (₹)</Label>
                      <Input
                        type="number"
                        value={editingTier.min_spent}
                        onChange={(e) =>
                          setEditingTier({
                            ...editingTier,
                            min_spent: Number(e.target.value),
                          })
                        }
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Visits</Label>
                      <Input
                        type="number"
                        value={editingTier.min_visits}
                        onChange={(e) =>
                          setEditingTier({
                            ...editingTier,
                            min_visits: Number(e.target.value),
                          })
                        }
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Points Multiplier</Label>
                      <Input
                        type="number"
                        value={editingTier.points_multiplier}
                        onChange={(e) =>
                          setEditingTier({
                            ...editingTier,
                            points_multiplier: Number(e.target.value),
                          })
                        }
                        min="1"
                        step="0.1"
                      />
                      <p className="text-xs text-gray-500">
                        Higher-tier customers earn more points per order
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Display Order</Label>
                      <Input
                        type="number"
                        value={editingTier.display_order}
                        onChange={(e) =>
                          setEditingTier({
                            ...editingTier,
                            display_order: Number(e.target.value),
                          })
                        }
                        min="0"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingTier(null)}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => saveTierMutation.mutate(editingTier)}
                      disabled={!editingTier.name || saveTierMutation.isPending}
                    >
                      {saveTierMutation.isPending
                        ? "Saving..."
                        : editingTier.id
                          ? "Update Tier"
                          : "Create Tier"}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                /* Tier List */
                <ScrollArea className="max-h-[55vh]">
                  <div className="space-y-3">
                    {loyaltyTiers.length === 0 && (
                      <p className="text-center text-gray-500 py-6">
                        No tiers configured yet. Add your first tier below.
                      </p>
                    )}
                    {loyaltyTiers.map((tier) => (
                      <div
                        key={tier.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${tier.color}`}
                          />
                          <div>
                            <p className="font-semibold">{tier.name}</p>
                            <p className="text-xs text-gray-500">
                              ₹{tier.min_spent} min spend · {tier.min_visits}{" "}
                              visits · {tier.points_multiplier}× points
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTier(tier)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteTierMutation.mutate(tier.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-dashed"
                      onClick={() =>
                        setEditingTier({
                          id: "",
                          restaurant_id: restaurantId || "",
                          name: "",
                          points_required: 0,
                          min_spent: 0,
                          min_visits: 0,
                          points_multiplier: 1,
                          benefits: [],
                          color: "bg-gray-500",
                          display_order: loyaltyTiers.length,
                          created_at: "",
                          updated_at: "",
                        })
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Add New Tier
                    </Button>
                  </div>
                </ScrollArea>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Customers
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {customers.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  <CurrencyDisplay
                    amount={totalSpent}
                    className="text-2xl font-bold text-gray-900 dark:text-white"
                  />
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Order Value
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  <CurrencyDisplay
                    amount={Number(averageOrderValue.toFixed(2))}
                    className="text-2xl font-bold text-gray-900 dark:text-white"
                  />
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Loyal Customers
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loyalCustomers}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoadingCustomers && customers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="animate-pulse space-y-4 w-full max-w-md">
            <div className="h-8 w-48 bg-white/50 rounded mb-4"></div>
            <div className="h-64 bg-white/50 rounded"></div>
            <div className="h-32 bg-white/50 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-320px)]">
            <div className="lg:col-span-5 xl:col-span-4 h-full">
              <CustomerList
                customers={displayCustomers}
                loading={isLoadingCustomers}
                selectedCustomerId={selectedCustomer?.id || null}
                onSelectCustomer={handleSelectCustomer}
                onAddCustomer={handleAddCustomer}
                onFilterCustomers={handleFilterCustomers}
              />
            </div>

            <div className="lg:col-span-7 xl:col-span-8 h-full">
              {customers.length === 0 ? (
                <div className="h-full bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center p-8">
                  <div className="rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 p-6 mb-4">
                    <User className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    No Customers Found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">
                    Your customer database is empty. Add your first customer to
                    get started with the CRM module.
                  </p>
                  <button
                    className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl transform hover:scale-105"
                    onClick={handleAddCustomer}
                  >
                    Add Your First Customer
                  </button>
                </div>
              ) : (
                <CustomerFullProfile
                  customer={selectedCustomer}
                  notes={customerNotes}
                  activities={customerActivities}
                  loading={isLoadingOrders}
                  onEditCustomer={handleEditCustomer}
                  onDeleteCustomer={(customerId) => {
                    deleteCustomer.mutate(customerId, {
                      onSuccess: () => {
                        setSelectedCustomer(null);
                      },
                    });
                  }}
                  onAddNote={handleAddNote}
                  onAddTag={handleAddTag}
                  onRemoveTag={handleRemoveTag}
                  onUpdateCustomer={handleUpdateCustomer}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={customerToEdit}
        onSave={saveCustomer.mutate}
        onDelete={(customerId) => {
          deleteCustomer.mutate(customerId, {
            onSuccess: () => {
              if (selectedCustomer?.id === customerId) {
                setSelectedCustomer(null);
              }
              setDialogOpen(false);
            },
          });
        }}
        isLoading={saveCustomer.isPending}
        isDeleting={deleteCustomer.isPending}
      />
    </div>
  );
};

export default Customers;
