
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Building, Contact, Edit, Mail, Phone, Plus, Trash, Truck } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  restaurant_id: string;
}

interface SupplierFormData {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  restaurant_id?: string;
}

const Suppliers = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile to get restaurant_id
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('No user found');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      if (!data.restaurant_id) throw new Error('No restaurant assigned');
      return data;
    },
  });

  // Fetch suppliers
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      if (!profile?.restaurant_id) return [];
      
      console.log("Fetching suppliers...");
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq('restaurant_id', profile.restaurant_id)
        .order("name");

      if (error) {
        console.error("Error fetching suppliers:", error);
        throw error;
      }

      console.log("Fetched suppliers:", data);
      return data as Supplier[];
    },
    enabled: !!profile?.restaurant_id,
  });

  const form = useForm<SupplierFormData>({
    defaultValues: {
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  // Create supplier mutation
  const createSupplier = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      if (!profile?.restaurant_id) throw new Error('No restaurant assigned');
      
      console.log("Creating new supplier:", data);
      const { data: newSupplier, error } = await supabase
        .from("suppliers")
        .insert([{ ...data, restaurant_id: profile.restaurant_id }])
        .select()
        .single();

      if (error) throw error;
      return newSupplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({
        title: "Success",
        description: "Supplier created successfully",
      });
      setIsOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Error creating supplier:", error);
      toast({
        title: "Error",
        description: "Failed to create supplier",
        variant: "destructive",
      });
    },
  });

  // Update supplier mutation
  const updateSupplier = useMutation({
    mutationFn: async (data: SupplierFormData & { id: string }) => {
      console.log("Updating supplier:", data);
      const { error } = await supabase
        .from("suppliers")
        .update(data)
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
      setIsOpen(false);
      setEditingSupplier(null);
      form.reset();
    },
    onError: (error) => {
      console.error("Error updating supplier:", error);
      toast({
        title: "Error",
        description: "Failed to update supplier",
        variant: "destructive",
      });
    },
  });

  // Delete supplier mutation
  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      console.log("Deleting supplier:", id);
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting supplier:", error);
      toast({
        title: "Error",
        description: "Failed to delete supplier",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupplierFormData) => {
    if (editingSupplier) {
      updateSupplier.mutate({ ...data, id: editingSupplier.id });
    } else {
      createSupplier.mutate(data);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.reset({
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      deleteSupplier.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Supplier Management</h1>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingSupplier(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Supplier name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Contact person name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Phone number" type="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Email address" type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Physical address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  {editingSupplier ? "Update Supplier" : "Add Supplier"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers?.map((supplier) => (
          <Card key={supplier.id} className="flex flex-col">
            <CardContent className="pt-6 flex-grow">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">{supplier.name}</h3>
                </div>
                {supplier.contact_person && (
                  <div className="flex items-center gap-2">
                    <Contact className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.contact_person}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.address}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleEdit(supplier)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDelete(supplier.id)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Suppliers;
