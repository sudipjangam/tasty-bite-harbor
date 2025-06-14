
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Filter, Users, TrendingUp, Calendar, Phone, Mail, Star } from "lucide-react";
import { Customer } from "@/types/customer";
import { cn } from "@/lib/utils";

interface CustomerListProps {
  customers: Customer[];
  loading?: boolean;
  selectedCustomerId?: string | null;
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: () => void;
  onFilterCustomers: (filters: any) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  loading = false,
  selectedCustomerId,
  onSelectCustomer,
  onAddCustomer,
  onFilterCustomers,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

  const getLoyaltyColor = (tier: string) => {
    switch (tier) {
      case "Diamond": return "bg-gradient-to-r from-purple-600 to-pink-600 text-white";
      case "Platinum": return "bg-gradient-to-r from-gray-400 to-gray-600 text-white";
      case "Gold": return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white";
      case "Silver": return "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800";
      case "Bronze": return "bg-gradient-to-r from-amber-600 to-amber-700 text-white";
      default: return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && customers.length === 0) {
    return (
      <div className="h-full bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl">
        <div className="p-6 border-b border-white/30">
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-white/50 rounded w-3/4"></div>
            <div className="h-4 bg-white/50 rounded w-1/2"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 border border-white/20 rounded-2xl">
                <div className="space-y-2">
                  <div className="h-4 bg-white/50 rounded w-3/4"></div>
                  <div className="h-3 bg-white/50 rounded w-1/2"></div>
                  <div className="h-3 bg-white/50 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl flex flex-col">
      <div className="p-6 border-b border-white/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customers</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {customers.length} total customers
            </p>
          </div>
          <Button 
            onClick={onAddCustomer}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/50 border-white/30 rounded-xl focus:bg-white focus:border-purple-300"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="bg-white/50 border-white/30 text-gray-700 hover:bg-white hover:border-purple-300 rounded-xl"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No customers found</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {searchTerm ? "Try adjusting your search terms" : "Add your first customer to get started"}
              </p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                className={cn(
                  "p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]",
                  selectedCustomerId === customer.id
                    ? "border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-lg scale-[1.02]"
                    : "border-white/30 bg-white/40 hover:bg-white/60"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{customer.name}</h3>
                        {(customer.loyalty_tier === 'Diamond' || customer.loyalty_tier === 'Platinum') && (
                          <Star className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          className={cn("text-xs font-medium", getLoyaltyColor(customer.loyalty_tier))}
                        >
                          {customer.loyalty_tier}
                        </Badge>
                        {customer.tags && customer.tags.length > 0 && (
                          <Badge variant="outline" className="text-xs border-purple-200 text-purple-600 bg-purple-50">
                            +{customer.tags.length} tags
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(customer.total_spent)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {customer.visit_count} visits
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
                    {customer.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-purple-500" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-purple-500" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 col-span-2">
                      <Calendar className="h-3 w-3 text-purple-500" />
                      <span>Last visit: {formatDate(customer.last_visit_date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CustomerList;
