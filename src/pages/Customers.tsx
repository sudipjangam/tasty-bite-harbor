import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import CustomerList from "@/components/CRM/CustomerList";
import CustomerFullProfile from "@/components/CRM/CustomerFullProfile";
import CustomerDialog from "@/components/CRM/CustomerDialog";
import RealtimeCustomers from "@/components/CRM/RealtimeCustomers";
import QRCodeGenerator from "@/components/CRM/QRCodeGenerator";
import { CustomerStatsStrip } from "@/components/CRM/CustomerStatsStrip";
import { LoyaltyProgramSettingsDialog } from "@/components/CRM/dialogs/LoyaltyProgramSettingsDialog";
import { LoyaltyTierManagerDialog } from "@/components/CRM/dialogs/LoyaltyTierManagerDialog";
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
  ChevronLeft,
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
import { FeatureLock } from "@/components/Auth/FeatureLock";

import { useIsMobile } from "@/hooks/use-mobile";

const Customers = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showPointsSettings, setShowPointsSettings] = useState(false);
  const [showTierManager, setShowTierManager] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTierDB | null>(null);
  const { restaurantId, restaurantName } = useRestaurantId();
  const queryClient = useQueryClient();
  // Mobile navigation: 'list' shows customer list, 'detail' shows customer profile
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

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
      setSpendThreshold((loyaltyProgram as any).spend_threshold ?? 10);
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
    // On mobile, slide to detail view
    if (window.innerWidth < 1024) {
      setMobileView('detail');
    }
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
    <FeatureLock feature="customers.basic" interceptClicks={true}>
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-950">
      {/* Enable real-time updates for all customer-related data */}
      <RealtimeCustomers />

      {/* Modern Header with Stats */}
      <div className="p-3 sm:p-6 pb-2 sm:pb-4 flex-shrink-0">
        {isMobile ? (
          <div className="mb-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-purple-200/60 dark:border-purple-500/20 rounded-2xl p-2.5 shadow-md">
            {/* Row 1: Header + Action buttons */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="p-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white shadow-sm flex-shrink-0">
                  <Heart className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                    Customer CRM
                  </h1>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {restaurantName || "Loyalty & Rewards"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* QR Code Button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-900/30 rounded-lg"
                  onClick={() => setShowQRGenerator(true)}
                  title="Enrollment QR Code"
                >
                  <QrCode className="h-3.5 w-3.5" />
                </Button>

                {/* Loyalty Settings Button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/30 rounded-lg"
                  onClick={() => setShowPointsSettings(true)}
                  title="Loyalty Settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>

                {/* Manage Tiers Button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/30 rounded-lg"
                  onClick={() => setShowTierManager(true)}
                  title="Manage Tiers"
                >
                  <Crown className="h-3.5 w-3.5" />
                </Button>

                {/* Merge Duplicates Button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 rounded-lg"
                  onClick={() => mergeDuplicateCustomers.mutate()}
                  disabled={mergeDuplicateCustomers.isPending}
                  title="Merge Duplicates"
                >
                  <Merge className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Row 2: Compact 4-pill micro stats row (<45px) */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-purple-50/60 dark:bg-gray-900/60 rounded-xl border border-purple-100 dark:border-purple-950/40">
              <div className="text-center p-1 rounded-lg bg-white/80 dark:bg-gray-800/80 shadow-xs">
                <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase leading-none mb-0.5">Total</div>
                <div className="text-xs font-extrabold text-gray-800 dark:text-gray-100 font-mono leading-none">
                  {customers.filter(c => c.id !== "walk-in-customer").length}
                </div>
              </div>
              <div className="text-center p-1 rounded-lg bg-white/80 dark:bg-gray-800/80 shadow-xs">
                <div className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase leading-none mb-0.5">Reg Rev</div>
                <div className="text-xs font-extrabold text-gray-800 dark:text-gray-100 font-mono leading-none truncate">
                  <CurrencyDisplay amount={totalSpent - (displayCustomers.find(c => c.id === 'walk-in-customer')?.total_spent || 0)} />
                </div>
              </div>
              <div className="text-center p-1 rounded-lg bg-white/80 dark:bg-gray-800/80 shadow-xs">
                <div className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase leading-none mb-0.5">Walk In</div>
                <div className="text-xs font-extrabold text-gray-800 dark:text-gray-100 font-mono leading-none truncate">
                  <CurrencyDisplay amount={displayCustomers.find(c => c.id === 'walk-in-customer')?.total_spent || 0} />
                </div>
              </div>
              <div className="text-center p-1 rounded-lg bg-white/80 dark:bg-gray-800/80 shadow-xs">
                <div className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase leading-none mb-0.5">Loyal</div>
                <div className="text-xs font-extrabold text-gray-800 dark:text-gray-100 font-mono leading-none">
                  {loyalCustomers}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Header */
          <div className="mb-4 sm:mb-6">
            {/* Title Row */}
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg flex-shrink-0">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                {restaurantName && (
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-purple-300 mb-0.5">
                    {restaurantName}
                  </p>
                )}
                <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent leading-tight">
                  Customer Relationship Management
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Build lasting relationships and track customer data
                </p>
              </div>
            </div>

            {/* Action Buttons — responsive flex-wrap row */}
            <div className="flex flex-wrap gap-2 mt-3">
              {/* QR Code Button */}
              <Button
                size="sm"
                className="gap-1.5 text-xs sm:text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30 text-white"
                onClick={() => setShowQRGenerator(true)}
              >
                <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Get Enrollment QR Code</span>
              </Button>

              {/* Merge Duplicates Button */}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs sm:text-sm border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
                onClick={() => mergeDuplicateCustomers.mutate()}
                disabled={mergeDuplicateCustomers.isPending}
              >
                <Merge className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {mergeDuplicateCustomers.isPending ? "Merging..." : "Merge Duplicates"}
              </Button>

              {/* Loyalty Points Settings */}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs sm:text-sm border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                onClick={() => setShowPointsSettings(true)}
              >
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Loyalty Settings
              </Button>

              {/* Manage Tiers */}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs sm:text-sm border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
                onClick={() => setShowTierManager(true)}
              >
                <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Manage Tiers
              </Button>
            </div>
            {/* Desktop Quick Stats Cards */}
            <CustomerStatsStrip
              totalCustomers={customers.filter((c) => c.id !== "walk-in-customer").length}
              registeredRevenue={totalSpent - (displayCustomers.find((c) => c.id === "walk-in-customer")?.total_spent || 0)}
              walkInRevenue={displayCustomers.find((c) => c.id === "walk-in-customer")?.total_spent || 0}
              totalSpent={totalSpent}
              averageOrderValue={averageOrderValue}
              totalPoints={totalPoints}
            />
          </div>
        )}
      </div>

      {/* ── Dialogs: Rendered modularly ── */}

      {/* 1. QR Code Dialog */}
      <Dialog open={showQRGenerator} onOpenChange={setShowQRGenerator}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Customer Self-Enrollment</DialogTitle>
          </DialogHeader>
          <QRCodeGenerator />
        </DialogContent>
      </Dialog>

      {/* 2. Loyalty Points Settings Dialog */}
      <LoyaltyProgramSettingsDialog
        open={showPointsSettings}
        onOpenChange={setShowPointsSettings}
        loyaltyEnabled={loyaltyEnabled}
        setLoyaltyEnabled={setLoyaltyEnabled}
        spendThreshold={spendThreshold}
        setSpendThreshold={setSpendThreshold}
        pointsPerAmount={pointsPerAmount}
        setPointsPerAmount={setPointsPerAmount}
        amountPerPoint={amountPerPoint}
        setAmountPerPoint={setAmountPerPoint}
        maxRedemptionPercentage={maxRedemptionPercentage}
        setMaxRedemptionPercentage={setMaxRedemptionPercentage}
        pointsExpiryDays={pointsExpiryDays}
        setPointsExpiryDays={setPointsExpiryDays}
        onSave={saveProgramSettings}
        saving={saveProgramMutation.isPending}
        loyaltyProgram={loyaltyProgram}
      />

      {/* 3. Manage Loyalty Tiers Dialog */}
      <LoyaltyTierManagerDialog
        open={showTierManager}
        onOpenChange={(open) => {
          setShowTierManager(open);
          if (!open) setEditingTier(null);
        }}
        loyaltyTiers={loyaltyTiers}
        editingTier={editingTier}
        setEditingTier={setEditingTier}
        onSaveTier={(tier) => saveTierMutation.mutate(tier)}
        onDeleteTier={(id) => deleteTierMutation.mutate(id)}
        isSaving={saveTierMutation.isPending}
        restaurantId={restaurantId}
      />

      {isLoadingCustomers && customers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="animate-pulse space-y-4 w-full max-w-md">
            <div className="h-8 w-48 bg-white/50 rounded mb-4"></div>
            <div className="h-64 bg-white/50 rounded"></div>
            <div className="h-32 bg-white/50 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex-1 min-h-0">

          {/* ── MOBILE: single panel at a time (hidden on lg+) ── */}
          <div className="lg:hidden h-full flex flex-col min-h-0">
            {mobileView === 'list' ? (
              /* Mobile List Screen */
              <div className="flex-1 min-h-0">
                {customers.length === 0 ? (
                  <div className="h-full bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center p-8">
                    <div className="rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 p-6 mb-4">
                      <User className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white">No Customers Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">
                      Your customer database is empty. Add your first customer to get started.
                    </p>
                    <button
                      className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200"
                      onClick={handleAddCustomer}
                    >
                      Add Your First Customer
                    </button>
                  </div>
                ) : (
                  <CustomerList
                    customers={displayCustomers}
                    loading={isLoadingCustomers}
                    selectedCustomerId={selectedCustomer?.id || null}
                    onSelectCustomer={handleSelectCustomer}
                    onAddCustomer={handleAddCustomer}
                    onFilterCustomers={handleFilterCustomers}
                  />
                )}
              </div>
            ) : (
              /* Mobile Detail Screen */
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Mobile back bar */}
                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                  <button
                    onClick={() => setMobileView('list')}
                    className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold text-sm hover:text-purple-800 dark:hover:text-purple-200 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    Back to Customers
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <CustomerFullProfile
                    customer={selectedCustomer}
                    notes={customerNotes}
                    activities={customerActivities}
                    loading={isLoadingOrders}
                    onBack={() => setMobileView('list')}
                    onEditCustomer={handleEditCustomer}
                    onDeleteCustomer={(customerId) => {
                      deleteCustomer.mutate(customerId, {
                        onSuccess: () => {
                          setSelectedCustomer(null);
                          setMobileView('list');
                        },
                      });
                    }}
                    onAddNote={handleAddNote}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                    onUpdateCustomer={handleUpdateCustomer}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── DESKTOP lg+: side-by-side (UNCHANGED) ── */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-6 h-full">
            <div className="lg:col-span-5 xl:col-span-4 h-full min-h-0">
              <CustomerList
                customers={displayCustomers}
                loading={isLoadingCustomers}
                selectedCustomerId={selectedCustomer?.id || null}
                onSelectCustomer={handleSelectCustomer}
                onAddCustomer={handleAddCustomer}
                onFilterCustomers={handleFilterCustomers}
              />
            </div>
            <div className="lg:col-span-7 xl:col-span-8 h-full min-h-0">
              {customers.length === 0 ? (
                <div className="h-full bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center p-8">
                  <div className="rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 p-6 mb-4">
                    <User className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">No Customers Found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">
                    Your customer database is empty. Add your first customer to get started with the CRM module.
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
    </FeatureLock>
  );
};

export default Customers;
