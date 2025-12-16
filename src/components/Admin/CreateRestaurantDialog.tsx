import { useState } from "react";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateRestaurantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface RestaurantFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
}

export const CreateRestaurantDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateRestaurantDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<RestaurantFormData>();

  const onSubmit = async (data: RestaurantFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("restaurants").insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        owner_name: data.owner_name,
        owner_email: data.owner_email,
        owner_phone: data.owner_phone,
        is_active: true,
        verification_status: "pending",
      });

      if (error) throw error;

      toast.success("Restaurant created successfully");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to create restaurant: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Restaurant</DialogTitle>
          <DialogDescription>
            Add a new restaurant to the platform
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register("email", { required: true })}
                placeholder="contact@restaurant.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                {...register("phone", { required: true })}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_name">Owner Name *</Label>
              <Input
                id="owner_name"
                {...register("owner_name", { required: true })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_email">Owner Email *</Label>
              <Input
                id="owner_email"
                type="email"
                {...register("owner_email", { required: true })}
                placeholder="owner@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_phone">Owner Phone *</Label>
              <Input
                id="owner_phone"
                {...register("owner_phone", { required: true })}
                placeholder="+91 9876543210"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              {...register("address", { required: true })}
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
              Create Restaurant
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
