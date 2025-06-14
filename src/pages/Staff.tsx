
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
import { UserPlus, ClockIcon } from "lucide-react";
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
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Staff Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your restaurant's staff and leave requests
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setIsTimeClockDialogOpen(true)}
            variant="outline"
            className={buttonStyles.view}
          >
            <ClockIcon className="h-4 w-4 mr-2" />
            Clock In/Out
          </Button>
          <Button 
            onClick={handleAddStaff}
            className={buttonStyles.primary}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-white dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 rounded-lg">
          <TabsTrigger 
            value="staff" 
            className="data-[state=active]:bg-primary data-[state=active]:text-white transition-colors"
          >
            Staff List
          </TabsTrigger>
          <TabsTrigger 
            value="leaves"
            className="data-[state=active]:bg-primary data-[state=active]:text-white transition-colors"
          >
            Leave Management
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="staff" className="animate-in fade-in">
          <ErrorBoundary>
            {selectedStaff ? (
              <Card className="p-6 bg-white dark:bg-gray-800 shadow-md border-t-4 border-t-primary">
                <StaffDetail 
                  staffId={selectedStaff.id}
                  restaurantId={restaurantId}
                  onEdit={handleEditStaff}
                  onBack={() => setSelectedStaff(null)}
                />
              </Card>
            ) : (
              <StaffList
                selectedStaffId={selectedStaff?.id || null}
                onSelectStaff={setSelectedStaff}
                restaurantId={restaurantId}
                onAddStaff={handleAddStaff}
              />
            )}
          </ErrorBoundary>
        </TabsContent>
        
        <TabsContent value="leaves" className="animate-in fade-in">
          <ErrorBoundary>
            <Card className="p-6 bg-white dark:bg-gray-800 shadow-md">
              <StaffLeaveManager />
            </Card>
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
