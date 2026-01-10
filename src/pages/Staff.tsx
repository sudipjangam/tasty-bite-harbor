import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaffList from "@/components/Staff/StaffList";
import StaffDetail from "@/components/Staff/StaffDetail";
import StaffDialog from "@/components/Staff/StaffDialog";
import StaffLeaveManager from "@/components/Staff/StaffLeaveManager";
import ShiftManagementContent from "@/components/Staff/ShiftManagementContent";
import TimeClockDialog from "@/components/Staff/TimeClockDialog";
import type { StaffMember, StaffRole } from "@/types/staff";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  ClockIcon,
  Users,
  FileText,
  Sparkles,
  UserCheck,
  UserX,
  Calendar,
  CalendarClock,
} from "lucide-react";
import { buttonStyles } from "@/config/buttonStyles";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const Staff = () => {
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [isTimeClockDialogOpen, setIsTimeClockDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { restaurantId, isLoading: loadingRestaurantId } = useRestaurantId();

  // Get active tab from URL query parameter
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === "leaves"
      ? "leaves"
      : tabFromUrl === "shifts"
      ? "shifts"
      : "staff"
  );

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab === "staff") {
      navigate("/staff", { replace: true });
    } else if (activeTab === "leaves") {
      navigate("/staff?tab=leaves", { replace: true });
    } else if (activeTab === "shifts") {
      navigate("/staff?tab=shifts", { replace: true });
    }
  }, [activeTab, navigate]);

  // Fetch staff for stats
  const { data: staffMembers = [] } = useQuery({
    queryKey: ["staff-stats", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, status")
        .eq("restaurant_id", restaurantId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch staff roles
  const { data: roles = [] } = useQuery<StaffRole[]>({
    queryKey: ["staff-roles", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_roles")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return data as StaffRole[];
    },
  });

  const handleAddStaff = () => {
    setEditingStaff(null);
    setIsStaffDialogOpen(true);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setIsStaffDialogOpen(true);
  };

  const handleStaffDialogSuccess = () => {
    toast({
      title: editingStaff ? "Staff Updated" : "Staff Added",
      description: editingStaff
        ? `${editingStaff.first_name} ${editingStaff.last_name}'s profile has been updated.`
        : "New staff member has been added successfully.",
    });
  };

  // Stats calculations
  const totalStaff = staffMembers.length;
  const activeStaff = staffMembers.filter((s) => s.status === "active").length;
  const onLeaveStaff = staffMembers.filter(
    (s) => s.status === "on_leave"
  ).length;
  const inactiveStaff = staffMembers.filter(
    (s) => s.status === "inactive"
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-purple-950/50 dark:to-indigo-950 p-6">
      {/* Modern Header with Glass Effect */}
      <div className="mb-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 rounded-3xl shadow-xl dark:shadow-purple-500/10 p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/30 dark:shadow-purple-500/50">
              <Users className="h-8 w-8 text-white drop-shadow-lg" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                Staff Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg mt-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Manage your restaurant's staff and leave requests
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setIsTimeClockDialogOpen(true)}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-2 border-indigo-200 dark:border-indigo-500/50 hover:border-indigo-400 dark:hover:border-indigo-400 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/50 dark:hover:to-purple-900/50 text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              Clock In/Out
            </Button>
            <Button
              onClick={handleAddStaff}
              className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transform hover:-translate-y-0.5 transition-all duration-300"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">
                  Total Staff
                </p>
                <p className="text-3xl font-bold mt-1">{totalStaff}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Active</p>
                <p className="text-3xl font-bold mt-1">{activeStaff}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg shadow-amber-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">On Leave</p>
                <p className="text-3xl font-bold mt-1">{onLeaveStaff}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl p-4 text-white shadow-lg shadow-slate-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-100 text-sm font-medium">Inactive</p>
                <p className="text-3xl font-bold mt-1">{inactiveStaff}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <UserX className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2 mb-6">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 rounded-3xl shadow-xl dark:shadow-purple-500/10 p-2">
            <TabsList className="inline-flex w-auto min-w-full md:w-auto space-x-1 p-1 bg-transparent rounded-2xl">
              <TabsTrigger
                value="staff"
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
              >
                <Users className="h-4 w-4" />
                Staff List
              </TabsTrigger>
              <TabsTrigger
                value="shifts"
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400"
              >
                <CalendarClock className="h-4 w-4" />
                Shift Management
              </TabsTrigger>
              <TabsTrigger
                value="leaves"
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                <FileText className="h-4 w-4" />
                Leave Management
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="staff" className="animate-in fade-in">
          <ErrorBoundary>
            {selectedStaff ? (
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 rounded-3xl shadow-xl dark:shadow-purple-500/10 p-8">
                <StaffDetail
                  staffId={selectedStaff.id}
                  restaurantId={restaurantId}
                  onEdit={handleEditStaff}
                  onBack={() => setSelectedStaff(null)}
                />
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 rounded-3xl shadow-xl dark:shadow-purple-500/10 p-8">
                <StaffList
                  selectedStaffId={selectedStaff?.id || null}
                  onSelectStaff={setSelectedStaff}
                  restaurantId={restaurantId}
                  onAddStaff={handleAddStaff}
                />
              </div>
            )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="leaves" className="animate-in fade-in">
          <ErrorBoundary>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 rounded-3xl shadow-xl dark:shadow-purple-500/10 p-8">
              <StaffLeaveManager />
            </div>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="shifts" className="animate-in fade-in">
          <ErrorBoundary>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 rounded-3xl shadow-xl dark:shadow-purple-500/10 p-8">
              <ShiftManagementContent restaurantId={restaurantId} />
            </div>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>

      <StaffDialog
        isOpen={isStaffDialogOpen}
        onClose={() => setIsStaffDialogOpen(false)}
        staff={editingStaff || undefined}
        restaurantId={restaurantId}
        onSuccess={handleStaffDialogSuccess}
        roles={roles}
      />

      <TimeClockDialog
        isOpen={isTimeClockDialogOpen}
        onClose={() => setIsTimeClockDialogOpen(false)}
        restaurantId={restaurantId}
        onSuccess={() => {
          toast({
            title: "Time clock entry saved",
            description:
              "Your time clock entry has been recorded successfully.",
          });
        }}
      />
    </div>
  );
};

export default Staff;
