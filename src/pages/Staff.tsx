
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
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { StandardizedPage } from "@/components/Layout/StandardizedPage";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
    <StandardizedPage
      title="Staff Management"
      description="Manage your restaurant's staff and leave requests"
      actions={
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button 
            onClick={() => setIsTimeClockDialogOpen(true)}
            variant="outline"
            className="bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
          >
            <ClockIcon className="h-4 w-4 mr-2" />
            Clock In/Out
          </Button>
          <Button 
            onClick={handleAddStaff}
            className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-white dark:bg-neutral-800 p-1 border border-neutral-200 dark:border-neutral-700 rounded-lg">
          <TabsTrigger 
            value="staff" 
            className="data-[state=active]:bg-primary-500 data-[state=active]:text-white text-neutral-600 dark:text-neutral-300 transition-colors"
          >
            Staff List
          </TabsTrigger>
          <TabsTrigger 
            value="leaves"
            className="data-[state=active]:bg-primary-500 data-[state=active]:text-white text-neutral-600 dark:text-neutral-300 transition-colors"
          >
            Leave Management
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="staff" className="animate-in fade-in">
          <ErrorBoundary>
            {selectedStaff ? (
              <Card className="p-6 bg-white dark:bg-neutral-800 shadow-md border-t-4 border-t-primary-500">
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
            <Card className="p-6 bg-white dark:bg-neutral-800 shadow-md">
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
    </StandardizedPage>
  );
};

export default Staff;
