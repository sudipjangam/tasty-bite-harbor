import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Utensils, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TableCard, { TableData } from "@/components/Tables/TableCard";
import TableDialog from "@/components/Tables/TableDialog";
import UnifiedReservationDialog from "@/components/UnifiedReservationDialog";
import ReservationsList from "@/components/Tables/ReservationsList";
import { useReservations } from "@/hooks/useReservations";
import { ReservationFormData } from "@/types/reservations";
import QRCodeManagement from "@/components/QR/QRCodeManagement";
import HelpProvider from "@/components/Help/HelpProvider";
import { FeatureLock } from "@/components/Auth/FeatureLock";
import { useRestaurantId } from "@/hooks/useRestaurantId";

const Tables = () => {
  const { restaurantName } = useRestaurantId();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableData | null>(null);
  const [selectedTableForReservation, setSelectedTableForReservation] =
    useState<TableData | null>(null);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      status: (formData.get("status") as string) || "available",
    };

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      {/* Modern Skeuomorphic Header */}
      <div className="mb-4 sm:mb-6 md:mb-8 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-gray-900 border border-purple-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl shadow-[0_10px_20px_-10px_rgba(147,51,234,0.15),inset_0_2px_2px_rgba(255,255,255,1)] dark:shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)] p-4 sm:p-6 md:p-8 relative overflow-hidden">
        {/* Decorative inner bevel */}
        <div className="absolute inset-2 border border-white/60 dark:border-white/5 rounded-[20px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl sm:rounded-2xl shadow-[inset_0_2px_2px_rgba(255,255,255,0.4),0_4px_8px_rgba(147,51,234,0.4)] border border-purple-400">
              <Utensils className="h-6 w-6 sm:h-8 sm:w-8 text-white drop-shadow-md" />
            </div>
            <div className="flex-1 min-w-0">
              {restaurantName && (
                <p className="text-[10px] font-semibold tracking-widest uppercase text-purple-400 dark:text-purple-400 mb-0.5">
                  {restaurantName}
                </p>
              )}
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent drop-shadow-sm truncate tracking-tight">
                Tables & Reservations
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base md:text-lg mt-1 font-medium truncate">
                Welcome {userName || "User"}!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <HelpProvider />
            <Button
              onClick={() => {
                setEditingTable(null);
                setIsAddDialogOpen(true);
              }}
              className="flex-1 sm:flex-none bg-gradient-to-b from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-[0_4px_10px_rgba(219,39,119,0.3),inset_0_2px_2px_rgba(255,255,255,0.4)] hover:shadow-[0_6px_12px_rgba(219,39,119,0.4),inset_0_2px_2px_rgba(255,255,255,0.5)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-pink-700 active:translate-y-[1px] transform transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4 drop-shadow-md" />
              <span className="hidden xs:inline drop-shadow-md">Add Table</span>
              <span className="xs:hidden drop-shadow-md">Add</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Skeuomorphic Tabs Container */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-purple-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl shadow-[0_8px_16px_rgba(147,51,234,0.05),inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[0_8px_16px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.05)] overflow-hidden">
        <Tabs defaultValue="tables" className="w-full">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-2 sm:p-3 border-b border-purple-100 dark:border-gray-800 shadow-inner">
            <TabsList className="grid w-full grid-cols-3 bg-white/40 dark:bg-gray-950/40 shadow-[inset_0_2px_4px_rgba(147,51,234,0.1)] rounded-xl sm:rounded-2xl p-1.5 gap-1.5 h-auto backdrop-blur-md">
              <FeatureLock feature="tables.grid" interceptClicks={true}>
                <TabsTrigger
                  value="tables"
                  className="flex items-center justify-center gap-2 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base py-2.5 sm:py-3 text-purple-700/70 dark:text-purple-300/70 data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_8px_rgba(219,39,119,0.3),inset_0_2px_2px_rgba(255,255,255,0.3)] dark:data-[state=active]:shadow-[0_4px_8px_rgba(0,0,0,0.5),inset_0_2px_2px_rgba(255,255,255,0.2)] data-[state=active]:border data-[state=active]:border-pink-600 transition-all duration-200"
                >
                  <Utensils className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-sm" />
                  <span className="hidden xs:inline drop-shadow-sm">Tables</span>
                </TabsTrigger>
              </FeatureLock>
              <FeatureLock feature="reservations.basic" interceptClicks={true}>
                <TabsTrigger
                  value="reservations"
                  className="flex items-center justify-center gap-2 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base py-2.5 sm:py-3 text-purple-700/70 dark:text-purple-300/70 data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_8px_rgba(219,39,119,0.3),inset_0_2px_2px_rgba(255,255,255,0.3)] dark:data-[state=active]:shadow-[0_4px_8px_rgba(0,0,0,0.5),inset_0_2px_2px_rgba(255,255,255,0.2)] data-[state=active]:border data-[state=active]:border-pink-600 transition-all duration-200"
                >
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-sm" />
                  <span className="hidden xs:inline drop-shadow-sm">Reservations</span>
                </TabsTrigger>
              </FeatureLock>
              <FeatureLock feature="tables.optimization" interceptClicks={true}>
                <TabsTrigger
                  value="qr-codes"
                  className="flex items-center justify-center gap-2 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base py-2.5 sm:py-3 text-purple-700/70 dark:text-purple-300/70 data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_8px_rgba(219,39,119,0.3),inset_0_2px_2px_rgba(255,255,255,0.3)] dark:data-[state=active]:shadow-[0_4px_8px_rgba(0,0,0,0.5),inset_0_2px_2px_rgba(255,255,255,0.2)] data-[state=active]:border data-[state=active]:border-pink-600 transition-all duration-200"
                >
                  <QrCode className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-sm" />
                  <span className="hidden xs:inline drop-shadow-sm">QR Codes</span>
                </TabsTrigger>
              </FeatureLock>
            </TabsList>
          </div>

          <TabsContent
            value="tables"
            className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6"
          >
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

          <TabsContent
            value="reservations"
            className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6"
          >
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

          <TabsContent value="qr-codes" className="p-3 sm:p-4 md:p-6 lg:p-8">
            {userName && (
              <QRCodeManagement
                entityType="table"
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
