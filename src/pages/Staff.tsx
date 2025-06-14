
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
import TimeClockDialog from "@/components/Staff/TimeClockDialog";
import type { StaffMember, StaffRole } from "@/types/staff";
import { Button } from "@/components/ui/button";
import { UserPlus, ClockIcon, Users, FileText, Sparkles } from "lucide-react";
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
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl === 'leaves' ? 'leaves' : 'staff');

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab === 'staff') {
      navigate('/staff', { replace: true });
    } else {
      navigate('/staff?tab=leaves', { replace: true });
    }
  }, [activeTab, navigate]);

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
    // If we were editing the currently selected staff, update it
    if (editingStaff && selectedStaff && editingStaff.id === selectedStaff.id) {
      // Will be refreshed by the realtime subscription
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950 p-6">
      {/* Modern Header with Glass Effect */}
      <div className="mb-8 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              Staff Management
            </h1>
            <p className="text-gray-600 text-lg mt-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Manage your restaurant's staff and leave requests
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <Button 
            onClick={() => setIsTimeClockDialogOpen(true)}
            className="bg-white/80 backdrop-blur-sm border-2 border-indigo-200 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 text-indigo-700 hover:text-indigo-800 font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
          >
            <ClockIcon className="h-4 w-4 mr-2" />
            Clock In/Out
          </Button>
          <Button 
            onClick={handleAddStaff}
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2 mb-6">
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-2">
            <TabsList className="inline-flex w-auto min-w-full md:w-auto space-x-1 p-1 bg-transparent rounded-2xl">
              <TabsTrigger 
                value="staff" 
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Staff List
              </TabsTrigger>
              <TabsTrigger 
                value="leaves"
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
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
              <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
                <StaffDetail 
                  staffId={selectedStaff.id}
                  restaurantId={restaurantId}
                  onEdit={handleEditStaff}
                  onBack={() => setSelectedStaff(null)}
                />
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
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
            <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
              <StaffLeaveManager />
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
            description: "Your time clock entry has been recorded successfully.",
          });
        }}
      />
    </div>
  );
};

export default Staff;
