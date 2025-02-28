
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, User, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StaffLeaveManager from "@/components/Staff/StaffLeaveManager";
import { useLocation, useNavigate } from "react-router-dom";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  email: string;
  phone: string;
  Shift: string;
}

const Staff = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

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

  const { data: restaurantId } = useQuery({
    queryKey: ["restaurant-id"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      return userProfile?.restaurant_id;
    },
  });

  const { data: staff = [], refetch } = useQuery({
    queryKey: ["staff", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return data as StaffMember[];
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const staffData = {
      first_name: formData.get("firstName") as string,
      last_name: formData.get("lastName") as string,
      position: formData.get("position") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      Shift: formData.get("shift") as string,
    };

    try {
      if (editingStaff) {
        const { error } = await supabase
          .from("staff")
          .update(staffData)
          .eq("id", editingStaff.id);

        if (error) throw error;
        toast({ title: "Staff member updated successfully" });
      } else {
        if (!restaurantId) throw new Error("No restaurant found");

        const { error } = await supabase
          .from("staff")
          .insert([{ ...staffData, restaurant_id: restaurantId }]);

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
            Manage your restaurant's staff and leave requests
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingStaff(null)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
              </DialogTitle>
              <DialogDescription>
                {editingStaff ? "Update the staff member's details below." : "Fill in the details below to add a new staff member."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  name="position"
                  defaultValue={editingStaff?.position}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingStaff?.email}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingStaff?.phone}
                />
              </div>
              <div>
                <Label htmlFor="shift">Shift</Label>
                <Select name="shift" defaultValue={editingStaff?.Shift || "none"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Shift</SelectItem>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Afternoon">Afternoon</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                {editingStaff ? "Update" : "Add"} Staff Member
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="staff">Staff List</TabsTrigger>
          <TabsTrigger value="leaves">Leave Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="staff">
          <Card className="bg-white dark:bg-gray-800 shadow-md p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((staffMember) => (
                  <TableRow key={staffMember.id}>
                    <TableCell>
                      <div className="bg-primary/10 p-2 rounded-full w-10 h-10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {staffMember.first_name} {staffMember.last_name}
                    </TableCell>
                    <TableCell>{staffMember.position}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {staffMember.email && (
                          <a
                            href={`mailto:${staffMember.email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {staffMember.email}
                          </a>
                        )}
                        {staffMember.phone && (
                          <a
                            href={`tel:${staffMember.phone}`}
                            className="text-blue-600 hover:underline"
                          >
                            {staffMember.phone}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {staffMember.Shift || "Not assigned"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingStaff(staffMember);
                            setIsAddDialogOpen(true);
                          }}
                          className="hover:bg-purple-100"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(staffMember.id)}
                          className="hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="leaves">
          <StaffLeaveManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Staff;
