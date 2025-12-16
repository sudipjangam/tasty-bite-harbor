import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TableCard, { TableData } from "@/components/Tables/TableCard";
import TableDialog from "@/components/Tables/TableDialog";
import UnifiedReservationDialog from "@/components/UnifiedReservationDialog";
import ReservationsList from "@/components/Tables/ReservationsList";
import { useReservations } from "@/hooks/useReservations";
import { ReservationFormData } from "@/types/reservations";

const Tables = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableData | null>(null);
  const [selectedTableForReservation, setSelectedTableForReservation] = useState<TableData | null>(null);
  const { toast } = useToast();
  const [userName, setUserName] = useState<string>("");

  const {
    reservations,
    isLoading: reservationsLoading,
    createReservation,
    updateReservationStatus,
    deleteReservation,
  } = useReservations();

  // Fetch user profile to get the username
  useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (data?.first_name) {
        setUserName(data.first_name);
      }
      return data;
    },
  });

  const { data: tables = [], refetch } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      console.log("Fetching tables...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("name");

      if (error) {
        console.error("Error fetching tables:", error);
        throw error;
      }
      return data as TableData[];
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tableData = {
      name: formData.get("name") as string,
      capacity: parseInt(formData.get("capacity") as string),
      status: formData.get("status") as string || "available",
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      if (editingTable) {
        const { error } = await supabase
          .from("restaurant_tables")
          .update({ ...tableData })
          .eq("id", editingTable.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Table updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("restaurant_tables")
          .insert([{ ...tableData, restaurant_id: userProfile.restaurant_id }]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Table added successfully",
        });
      }

      refetch();
      setIsAddDialogOpen(false);
      setEditingTable(null);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("restaurant_tables")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Table deleted successfully",
      });
      refetch();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditTable = (table: TableData) => {
    setEditingTable(table);
    setIsAddDialogOpen(true);
  };

  const handleReserveTable = (table: TableData) => {
    setSelectedTableForReservation(table);
    setIsReservationDialogOpen(true);
  };

  const handleCreateReservation = async (data: ReservationFormData) => {
    if (!selectedTableForReservation) return;
    
    await createReservation.mutateAsync({
      ...data,
      table_id: selectedTableForReservation.id,
    });
  };

  const handleUpdateReservationStatus = (id: string, status: any) => {
    updateReservationStatus.mutate({ id, status });
  };

  const handleDeleteReservation = (id: string) => {
    deleteReservation.mutate(id);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Modern Header with Glass Effect */}
      <div className="mb-4 sm:mb-6 md:mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="p-2 sm:p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl sm:rounded-2xl shadow-lg">
              <Utensils className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent truncate">
                Tables & Reservations
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base md:text-lg mt-1 truncate">
                Welcome {userName || "User"}!
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => {
              setEditingTable(null);
              setIsAddDialogOpen(true);
            }} 
            className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Add Table</span>
            <span className="xs:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Modern Tabs with Glass Effect */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
        <Tabs defaultValue="tables" className="w-full">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-1 sm:p-2">
            <TabsList className="grid w-full grid-cols-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl">
              <TabsTrigger 
                value="tables" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base py-2 sm:py-2.5"
              >
                <Utensils className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Tables</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reservations" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base py-2 sm:py-2.5"
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Reservations</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="tables" className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {tables.map((table) => (
                <TableCard 
                  key={table.id} 
                  table={table} 
                  onEdit={handleEditTable} 
                  onDelete={handleDelete}
                  onReserve={handleReserveTable}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="reservations" className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {reservationsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <ReservationsList
                reservations={reservations}
                onUpdateStatus={handleUpdateReservationStatus}
                onDelete={handleDeleteReservation}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TableDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        editingTable={editingTable}
        onSubmit={handleSubmit}
      />

      <UnifiedReservationDialog
        isOpen={isReservationDialogOpen}
        onOpenChange={(open) => {
          setIsReservationDialogOpen(open);
          if (!open) setSelectedTableForReservation(null);
        }}
        onSubmit={async (data: any) => {
          await createReservation.mutateAsync({
            ...data,
            table_id: data.table_id,
          });
        }}
        type="table"
      />
    </div>
  );
};

export default Tables;
