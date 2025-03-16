
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TableCard, { TableData } from "@/components/Tables/TableCard";
import TableDialog from "@/components/Tables/TableDialog";

const Tables = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableData | null>(null);
  const { toast } = useToast();
  const [userName, setUserName] = useState<string>("");

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

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Table Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome {userName || "User"}!
          </p>
        </div>
        <Button 
          onClick={() => {
            setEditingTable(null);
            setIsAddDialogOpen(true);
          }} 
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Table
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map((table) => (
          <TableCard 
            key={table.id} 
            table={table} 
            onEdit={handleEditTable} 
            onDelete={handleDelete} 
          />
        ))}
      </div>

      <TableDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        editingTable={editingTable}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default Tables;
