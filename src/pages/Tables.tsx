import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Table {
  id: string;
  name: string;
  capacity: number;
  status: string;
  restaurant_id: string;
}

const Tables = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const { toast } = useToast();

  const { data: tables = [], refetch } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      console.log("Fetching tables...");
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
        .from("rooms")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("name");

      if (error) {
        console.error("Error fetching tables:", error);
        throw error;
      }
      console.log("Fetched tables:", data);
      return data as Table[];
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
      console.log("Submitting table data:", tableData);
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

      if (editingTable) {
        console.log("Updating table:", editingTable.id);
        const { error } = await supabase
          .from("rooms")
          .update({ ...tableData })
          .eq("id", editingTable.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Table updated successfully",
        });
      } else {
        console.log("Creating new table");
        const { error } = await supabase
          .from("rooms")
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
      console.log("Deleting table:", id);
      const { error } = await supabase.from("rooms").delete().eq("id", id);
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "occupied":
        return "bg-red-500";
      case "available":
        return "bg-green-500";
      case "reserved":
        return "bg-yellow-500";
      case "maintenance":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tables</h1>
          <p className="text-muted-foreground mt-1">
            Manage your restaurant tables and rooms
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTable(null)}>
              <Plus className="mr-2" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTable ? "Edit Table" : "Add New Table"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Table Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingTable?.name}
                  placeholder="e.g., Table 1, VIP Room"
                  required
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  defaultValue={editingTable?.capacity}
                  placeholder="Number of seats"
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editingTable?.status || "available"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {editingTable ? "Update" : "Add"} Table
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map((table) => (
          <Card
            key={table.id}
            className="p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{table.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Capacity: {table.capacity}
                    </span>
                  </div>
                </div>
                <Badge className={getStatusColor(table.status)}>
                  {table.status}
                </Badge>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingTable(table);
                    setIsAddDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(table.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Tables;