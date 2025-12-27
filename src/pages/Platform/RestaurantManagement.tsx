import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Building2,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Phone,
  MapPin,
  Calendar,
  RefreshCw,
  Eye,
  X,
  Mail,
  Globe,
  Star,
  Banknote,
  Shield,
  FileText,
  IndianRupee,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Restaurant {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  website: string | null;
  gstin: string | null;
  registration_number: string | null;
  license_number: string | null;
  established_date: string | null;
  seating_capacity: number | null;
  description: string | null;
  is_active: boolean;
  verification_status: string | null;
  rating: string | null;
  total_reviews: number | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_address: string | null;
  owner_id_type: string | null;
  owner_id_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  pan_number: string | null;
  upi_id: string | null;
  payment_gateway_enabled: boolean | null;
  created_at: string;
  updated_at: string | null;
  // Supabase returns object for one-to-one, array for one-to-many
  restaurant_subscriptions: {
    id: string;
    status: string;
    current_period_end: string;
    plan_id: string;
    subscription_plans: {
      id: string;
      name: string;
      price: number;
    } | null;
  } | null;
  profiles: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
  }>;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
}

const RestaurantManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    planId: "",
  });

  // Fetch restaurants
  const {
    data: restaurants = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["platform-restaurants", searchQuery, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("restaurants")
        .select(
          `
          *,
          restaurant_subscriptions (
            id,
            status,
            current_period_end,
            plan_id,
            subscription_plans:plan_id (id, name, price)
          ),
          profiles (id, first_name, last_name, role)
        `
        )
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Restaurant fetch error:", error);
        throw error;
      }

      console.log("Fetched restaurants:", data?.length, data);

      let filtered = data || [];
      if (statusFilter !== "all") {
        filtered = filtered.filter((r: any) => {
          const sub = r.restaurant_subscriptions;
          return sub?.status === statusFilter;
        });
      }

      return filtered as Restaurant[];
    },
  });

  // Fetch subscription plans
  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, name, price, interval")
        .eq("is_active", true)
        .order("price");
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  // Create restaurant
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Create restaurant
      const { data: restaurant, error: restError } = await supabase
        .from("restaurants")
        .insert({
          name: data.name,
          phone: data.phone || null,
          address: data.address || null,
        })
        .select()
        .single();

      if (restError) throw restError;

      // Create subscription if plan selected
      if (data.planId) {
        const { error: subError } = await supabase
          .from("restaurant_subscriptions")
          .insert({
            restaurant_id: restaurant.id,
            subscription_plan_id: data.planId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          });
        if (subError) throw subError;
      }

      return restaurant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      toast.success("Restaurant created successfully");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });

  // Update restaurant
  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      phone: string;
      address: string;
    }) => {
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: data.name,
          phone: data.phone || null,
          address: data.address || null,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-restaurants"] });
      toast.success("Restaurant updated");
      setIsEditOpen(false);
      setSelectedRestaurant(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Delete restaurant
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("restaurants")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      toast.success("Restaurant deleted");
      setIsDeleteOpen(false);
      setSelectedRestaurant(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Update subscription
  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data: {
      restaurantId: string;
      planId: string;
      existingSubId?: string;
    }) => {
      if (data.existingSubId) {
        // Update existing subscription
        const { error } = await supabase
          .from("restaurant_subscriptions")
          .update({
            subscription_plan_id: data.planId,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .eq("id", data.existingSubId);
        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from("restaurant_subscriptions")
          .insert({
            restaurant_id: data.restaurantId,
            subscription_plan_id: data.planId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-restaurants"] });
      toast.success("Subscription updated");
      setIsSubscriptionOpen(false);
      setSelectedRestaurant(null);
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", phone: "", address: "", planId: "" });
  };

  const openEdit = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      phone: restaurant.phone || "",
      address: restaurant.address || "",
      planId: "",
    });
    setIsEditOpen(true);
  };

  const openSubscription = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setFormData({
      ...formData,
      planId: restaurant.restaurant_subscriptions?.[0]?.plan_id || "",
    });
    setIsSubscriptionOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active:
        "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-500/50 dark:text-emerald-400 dark:bg-emerald-500/10",
      trial:
        "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-500/50 dark:text-amber-400 dark:bg-amber-500/10",
      expired:
        "border-red-300 text-red-700 bg-red-50 dark:border-red-500/50 dark:text-red-400 dark:bg-red-500/10",
      none: "border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-500/50 dark:text-slate-400",
    };
    const icons = {
      active: CheckCircle,
      trial: Clock,
      expired: AlertTriangle,
      none: AlertTriangle,
    };
    const Icon = icons[status as keyof typeof icons] || icons.none;
    return (
      <Badge
        variant="outline"
        className={styles[status as keyof typeof styles] || styles.none}
      >
        <Icon className="h-3 w-3 mr-1" />
        {status === "none"
          ? "No Plan"
          : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Restaurant Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Create, edit, and manage all restaurants
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Restaurant
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            All Restaurants
            <Badge variant="secondary" className="ml-2">
              {restaurants.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No restaurants found</p>
              <Button
                variant="link"
                className="text-purple-600 mt-2"
                onClick={() => setIsAddOpen(true)}
              >
                Add your first restaurant
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restaurants.map((restaurant) => {
                    const sub = restaurant.restaurant_subscriptions;
                    const userCount = restaurant.profiles?.length || 0;
                    const expiry = sub?.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString()
                      : "N/A";

                    return (
                      <TableRow key={restaurant.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="font-medium">{restaurant.name}</p>
                              <p className="text-xs text-slate-500">
                                {restaurant.phone || "No phone"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {sub?.subscription_plans?.name || "No plan"}
                          </span>
                          {sub?.subscription_plans?.price && (
                            <p className="text-xs text-slate-400">
                              ₹{sub.subscription_plans.price}/mo
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(sub?.status || "none")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-slate-600">
                            <Users className="h-4 w-4" />
                            {userCount}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {expiry}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRestaurant(restaurant);
                                  setIsViewOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEdit(restaurant)}
                              >
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openSubscription(restaurant)}
                              >
                                <CreditCard className="h-4 w-4 mr-2" /> Manage
                                Subscription
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedRestaurant(restaurant);
                                  setIsDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Restaurant</DialogTitle>
            <DialogDescription>Create a new restaurant entry</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Restaurant Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., The Grand Restaurant"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+91 9876543210"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Full address"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Subscription Plan</Label>
              <Select
                value={formData.planId}
                onValueChange={(v) => setFormData({ ...formData, planId: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a plan (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price}/{plan.interval}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || createMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Restaurant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Restaurant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Restaurant Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRestaurant) {
                  updateMutation.mutate({
                    id: selectedRestaurant.id,
                    name: formData.name,
                    phone: formData.phone,
                    address: formData.address,
                  });
                }
              }}
              disabled={updateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog - Comprehensive Details */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
                {selectedRestaurant?.name?.charAt(0) || "R"}
              </div>
              <div>
                <span className="text-xl">{selectedRestaurant?.name}</span>
                <div className="flex items-center gap-2 mt-1">
                  {selectedRestaurant?.is_active ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 border-red-200">
                      Inactive
                    </Badge>
                  )}
                  {selectedRestaurant?.verification_status && (
                    <Badge variant="outline">
                      {selectedRestaurant.verification_status}
                    </Badge>
                  )}
                  {selectedRestaurant?.rating && (
                    <Badge variant="outline" className="gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {selectedRestaurant.rating} (
                      {selectedRestaurant.total_reviews})
                    </Badge>
                  )}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="owner">Owner</TabsTrigger>
              <TabsTrigger value="bank">Bank/Payment</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 px-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Phone</Label>
                    <p className="flex items-center gap-2 mt-1 font-medium">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {selectedRestaurant?.phone || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Email</Label>
                    <p className="flex items-center gap-2 mt-1 font-medium">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {selectedRestaurant?.email || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Website</Label>
                    <p className="flex items-center gap-2 mt-1 font-medium">
                      <Globe className="h-4 w-4 text-slate-400" />
                      {selectedRestaurant?.website || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">
                      Seating Capacity
                    </Label>
                    <p className="flex items-center gap-2 mt-1 font-medium">
                      <Users className="h-4 w-4 text-slate-400" />
                      {selectedRestaurant?.seating_capacity || "Not set"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-slate-500">Address</Label>
                    <p className="flex items-center gap-2 mt-1 font-medium">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {selectedRestaurant?.address || "Not provided"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-slate-500">
                      Description
                    </Label>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      {selectedRestaurant?.description || "No description"}
                    </p>
                  </div>
                </div>

                {/* Legal Info */}
                <div className="border-t pt-4">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-purple-500" />
                    Legal & Registration
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">GSTIN:</span>
                      <span className="ml-2 font-medium">
                        {selectedRestaurant?.gstin || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Registration #:</span>
                      <span className="ml-2 font-medium">
                        {selectedRestaurant?.registration_number || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">License #:</span>
                      <span className="ml-2 font-medium">
                        {selectedRestaurant?.license_number || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Created:</span>
                      <span className="ml-2 font-medium">
                        {selectedRestaurant?.created_at
                          ? new Date(
                              selectedRestaurant.created_at
                            ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subscription */}
                {selectedRestaurant?.restaurant_subscriptions && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <CreditCard className="h-4 w-4 text-emerald-500" />
                      Subscription
                    </h4>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-lg">
                            {
                              selectedRestaurant.restaurant_subscriptions
                                .subscription_plans?.name
                            }
                          </span>
                          <p className="text-sm text-slate-500">
                            ₹
                            {
                              selectedRestaurant.restaurant_subscriptions
                                .subscription_plans?.price
                            }
                            /month
                          </p>
                        </div>
                        {getStatusBadge(
                          selectedRestaurant.restaurant_subscriptions.status
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-2">
                        Expires:{" "}
                        {new Date(
                          selectedRestaurant.restaurant_subscriptions.current_period_end
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Owner Tab */}
              <TabsContent value="owner" className="space-y-4 px-1">
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30">
                  <h4 className="font-medium text-purple-700 dark:text-purple-300 mb-3">
                    Owner Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-purple-600/70">Name</Label>
                      <p className="font-medium">
                        {selectedRestaurant?.owner_name || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-purple-600/70">
                        Email
                      </Label>
                      <p className="font-medium">
                        {selectedRestaurant?.owner_email || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-purple-600/70">
                        Phone
                      </Label>
                      <p className="font-medium">
                        {selectedRestaurant?.owner_phone || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-purple-600/70">
                        ID Type
                      </Label>
                      <p className="font-medium capitalize">
                        {selectedRestaurant?.owner_id_type || "N/A"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-purple-600/70">
                        Address
                      </Label>
                      <p className="font-medium">
                        {selectedRestaurant?.owner_address || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-purple-600/70">
                        ID Number
                      </Label>
                      <p className="font-medium font-mono">
                        {selectedRestaurant?.owner_id_number || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                  <h4 className="font-medium text-amber-700 dark:text-amber-300 mb-3">
                    Emergency Contact
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-amber-600/70">Name</Label>
                      <p className="font-medium">
                        {selectedRestaurant?.emergency_contact_name ||
                          "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-600/70">Phone</Label>
                      <p className="font-medium">
                        {selectedRestaurant?.emergency_contact_phone ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Bank Tab */}
              <TabsContent value="bank" className="space-y-4 px-1">
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                  <h4 className="font-medium text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Bank Account
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-emerald-600/70">
                        Bank Name
                      </Label>
                      <p className="font-medium">
                        {selectedRestaurant?.bank_name || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-emerald-600/70">
                        IFSC Code
                      </Label>
                      <p className="font-medium font-mono">
                        {selectedRestaurant?.ifsc_code || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-emerald-600/70">
                        Account Number
                      </Label>
                      <p className="font-medium font-mono">
                        {selectedRestaurant?.account_number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-emerald-600/70">
                        PAN Number
                      </Label>
                      <p className="font-medium font-mono">
                        {selectedRestaurant?.pan_number || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                    <IndianRupee className="h-4 w-4" />
                    UPI & Payment Gateway
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-blue-600/70">UPI ID</Label>
                      <p className="font-medium">
                        {selectedRestaurant?.upi_id || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600/70">
                        Payment Gateway
                      </Label>
                      <Badge
                        variant={
                          selectedRestaurant?.payment_gateway_enabled
                            ? "default"
                            : "outline"
                        }
                      >
                        {selectedRestaurant?.payment_gateway_enabled
                          ? "Enabled"
                          : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="px-1">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Restaurant Users
                  </h4>
                  <Badge variant="secondary">
                    {selectedRestaurant?.profiles?.length || 0} users
                  </Badge>
                </div>
                {selectedRestaurant?.profiles?.length ? (
                  <div className="space-y-2">
                    {selectedRestaurant.profiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                            {(profile.first_name || profile.last_name || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">
                              {profile.first_name || profile.last_name
                                ? `${profile.first_name || ""} ${
                                    profile.last_name || ""
                                  }`.trim()
                                : "No name"}
                            </p>
                            <p className="text-xs text-slate-500 capitalize">
                              {profile.role}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {profile.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    No users assigned to this restaurant
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewOpen(false);
                openEdit(selectedRestaurant!);
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Restaurant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
      <Dialog open={isSubscriptionOpen} onOpenChange={setIsSubscriptionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>
              Change subscription plan for {selectedRestaurant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Subscription Plan</Label>
            <Select
              value={formData.planId}
              onValueChange={(v) => setFormData({ ...formData, planId: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - ₹{plan.price}/{plan.interval}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSubscriptionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRestaurant && formData.planId) {
                  updateSubscriptionMutation.mutate({
                    restaurantId: selectedRestaurant.id,
                    planId: formData.planId,
                    existingSubId:
                      selectedRestaurant.restaurant_subscriptions?.id,
                  });
                }
              }}
              disabled={
                !formData.planId || updateSubscriptionMutation.isPending
              }
              className="bg-purple-600 hover:bg-purple-700"
            >
              {updateSubscriptionMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Update Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Restaurant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{selectedRestaurant?.name}</strong> and all associated
              data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedRestaurant &&
                deleteMutation.mutate(selectedRestaurant.id)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RestaurantManagement;
