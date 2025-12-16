import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
}

interface EditRestaurantDialogProps {
  restaurant: Restaurant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditRestaurantDialog = ({
  restaurant,
  open,
  onOpenChange,
  onSuccess,
}: EditRestaurantDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(restaurant.is_active);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: restaurant.name,
      email: restaurant.email || "",
      phone: restaurant.phone || "",
      address: restaurant.address || "",
      owner_name: restaurant.owner_name || "",
      owner_email: restaurant.owner_email || "",
      owner_phone: restaurant.owner_phone || "",
    },
  });

  useEffect(() => {
    reset({
      name: restaurant.name,
      email: restaurant.email || "",
      phone: restaurant.phone || "",
      address: restaurant.address || "",
      owner_name: restaurant.owner_name || "",
      owner_email: restaurant.owner_email || "",
      owner_phone: restaurant.owner_phone || "",
    });
    setIsActive(restaurant.is_active);
  }, [restaurant, reset]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          owner_name: data.owner_name,
          owner_email: data.owner_email,
          owner_phone: data.owner_phone,
          is_active: isActive,
        })
        .eq("id", restaurant.id);

      if (error) throw error;

      toast.success("Restaurant updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to update restaurant: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Restaurant</DialogTitle>
          <DialogDescription>
            Update restaurant information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              id="is_active"
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name *</Label>
              <Input
                id="name"
                {...register("name", { required: true })}
                placeholder="Restaurant Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="contact@restaurant.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_name">Owner Name</Label>
              <Input
                id="owner_name"
                {...register("owner_name")}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_email">Owner Email</Label>
              <Input
                id="owner_email"
                type="email"
                {...register("owner_email")}
                placeholder="owner@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_phone">Owner Phone</Label>
              <Input
                id="owner_phone"
                {...register("owner_phone")}
                placeholder="+91 9876543210"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              {...register("address")}
              placeholder="Complete address"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Restaurant
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
