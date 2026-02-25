import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SwadeshiLoader from "@/styles/Loader/SwadeshiLoader";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  ArrowRight,
  ArrowLeft,
  Check,
  UserPlus,
  UserX,
  Key,
  Truck,
  Lock,
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
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "staff" as
      | "owner"
      | "manager"
      | "chef"
      | "waiter"
      | "staff"
      | "admin",
  });

  const steps = [
    { id: "basic", label: "Basic Info", icon: Building2 },
    { id: "legal", label: "Legal", icon: FileText },
    { id: "owner", label: "Owner", icon: Users },
    { id: "bank", label: "Bank", icon: Banknote },
    { id: "subscription", label: "Plan", icon: CreditCard },
  ];

  const handleNext = () => {
    const currentIndex = steps.findIndex((s) => s.id === activeTab);
    if (currentIndex < steps.length - 1) {
      // Basic validation
      if (activeTab === "basic" && !formData.name) {
        toast.error("Restaurant Name is required");
        return;
      }
      setActiveTab(steps[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.findIndex((s) => s.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(steps[currentIndex - 1].id);
    }
  };

  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    website: "",
    gstin: "",
    registration_number: "",
    license_number: "",
    established_date: "",
    seating_capacity: "",
    description: "",
    location_type: "fixed",
    owner_name: "",
    owner_email: "",
    owner_phone: "",
    owner_address: "",
    owner_id_type: "aadhar",
    owner_id_number: "",
    owner_password: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    pan_number: "",
    upi_id: "",
    payment_gateway_enabled: false,
    planId: "",
  });

  // Helper: compute subscription end date based on plan interval
  const getSubscriptionEndDate = (interval: string): string => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    switch (interval) {
      case "yearly":
        return new Date(now + 365 * dayMs).toISOString();
      case "half_yearly":
        return new Date(now + 182 * dayMs).toISOString();
      case "quarterly":
        return new Date(now + 90 * dayMs).toISOString();
      case "monthly":
      default:
        return new Date(now + 30 * dayMs).toISOString();
    }
  };

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
        `,
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
      setIsCreating(true);

      // Step 1: Create restaurant
      const { data: restaurant, error: restError } = await supabase
        .from("restaurants")
        .insert({
          name: data.name,
          phone: data.phone || null,
          address: data.address || null,
          email: data.email || null,
          website: data.website || null,
          gstin: data.gstin || null,
          registration_number: data.registration_number || null,
          license_number: data.license_number || null,
          established_date: data.established_date || null,
          seating_capacity: data.seating_capacity
            ? parseInt(data.seating_capacity)
            : null,
          description: data.description || null,
          location_type: data.location_type || "fixed",
          owner_name: data.owner_name || null,
          owner_email: data.owner_email || null,
          owner_phone: data.owner_phone || null,
          owner_address: data.owner_address || null,
          owner_id_type: data.owner_id_type || null,
          owner_id_number: data.owner_id_number || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
          bank_name: data.bank_name || null,
          account_number: data.account_number || null,
          ifsc_code: data.ifsc_code || null,
          pan_number: data.pan_number || null,
          upi_id: data.upi_id || null,
          payment_gateway_enabled: data.payment_gateway_enabled,
          is_active: true,
          verification_status: "pending",
        })
        .select()
        .single();

      if (restError) throw restError;

      // Step 2: Create subscription if plan selected (with correct period)
      if (data.planId) {
        const selectedPlan = plans.find((p) => p.id === data.planId);
        const endDate = getSubscriptionEndDate(
          selectedPlan?.interval || "monthly",
        );
        const { error: subError } = await supabase
          .from("restaurant_subscriptions")
          .insert({
            restaurant_id: restaurant.id,
            plan_id: data.planId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: endDate,
          });
        if (subError) {
          console.error("Subscription creation failed:", subError);
          toast.error(
            "Restaurant created but subscription failed. Please add it manually.",
          );
        }
      }

      // Step 3: Seed system roles for this restaurant
      try {
        const { error: seedError } = await supabase.rpc("seed_system_roles", {
          p_restaurant_id: restaurant.id,
        });
        if (seedError) {
          console.error("Role seeding failed:", seedError);
        }
      } catch (e) {
        console.error("Role seeding exception:", e);
      }

      // Step 4: Create owner auth user if email + password provided
      if (data.owner_email && data.owner_password) {
        try {
          const ownerFirstName = data.owner_name?.split(" ")[0] || "Owner";
          const ownerLastName =
            data.owner_name?.split(" ").slice(1).join(" ") || "";

          const { data: fnData, error: fnError } =
            await supabase.functions.invoke("user-management", {
              body: {
                action: "create_user",
                userData: {
                  email: data.owner_email,
                  password: data.owner_password,
                  first_name: ownerFirstName,
                  last_name: ownerLastName,
                  role: "owner",
                  restaurant_id: restaurant.id,
                },
              },
            });

          if (fnError) {
            console.error("Owner user creation failed:", fnError);
            toast.error(
              "Restaurant created but owner login setup failed: " +
                (fnError.message || "Unknown error"),
            );
          } else if (!fnData?.success) {
            console.error("Owner creation returned failure:", fnData);
            toast.error(
              "Restaurant created but owner login failed: " +
                (fnData?.error || "Unknown error"),
            );
          } else {
            toast.success(
              "Owner login account created! They can sign in immediately.",
            );
          }
        } catch (e: any) {
          console.error("Owner creation exception:", e);
          toast.error("Restaurant created but owner user failed: " + e.message);
        }
      }

      return restaurant;
    },
    onSuccess: () => {
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ["platform-restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      toast.success("Restaurant onboarded successfully!");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      setIsCreating(false);
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
      email: string;
      website: string;
      gstin: string;
      registration_number: string;
      license_number: string;
      established_date: string;
      seating_capacity: string;
      description: string;
      owner_name: string;
      owner_email: string;
      owner_phone: string;
      owner_address: string;
      owner_id_type: string;
      owner_id_number: string;
      emergency_contact_name: string;
      emergency_contact_phone: string;
      bank_name: string;
      account_number: string;
      ifsc_code: string;
      pan_number: string;
      upi_id: string;
      payment_gateway_enabled: boolean;
    }) => {
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: data.name,
          phone: data.phone || null,
          address: data.address || null,
          email: data.email || null,
          website: data.website || null,
          gstin: data.gstin || null,
          registration_number: data.registration_number || null,
          license_number: data.license_number || null,
          established_date: data.established_date || null,
          seating_capacity: data.seating_capacity
            ? parseInt(data.seating_capacity)
            : null,
          description: data.description || null,
          owner_name: data.owner_name || null,
          owner_email: data.owner_email || null,
          owner_phone: data.owner_phone || null,
          owner_address: data.owner_address || null,
          owner_id_type: data.owner_id_type || null,
          owner_id_number: data.owner_id_number || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
          bank_name: data.bank_name || null,
          account_number: data.account_number || null,
          ifsc_code: data.ifsc_code || null,
          pan_number: data.pan_number || null,
          upi_id: data.upi_id || null,
          payment_gateway_enabled: data.payment_gateway_enabled,
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
            plan_id: data.planId,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
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
            plan_id: data.planId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
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
    setActiveTab("basic");
    setFormData({
      name: "",
      phone: "",
      address: "",
      email: "",
      website: "",
      gstin: "",
      registration_number: "",
      license_number: "",
      established_date: "",
      seating_capacity: "",
      description: "",
      location_type: "fixed",
      owner_name: "",
      owner_email: "",
      owner_phone: "",
      owner_address: "",
      owner_id_type: "aadhar",
      owner_id_number: "",
      owner_password: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      bank_name: "",
      account_number: "",
      ifsc_code: "",
      pan_number: "",
      upi_id: "",
      payment_gateway_enabled: false,
      planId: "",
    });
  };

  const openEdit = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      phone: restaurant.phone || "",
      address: restaurant.address || "",
      email: restaurant.email || "",
      website: restaurant.website || "",
      gstin: restaurant.gstin || "",
      registration_number: restaurant.registration_number || "",
      license_number: restaurant.license_number || "",
      established_date: restaurant.established_date || "",
      seating_capacity: restaurant.seating_capacity?.toString() || "",
      description: restaurant.description || "",
      owner_name: restaurant.owner_name || "",
      owner_email: restaurant.owner_email || "",
      owner_phone: restaurant.owner_phone || "",
      owner_address: restaurant.owner_address || "",
      owner_id_type: restaurant.owner_id_type || "aadhar",
      owner_id_number: restaurant.owner_id_number || "",
      emergency_contact_name: restaurant.emergency_contact_name || "",
      emergency_contact_phone: restaurant.emergency_contact_phone || "",
      bank_name: restaurant.bank_name || "",
      account_number: restaurant.account_number || "",
      ifsc_code: restaurant.ifsc_code || "",
      pan_number: restaurant.pan_number || "",
      upi_id: restaurant.upi_id || "",
      payment_gateway_enabled: restaurant.payment_gateway_enabled || false,
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Restaurant Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg">
            Create, edit, and manage all partner restaurants
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-purple-500/25 transition-all text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Restaurant
        </Button>
      </div>

      {/* Filters Glass Bar */}
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-white/10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px] bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-white/10">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <SwadeshiLoader
            loadingText="loading"
            words={[
              "restaurants",
              "partners",
              "businesses",
              "data",
              "restaurants",
            ]}
            size={150}
          />
        </div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-20 bg-white/30 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <Building2 className="h-16 w-16 mx-auto text-slate-300 mb-4" />
          <p className="text-xl font-semibold text-slate-600 dark:text-slate-300">
            No restaurants found
          </p>
          <p className="text-slate-500 mb-6">
            Get started by adding your first partner.
          </p>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-purple-600 text-white"
          >
            Add Restaurant
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {restaurants.map((restaurant, index) => {
            const sub = restaurant.restaurant_subscriptions;
            const userCount = restaurant.profiles?.length || 0;
            const expiry = sub?.current_period_end
              ? new Date(sub.current_period_end).toLocaleDateString()
              : "N/A";

            // Vibrant color schemes for each card
            const colors = [
              {
                gradient: "from-violet-500 to-purple-600",
                bg: "violet",
                shadow: "purple",
              },
              {
                gradient: "from-emerald-500 to-teal-600",
                bg: "emerald",
                shadow: "teal",
              },
              {
                gradient: "from-blue-500 to-indigo-600",
                bg: "blue",
                shadow: "indigo",
              },
              {
                gradient: "from-rose-500 to-pink-600",
                bg: "rose",
                shadow: "pink",
              },
              {
                gradient: "from-amber-500 to-orange-600",
                bg: "amber",
                shadow: "orange",
              },
              {
                gradient: "from-cyan-500 to-blue-600",
                bg: "cyan",
                shadow: "blue",
              },
            ];
            const color = colors[index % colors.length];

            return (
              <div
                key={restaurant.id}
                className="group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden"
              >
                {/* Gradient border effect */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${color.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}
                />
                <div className="absolute inset-[2px] bg-white dark:bg-slate-900 rounded-2xl" />

                {/* Top accent line */}
                <div
                  className={`absolute top-0 left-6 right-6 h-1 bg-gradient-to-r ${color.gradient} rounded-b-full opacity-60 group-hover:opacity-100 transition-opacity`}
                />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color.gradient} flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-${color.shadow}-500/30 group-hover:scale-110 transition-transform duration-300`}
                      >
                        {restaurant.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-purple-600 transition-all">
                          {restaurant.name}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />{" "}
                          {restaurant.phone || "No phone"}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(sub?.status || "none")}
                  </div>

                  <div className="space-y-3 py-4 border-t border-b border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium">Plan</span>
                      <span
                        className={`font-semibold px-3 py-1 rounded-full text-xs bg-gradient-to-r ${color.gradient} text-white shadow-sm`}
                      >
                        {sub?.subscription_plans?.name || "Free/None"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium">Users</span>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                        <Users className="h-3.5 w-3.5 text-blue-500" />{" "}
                        {userCount}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium">
                        Expires
                      </span>
                      <span className="font-mono text-xs bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {expiry}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20 border-slate-200 dark:border-slate-700"
                      onClick={() => {
                        setSelectedRestaurant(restaurant);
                        setIsViewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(restaurant)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openSubscription(restaurant)}
                        >
                          <CreditCard className="h-4 w-4 mr-2" /> Manage
                          Subscription
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedRestaurant(restaurant);
                            setIsManageUsersOpen(true);
                          }}
                        >
                          <Users className="h-4 w-4 mr-2" /> Manage Users
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-gradient-to-br from-slate-50 via-white to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/20">
          <div className="p-6 pb-0 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/40 to-indigo-200/40 dark:from-purple-800/20 dark:to-indigo-800/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 dark:from-blue-800/10 dark:to-cyan-800/10 rounded-full blur-2xl -translate-y-1/2 -translate-x-1/2" />

            <DialogHeader className="mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-purple-500/30">
                  <Building2 className="h-7 w-7" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                    Add New Restaurant
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 dark:text-slate-400">
                    Complete all steps to onboard a new partner
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Wizard Progress */}
            <div className="relative mb-8">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 rounded-full" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
                style={{
                  width: `${
                    (steps.findIndex((s) => s.id === activeTab) /
                      (steps.length - 1)) *
                    100
                  }%`,
                }}
              />
              <div className="relative flex justify-between z-10">
                {steps.map((step, index) => {
                  const isActive = step.id === activeTab;
                  const isCompleted =
                    steps.findIndex((s) => s.id === activeTab) > index;
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.id}
                      className="flex flex-col items-center gap-2 cursor-pointer group"
                      onClick={() => {
                        // Allow clicking previous steps
                        if (isCompleted) setActiveTab(step.id);
                      }}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4 ${
                          isActive
                            ? "bg-purple-600 border-purple-100 dark:border-purple-900/30 text-white shadow-lg shadow-purple-500/30 scale-110"
                            : isCompleted
                              ? "bg-emerald-500 border-emerald-100 dark:border-emerald-900/30 text-white"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 group-hover:border-purple-200 dark:group-hover:border-purple-800"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold transition-colors duration-300 ${
                          isActive
                            ? "text-purple-600 dark:text-purple-400"
                            : isCompleted
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]"
          >
            <ScrollArea className="flex-1 mt-6 px-8">
              <TabsContent value="basic" className="space-y-6 pb-6 mt-0">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                    Basic Information
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-purple-500" />
                      Restaurant Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., The Grand Restaurant"
                      className="mt-1.5 h-11 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-purple-400 focus:ring-purple-400/20"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-blue-500" />
                      Phone
                    </Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+91 9876543210"
                      className="mt-1.5 h-11 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-emerald-500" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="restaurant@example.com"
                      className="mt-1.5 h-11 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-cyan-500" />
                      Website
                    </Label>
                    <Input
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      placeholder="https://..."
                      className="mt-1.5 h-11 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-amber-500" />
                      Seating Capacity
                    </Label>
                    <Input
                      type="number"
                      value={formData.seating_capacity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          seating_capacity: e.target.value,
                        })
                      }
                      placeholder="e.g., 50"
                      className="mt-1.5 h-11 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" />
                      Address
                    </Label>
                    <Textarea
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Full address"
                      className="mt-1.5 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 min-h-[80px]"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-indigo-500" />
                      Description
                    </Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Short description about the restaurant..."
                      className="mt-1.5 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 min-h-[80px]"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-orange-500" />
                      Business Location Type
                    </Label>
                    <Select
                      value={formData.location_type}
                      onValueChange={(v) =>
                        setFormData({ ...formData, location_type: v })
                      }
                    >
                      <SelectTrigger className="mt-1.5 h-11 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">
                          🏢 Fixed Location — Restaurant with a permanent
                          address
                        </SelectItem>
                        <SelectItem value="mobile">
                          🚚 Mobile / Food Truck — Changes location regularly
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="legal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>GSTIN</Label>
                    <Input
                      value={formData.gstin}
                      onChange={(e) =>
                        setFormData({ ...formData, gstin: e.target.value })
                      }
                      placeholder="GSTIN Number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Registration Number</Label>
                    <Input
                      value={formData.registration_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registration_number: e.target.value,
                        })
                      }
                      placeholder="Reg Number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>License Number</Label>
                    <Input
                      value={formData.license_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          license_number: e.target.value,
                        })
                      }
                      placeholder="License Number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Established Date</Label>
                    <Input
                      type="date"
                      value={formData.established_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          established_date: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="owner" className="space-y-4">
                {/* Owner Login Account Section */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/30 mb-2">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-1">
                    <Key className="h-4 w-4" />
                    Owner Login Account
                  </h4>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/60 mb-3">
                    Set a password so the owner can log in immediately — no
                    manual Supabase setup needed.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">
                        Owner Email (= login email)
                      </Label>
                      <Input
                        type="email"
                        value={formData.owner_email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            owner_email: e.target.value,
                          })
                        }
                        placeholder="owner@restaurant.com"
                        className="mt-1 h-9 text-sm bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Login Password
                      </Label>
                      <Input
                        type="password"
                        value={formData.owner_password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            owner_password: e.target.value,
                          })
                        }
                        placeholder="Min 8 characters"
                        className="mt-1 h-9 text-sm bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Owner Name</Label>
                    <Input
                      value={formData.owner_name}
                      onChange={(e) =>
                        setFormData({ ...formData, owner_name: e.target.value })
                      }
                      placeholder="Full Name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Owner Phone</Label>
                    <Input
                      value={formData.owner_phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          owner_phone: e.target.value,
                        })
                      }
                      placeholder="Phone"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>ID Type</Label>
                    <Select
                      value={formData.owner_id_type}
                      onValueChange={(v) =>
                        setFormData({ ...formData, owner_id_type: v })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aadhar">Aadhar</SelectItem>
                        <SelectItem value="pan">PAN</SelectItem>
                        <SelectItem value="voter_id">Voter ID</SelectItem>
                        <SelectItem value="driving_license">
                          Driving License
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>ID Number</Label>
                    <Input
                      value={formData.owner_id_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          owner_id_number: e.target.value,
                        })
                      }
                      placeholder="ID Number"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Owner Address</Label>
                    <Textarea
                      value={formData.owner_address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          owner_address: e.target.value,
                        })
                      }
                      placeholder="Address"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2 pt-4 border-t">
                    <Label className="text-amber-600">Emergency Contact</Label>
                  </div>
                  <div>
                    <Label>Contact Name</Label>
                    <Input
                      value={formData.emergency_contact_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergency_contact_name: e.target.value,
                        })
                      }
                      placeholder="Name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={formData.emergency_contact_phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergency_contact_phone: e.target.value,
                        })
                      }
                      placeholder="Phone"
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bank" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bank Name</Label>
                    <Input
                      value={formData.bank_name}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_name: e.target.value })
                      }
                      placeholder="Bank Name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <Input
                      value={formData.account_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          account_number: e.target.value,
                        })
                      }
                      placeholder="Acc Number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>IFSC Code</Label>
                    <Input
                      value={formData.ifsc_code}
                      onChange={(e) =>
                        setFormData({ ...formData, ifsc_code: e.target.value })
                      }
                      placeholder="IFSC"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>PAN Number</Label>
                    <Input
                      value={formData.pan_number}
                      onChange={(e) =>
                        setFormData({ ...formData, pan_number: e.target.value })
                      }
                      placeholder="PAN"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>UPI ID</Label>
                    <Input
                      value={formData.upi_id}
                      onChange={(e) =>
                        setFormData({ ...formData, upi_id: e.target.value })
                      }
                      placeholder="UPI ID"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-8">
                    <Switch
                      checked={formData.payment_gateway_enabled}
                      onCheckedChange={(c) =>
                        setFormData({ ...formData, payment_gateway_enabled: c })
                      }
                    />
                    <Label>Enable Payment Gateway</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="subscription" className="space-y-4">
                <div className="py-4">
                  <Label>Select Subscription Plan</Label>
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.planId === plan.id
                            ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-purple-300"
                        }`}
                        onClick={() =>
                          setFormData({ ...formData, planId: plan.id })
                        }
                      >
                        <div>
                          <p className="font-semibold text-lg">{plan.name}</p>
                          <p className="text-slate-500">
                            {plan.interval === "month" ? "Monthly" : "Yearly"}{" "}
                            Billing
                          </p>
                        </div>
                        <div className="text-xl font-bold text-purple-600">
                          ₹{plan.price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
          <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-4 z-20">
            <Button
              variant="outline"
              onClick={() => {
                if (activeTab === "basic") {
                  setIsAddOpen(false);
                } else {
                  handleBack();
                }
              }}
              className="w-32 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {activeTab === "basic" ? (
                "Cancel"
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </>
              )}
            </Button>

            {activeTab === "subscription" ? (
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.name || createMutation.isPending}
                className="w-48 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25 text-white"
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Restaurant
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="w-32 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
              >
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Restaurant</DialogTitle>
          </DialogHeader>
          <Tabs
            defaultValue="basic"
            className="flex-1 overflow-hidden flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="legal">Legal</TabsTrigger>
              <TabsTrigger value="owner">Owner</TabsTrigger>
              <TabsTrigger value="bank">Bank</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4 px-1">
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Restaurant Name *</Label>
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
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Seating Capacity</Label>
                    <Input
                      type="number"
                      value={formData.seating_capacity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          seating_capacity: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Textarea
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="legal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>GSTIN</Label>
                    <Input
                      value={formData.gstin}
                      onChange={(e) =>
                        setFormData({ ...formData, gstin: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Registration Number</Label>
                    <Input
                      value={formData.registration_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registration_number: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>License Number</Label>
                    <Input
                      value={formData.license_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          license_number: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Established Date</Label>
                    <Input
                      type="date"
                      value={formData.established_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          established_date: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="owner" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Owner Name</Label>
                    <Input
                      value={formData.owner_name}
                      onChange={(e) =>
                        setFormData({ ...formData, owner_name: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Owner Email</Label>
                    <Input
                      value={formData.owner_email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          owner_email: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Owner Phone</Label>
                    <Input
                      value={formData.owner_phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          owner_phone: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>ID Type</Label>
                    <Select
                      value={formData.owner_id_type}
                      onValueChange={(v) =>
                        setFormData({ ...formData, owner_id_type: v })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aadhar">Aadhar</SelectItem>
                        <SelectItem value="pan">PAN</SelectItem>
                        <SelectItem value="voter_id">Voter ID</SelectItem>
                        <SelectItem value="driving_license">
                          Driving License
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>ID Number</Label>
                    <Input
                      value={formData.owner_id_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          owner_id_number: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Owner Address</Label>
                    <Textarea
                      value={formData.owner_address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          owner_address: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2 pt-4 border-t">
                    <Label className="text-amber-600">Emergency Contact</Label>
                  </div>
                  <div>
                    <Label>Contact Name</Label>
                    <Input
                      value={formData.emergency_contact_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergency_contact_name: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={formData.emergency_contact_phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergency_contact_phone: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bank" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bank Name</Label>
                    <Input
                      value={formData.bank_name}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_name: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <Input
                      value={formData.account_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          account_number: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>IFSC Code</Label>
                    <Input
                      value={formData.ifsc_code}
                      onChange={(e) =>
                        setFormData({ ...formData, ifsc_code: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>PAN Number</Label>
                    <Input
                      value={formData.pan_number}
                      onChange={(e) =>
                        setFormData({ ...formData, pan_number: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>UPI ID</Label>
                    <Input
                      value={formData.upi_id}
                      onChange={(e) =>
                        setFormData({ ...formData, upi_id: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-8">
                    <Switch
                      checked={formData.payment_gateway_enabled}
                      onCheckedChange={(c) =>
                        setFormData({ ...formData, payment_gateway_enabled: c })
                      }
                    />
                    <Label>Enable Payment Gateway</Label>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
          <DialogFooter className="mt-4 pt-2 border-t">
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
                    email: formData.email,
                    website: formData.website,
                    gstin: formData.gstin,
                    registration_number: formData.registration_number,
                    license_number: formData.license_number,
                    established_date: formData.established_date,
                    seating_capacity: formData.seating_capacity,
                    description: formData.description,
                    owner_name: formData.owner_name,
                    owner_email: formData.owner_email,
                    owner_phone: formData.owner_phone,
                    owner_address: formData.owner_address,
                    owner_id_type: formData.owner_id_type,
                    owner_id_number: formData.owner_id_number,
                    emergency_contact_name: formData.emergency_contact_name,
                    emergency_contact_phone: formData.emergency_contact_phone,
                    bank_name: formData.bank_name,
                    account_number: formData.account_number,
                    ifsc_code: formData.ifsc_code,
                    pan_number: formData.pan_number,
                    upi_id: formData.upi_id,
                    payment_gateway_enabled: formData.payment_gateway_enabled,
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
                              selectedRestaurant.created_at,
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
                          selectedRestaurant.restaurant_subscriptions.status,
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-2">
                        Expires:{" "}
                        {new Date(
                          selectedRestaurant.restaurant_subscriptions
                            .current_period_end,
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

      {/* Manage Users Dialog */}
      <Dialog open={isManageUsersOpen} onOpenChange={setIsManageUsersOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl">Manage Users</DialogTitle>
                <DialogDescription>
                  Users for{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedRestaurant?.name}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4 mt-4">
            {/* Add New User Section */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-3">
                <UserPlus className="h-4 w-4" /> Add New User
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">
                    First Name
                  </Label>
                  <Input
                    value={newUserData.first_name}
                    onChange={(e) =>
                      setNewUserData({
                        ...newUserData,
                        first_name: e.target.value,
                      })
                    }
                    placeholder="John"
                    className="mt-1 h-9 text-sm bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">
                    Last Name
                  </Label>
                  <Input
                    value={newUserData.last_name}
                    onChange={(e) =>
                      setNewUserData({
                        ...newUserData,
                        last_name: e.target.value,
                      })
                    }
                    placeholder="Doe"
                    className="mt-1 h-9 text-sm bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">
                    Role
                  </Label>
                  <Select
                    value={newUserData.role}
                    onValueChange={(v: any) =>
                      setNewUserData({ ...newUserData, role: v })
                    }
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="chef">Chef</SelectItem>
                      <SelectItem value="waiter">Waiter</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) =>
                      setNewUserData({ ...newUserData, email: e.target.value })
                    }
                    placeholder="user@example.com"
                    className="mt-1 h-9 text-sm bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">
                    Password
                  </Label>
                  <Input
                    type="password"
                    value={newUserData.password}
                    onChange={(e) =>
                      setNewUserData({
                        ...newUserData,
                        password: e.target.value,
                      })
                    }
                    placeholder="••••••••"
                    className="mt-1 h-9 text-sm bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                    onClick={async () => {
                      console.log("Add User clicked", {
                        newUserData,
                        selectedRestaurant,
                      });

                      if (
                        !selectedRestaurant ||
                        !newUserData.email ||
                        !newUserData.password
                      ) {
                        toast.error("Email and password are required");
                        return;
                      }

                      // Validate password length (Edge Function requires 8 characters)
                      if (newUserData.password.length < 8) {
                        toast.error("Password must be at least 8 characters");
                        return;
                      }

                      // Validate email format
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(newUserData.email)) {
                        toast.error("Please enter a valid email address");
                        return;
                      }

                      toast.info("Creating user...");

                      try {
                        console.log("Calling Edge Function...");
                        // Call Edge Function to create user (uses Admin API server-side)
                        const { data, error } = await supabase.functions.invoke(
                          "user-management",
                          {
                            body: {
                              action: "create_user",
                              userData: {
                                email: newUserData.email,
                                password: newUserData.password,
                                first_name: newUserData.first_name || "User",
                                last_name: newUserData.last_name || "",
                                role: newUserData.role,
                                restaurant_id: selectedRestaurant.id,
                              },
                            },
                          },
                        );

                        console.log("Edge Function response:", { data, error });

                        if (error) {
                          console.error("Edge Function error:", error);
                          toast.error(error.message || "Failed to create user");
                          return;
                        }

                        if (!data?.success) {
                          console.error(
                            "Edge Function returned failure:",
                            data,
                          );
                          toast.error(data?.error || "Failed to create user");
                          return;
                        }

                        toast.success("User created successfully!");
                        setNewUserData({
                          email: "",
                          password: "",
                          first_name: "",
                          last_name: "",
                          role: "staff",
                        });
                        queryClient.invalidateQueries({
                          queryKey: ["platform-restaurants"],
                        });
                      } catch (error: any) {
                        console.error("Exception:", error);
                        toast.error(`Failed to create user: ${error.message}`);
                      }
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-1" /> Add User
                  </Button>
                </div>
              </div>
            </div>

            {/* Existing Users */}
            <div className="flex-1 overflow-hidden">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" /> Current Users (
                {selectedRestaurant?.profiles?.length || 0})
              </h4>
              <ScrollArea className="h-[300px] rounded-lg border">
                {selectedRestaurant?.profiles &&
                selectedRestaurant.profiles.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedRestaurant.profiles.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm ${
                              user.role === "owner"
                                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                                : user.role === "manager"
                                  ? "bg-gradient-to-br from-purple-500 to-indigo-600"
                                  : user.role === "chef"
                                    ? "bg-gradient-to-br from-red-500 to-rose-600"
                                    : user.role === "waiter"
                                      ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                                      : "bg-gradient-to-br from-slate-500 to-slate-600"
                            }`}
                          >
                            {(user.first_name?.[0] || "U").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {user.first_name || "Unnamed"}{" "}
                              {user.last_name || ""}
                            </p>
                            <p className="text-xs text-slate-500">
                              {user.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`capitalize ${
                              user.role === "owner"
                                ? "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:bg-amber-900/20"
                                : user.role === "manager"
                                  ? "border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-600 dark:text-purple-400 dark:bg-purple-900/20"
                                  : user.role === "chef"
                                    ? "border-red-300 text-red-700 bg-red-50 dark:border-red-600 dark:text-red-400 dark:bg-red-900/20"
                                    : user.role === "waiter"
                                      ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:bg-emerald-900/20"
                                      : "border-slate-300 text-slate-600 bg-slate-50"
                            }`}
                          >
                            {user.role}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={async () => {
                              if (
                                !confirm(
                                  `Remove ${
                                    user.first_name || "this user"
                                  } from the restaurant?`,
                                )
                              )
                                return;
                              try {
                                const { error } = await supabase
                                  .from("profiles")
                                  .update({ restaurant_id: null })
                                  .eq("id", user.id);
                                if (error) throw error;
                                toast.success("User removed from restaurant");
                                queryClient.invalidateQueries({
                                  queryKey: ["platform-restaurants"],
                                });
                              } catch (error: any) {
                                toast.error(`Failed: ${error.message}`);
                              }
                            }}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                      No users assigned
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-sm">
                      Add users above to get started
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsManageUsersOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantManagement;
