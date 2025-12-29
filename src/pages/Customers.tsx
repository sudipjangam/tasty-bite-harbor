import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import CustomerList from "@/components/CRM/CustomerList";
import CustomerFullProfile from "@/components/CRM/CustomerFullProfile";
import CustomerDialog from "@/components/CRM/CustomerDialog";
import RealtimeCustomers from "@/components/CRM/RealtimeCustomers";
import QRCodeGenerator from "@/components/CRM/QRCodeGenerator";
import { Customer } from "@/types/customer";
import { User, Users, TrendingUp, Heart, QrCode } from "lucide-react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Customers = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [showQRGenerator, setShowQRGenerator] = useState(false);

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
  } = useCustomerData();

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
        (c) => c.id === selectedCustomer.id
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
        }
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
    updates: Partial<Customer>
  ) => {
    const updatedCustomer = { ...customer, ...updates };
    setSelectedCustomer(updatedCustomer);
    // The actual database update is handled by the LoyaltyManagement component
  };

  // Total spent from all sources (POS + Room) - using enriched data
  const totalSpent = displayCustomers.reduce(
    (sum, customer) => sum + customer.total_spent,
    0
  );

  // Average order value calculation
  const totalVisits = displayCustomers.reduce(
    (sum, customer) => sum + customer.visit_count,
    0
  );
  const averageOrderValue = totalVisits > 0 ? totalSpent / totalVisits : 0;

  // Loyal customers: Gold tier and above (Diamond, Platinum, Gold)
  const loyalCustomers = displayCustomers.filter(
    (customer) =>
      customer.loyalty_tier === "Diamond" ||
      customer.loyalty_tier === "Platinum" ||
      customer.loyalty_tier === "Gold"
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
