import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Phone, Mail, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ChefHat } from "lucide-react";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  phone: string | null;
  email: string | null;
  Shift: string | null;
  restaurant_id: string;
}

const Staff = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const { toast } = useToast();

  const { data: staff = [], refetch } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
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
        .from("staff")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("first_name");

      if (error) throw error;
      return data as StaffMember[];
    },
  });

  const staffStats = {
    total: staff?.length || 0,
    chefs: staff?.filter(member => member.position === "chef").length || 0,
    waiters: staff?.filter(member => member.position === "waiter").length || 0,
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const staffData = {
      first_name: formData.get("firstName") as string,
      last_name: formData.get("lastName") as string,
      position: formData.get("position") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      Shift: formData.get("shift") as string,
    };

    try {
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

      if (editingStaff) {
        const { error } = await supabase
          .from("staff")
          .update({ ...staffData })
          .eq("id", editingStaff.id);

        if (error) throw error;
        toast({ title: "Staff member updated successfully" });
      } else {
        const { error } = await supabase
          .from("staff")
          .insert([{ ...staffData, restaurant_id: userProfile.restaurant_id }]);

        if (error) throw error;
        toast({ title: "Staff member added successfully" });
      }

      refetch();
      setIsAddDialogOpen(false);
      setEditingStaff(null);
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
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Staff member deleted successfully" });
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

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Staff Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your restaurant staff and roles
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingStaff(null)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={editingStaff?.first_name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={editingStaff?.last_name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Select name="position" defaultValue={editingStaff?.position || "waiter"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waiter">Waiter</SelectItem>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="host">Host</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="shift">Shift</Label>
                <Select name="shift" defaultValue={editingStaff?.Shift || "morning"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={editingStaff?.phone || ""}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingStaff?.email || ""}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingStaff ? "Update" : "Add"} Staff Member
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border-none shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Total Staff</h3>
              <p className="text-2xl font-bold text-purple-600">{staffStats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border-none shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <ChefHat className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Chefs</h3>
              <p className="text-2xl font-bold text-orange-600">{staffStats.chefs}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border-none shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <UserRound className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Waiters</h3>
              <p className="text-2xl font-bold text-blue-600">{staffStats.waiters}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => (
          <Card key={member.id} className="p-4 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <UserRound className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {member.first_name} {member.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {member.position}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    Shift: {member.Shift || "Not set"}
                  </p>
                  {member.phone && (
                    <p className="text-sm flex items-center gap-1 mt-2">
                      <Phone className="h-4 w-4" />
                      {member.phone}
                    </p>
                  )}
                  {member.email && (
                    <p className="text-sm flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {member.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingStaff(member);
                    setIsAddDialogOpen(true);
                  }}
                  className="hover:bg-purple-100"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(member.id)}
                  className="hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Staff;
