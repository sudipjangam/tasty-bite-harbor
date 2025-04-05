
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Mail,
  Phone,
  MoreVertical,
  UserPlus,
  FileBarChart,
  Filter,
  Download,
} from "lucide-react";
import LoyaltyBadge from "@/components/Customers/LoyaltyBadge";

type Customer = {
  customer_name: string;
  visit_count: number;
  total_spent: number;
  average_order_value: number;
  first_visit: string;
  last_visit: string;
};

const calculateLoyaltyTier = (
  totalSpent: number,
  visitCount: number,
  daysSinceFirstVisit: number
) => {
  // Simplified loyalty tier calculation
  if (totalSpent > 20000 && visitCount > 15) return "Diamond";
  if (totalSpent > 10000 && visitCount > 10) return "Platinum";
  if (totalSpent > 5000 && visitCount > 8) return "Gold";
  if (totalSpent > 2500 && visitCount > 5) return "Silver";
  if (totalSpent > 1000 || visitCount > 3) return "Bronze";
  return "None";
};

const Customers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch customers insights data
  const { data: customerData = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from("customer_insights")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("total_spent", { ascending: false });

      if (error) throw error;
      return data as Customer[];
    },
  });

  const filteredCustomers = customerData.filter((customer) => {
    const matchesSearch = customer.customer_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    // Apply tab filters
    if (activeTab === "all") return matchesSearch;

    const now = new Date();
    const lastVisit = new Date(customer.last_visit);
    const daysSinceLastVisit = Math.floor(
      (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (activeTab === "recent" && daysSinceLastVisit <= 30) return matchesSearch;
    if (activeTab === "high-value" && customer.total_spent >= 5000)
      return matchesSearch;
    if (activeTab === "inactive" && daysSinceLastVisit > 90)
      return matchesSearch;

    return false;
  });

  const calculateDaysSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Customer Relationship Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track customer behavior, preferences, and loyalty
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <Card className="p-5 bg-white dark:bg-gray-800 shadow-md">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search customers..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Show all fields</DropdownMenuItem>
                <DropdownMenuItem>Only loyalty members</DropdownMenuItem>
                <DropdownMenuItem>Birthday this month</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="secondary" size="sm">
              <FileBarChart className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Customers</TabsTrigger>
            <TabsTrigger value="recent">Recent Visitors</TabsTrigger>
            <TabsTrigger value="high-value">High Value</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Loyalty Tier</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead className="text-right">Visits</TableHead>
                    <TableHead className="text-right">Avg. Order</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer, i) => {
                    const firstVisitDays = calculateDaysSince(customer.first_visit);
                    
                    const loyaltyTier = calculateLoyaltyTier(
                      customer.total_spent,
                      customer.visit_count,
                      firstVisitDays
                    );
                    
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {customer.customer_name}
                        </TableCell>
                        <TableCell>
                          <LoyaltyBadge tier={loyaltyTier as any} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(customer.total_spent)}
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.visit_count}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(customer.average_order_value)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{formatDate(customer.last_visit)}</span>
                            <span className="text-xs text-muted-foreground">
                              {calculateDaysSince(customer.last_visit)} days ago
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" title="Send Email">
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Call Customer">
                              <Phone className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Edit Customer</DropdownMenuItem>
                                <DropdownMenuItem>Order History</DropdownMenuItem>
                                <DropdownMenuItem>Send Promotion</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {filteredCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Search className="h-8 w-8 mb-2" />
                          <p>No customers found</p>
                          <p className="text-sm">
                            Try adjusting your search or filters
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Customers;
