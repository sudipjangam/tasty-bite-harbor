
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import CustomerList from "@/components/CRM/CustomerList";
import CustomerDetail from "@/components/CRM/CustomerDetail";
import CustomerDialog from "@/components/CRM/CustomerDialog";
import RealtimeCustomers from "@/components/CRM/RealtimeCustomers";
import { Customer } from "@/types/customer";
import { User } from "lucide-react";
import { useCustomerData } from "@/hooks/useCustomerData";

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

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Enable real-time updates for all customer-related data */}
      <RealtimeCustomers />
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Customer Relationship Management
        </h1>
        <p className="text-muted-foreground">
          Manage your customer relationships and track customer data
        </p>
      </div>

      {isLoadingCustomers && customers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse space-y-4 w-full max-w-md">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          <div className="lg:col-span-5 xl:col-span-4 h-[calc(100vh-180px)] overflow-hidden">
            <CustomerList
              customers={customers}
              loading={isLoadingCustomers}
              selectedCustomerId={selectedCustomer?.id || null}
              onSelectCustomer={handleSelectCustomer}
              onAddCustomer={handleAddCustomer}
              onFilterCustomers={handleFilterCustomers}
            />
          </div>

          <div className="lg:col-span-7 xl:col-span-8 h-[calc(100vh-180px)] overflow-hidden">
            {customers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-4">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium">No Customers Found</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">
                  Your customer database is empty. Add your first customer to get started with the CRM module.
                </p>
                <button
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
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
              />
            )}
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
