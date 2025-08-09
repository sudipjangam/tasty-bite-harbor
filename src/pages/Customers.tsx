
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import CustomerList from "@/components/CRM/CustomerList";
import CustomerDetail from "@/components/CRM/CustomerDetail";
import CustomerDialog from "@/components/CRM/CustomerDialog";
import RealtimeCustomers from "@/components/CRM/RealtimeCustomers";
import { Customer } from "@/types/customer";
import { User, Users, TrendingUp, Heart } from "lucide-react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { CurrencyDisplay } from "@/components/ui/currency-display";

const Customers = () => {
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  
  const {
    customers,
    isLoadingCustomers,
    saveCustomer,
    getCustomerNotes,
    getCustomerActivities,
    getCustomerOrders,
    addNote,
    updateTags
  } = useCustomerData();

  // Customer orders query - includes all order types
  const { 
    data: customerOrders = [], 
    isLoading: isLoadingOrders,
    refetch: refetchOrders
  } = useQuery({
    queryKey: ["customer-orders", selectedCustomer?.name], // Using name to fetch orders
    queryFn: () => selectedCustomer ? getCustomerOrders(selectedCustomer.name) : Promise.resolve([]),
    enabled: !!selectedCustomer,
  });

  // Customer notes query
  const {
    data: customerNotes = [],
    refetch: refetchNotes
  } = useQuery({
    queryKey: ["customer-notes", selectedCustomer?.id],
    queryFn: () => selectedCustomer ? getCustomerNotes(selectedCustomer.id) : Promise.resolve([]),
    enabled: !!selectedCustomer,
  });

  // Customer activities query
  const {
    data: customerActivities = [],
    refetch: refetchActivities
  } = useQuery({
    queryKey: ["customer-activities", selectedCustomer?.id],
    queryFn: () => selectedCustomer ? getCustomerActivities(selectedCustomer.id) : Promise.resolve([]),
    enabled: !!selectedCustomer,
  });

  // Update selected customer when the customers array changes
  useEffect(() => {
    if (selectedCustomer && customers.length > 0) {
      const updatedCustomer = customers.find(c => c.id === selectedCustomer.id);
      if (updatedCustomer) {
        setSelectedCustomer(updatedCustomer);
      }
    }
  }, [customers, selectedCustomer]);

  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
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

  // Handle add note
  const handleAddNote = (customerId: string, content: string) => {
    if (content.trim()) {
      addNote.mutate(
        { 
          customerId, 
          content, 
          createdBy: "Staff Member" // You could get the actual staff name from context or state
        },
        {
          onSuccess: () => {
            refetchNotes();
            refetchActivities();
          }
        }
      );
    }
  };

  // Handle add tag
  const handleAddTag = (customerId: string, tag: string) => {
    if (!tag.trim()) return;
    
    const customer = customers.find(c => c.id === customerId);
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
    const customer = customers.find(c => c.id === customerId);
    if (customer && customer.tags) {
      const updatedTags = customer.tags.filter(t => t !== tag);
      updateTags.mutate({ customerId, tags: updatedTags });
    }
  };

  // Handle customer updates
  const handleUpdateCustomer = (customer: Customer, updates: Partial<Customer>) => {
    const updatedCustomer = { ...customer, ...updates };
    setSelectedCustomer(updatedCustomer);
    // The actual database update is handled by the LoyaltyManagement component
  };

  const totalSpent = customers.reduce((sum, customer) => sum + customer.total_spent, 0);
  const averageOrderValue = customers.length > 0 ? totalSpent / customers.reduce((sum, customer) => sum + customer.visit_count, 0) || 0 : 0;
  const loyalCustomers = customers.filter(customer => customer.loyalty_tier === 'Diamond' || customer.loyalty_tier === 'Platinum').length;

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
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{customers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  <CurrencyDisplay amount={totalSpent} className="text-2xl font-bold text-gray-900 dark:text-white" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  <CurrencyDisplay amount={averageOrderValue} className="text-2xl font-bold text-gray-900 dark:text-white" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Loyal Customers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{loyalCustomers}</p>
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
                customers={customers}
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
                <CustomerDetail
                  customer={selectedCustomer}
                  orders={customerOrders}
                  notes={customerNotes}
                  activities={customerActivities}
                  loading={isLoadingOrders}
                  onEditCustomer={handleEditCustomer}
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
        isLoading={saveCustomer.isPending}
      />
    </div>
  );
};

export default Customers;
