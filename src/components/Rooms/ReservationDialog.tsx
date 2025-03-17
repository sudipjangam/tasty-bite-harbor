
import React from 'react';
import { format } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: {
    id: string;
    name: string;
    price: number;
  } | null;
  reservation: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    start_date: Date;
    end_date: Date;
    notes: string;
    special_occasion: string;
    special_occasion_date: Date | null;
    marketing_consent: boolean;
  };
  setReservation: React.Dispatch<React.SetStateAction<any>>;
  handleCreateReservation: () => void;
}

const SPECIAL_OCCASIONS = [
  { value: "none", label: "None" },
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "engagement", label: "Engagement" },
  { value: "wedding", label: "Wedding" },
  { value: "honeymoon", label: "Honeymoon" },
  { value: "business", label: "Business Trip" },
  { value: "other", label: "Other Special Occasion" }
];

const ReservationDialog: React.FC<ReservationDialogProps> = ({
  open,
  onOpenChange,
  room,
  reservation,
  setReservation,
  handleCreateReservation
}) => {
  if (!room) return null;
  
  const calculateDuration = () => {
    const startDate = new Date(reservation.start_date);
    const endDate = new Date(reservation.end_date);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            New Reservation for {room.name}
          </DialogTitle>
          <DialogDescription>
            Create a new reservation for this room.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="customer-name">Guest Name *</Label>
            <Input
              id="customer-name"
              value={reservation.customer_name}
              onChange={(e) =>
                setReservation({
                  ...reservation,
                  customer_name: e.target.value,
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-email">Guest Email</Label>
            <Input
              id="customer-email"
              type="email"
              value={reservation.customer_email}
              onChange={(e) =>
                setReservation({
                  ...reservation,
                  customer_email: e.target.value,
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-phone">Guest Phone *</Label>
            <Input
              id="customer-phone"
              value={reservation.customer_phone}
              onChange={(e) =>
                setReservation({
                  ...reservation,
                  customer_phone: e.target.value,
                })
              }
            />
            <p className="text-xs text-muted-foreground">Required for WhatsApp bill notifications and special occasion promotions</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Check-in Date</Label>
              <div className="border rounded-md p-2">
                <Calendar
                  mode="single"
                  selected={reservation.start_date}
                  onSelect={(date) =>
                    date && setReservation({ ...reservation, start_date: date })
                  }
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Check-out Date</Label>
              <div className="border rounded-md p-2">
                <Calendar
                  mode="single"
                  selected={reservation.end_date}
                  onSelect={(date) =>
                    date && setReservation({ ...reservation, end_date: date })
                  }
                  disabled={(date) =>
                    date < new Date() || date <= reservation.start_date
                  }
                  initialFocus
                />
              </div>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="special-occasion">Special Occasion</Label>
            <Select
              value={reservation.special_occasion || "none"}
              onValueChange={(value) =>
                setReservation({ 
                  ...reservation, 
                  special_occasion: value === "none" ? "" : value 
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select occasion (optional)" />
              </SelectTrigger>
              <SelectContent>
                {SPECIAL_OCCASIONS.map((occasion) => (
                  <SelectItem key={occasion.value} value={occasion.value}>
                    {occasion.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              We offer special promotions for your next year's special occasion!
            </p>
          </div>
          
          {reservation.special_occasion && reservation.special_occasion !== "none" && (
            <div className="grid gap-2">
              <Label>Occasion Date</Label>
              <div className="border rounded-md p-2">
                <Calendar
                  mode="single"
                  selected={reservation.special_occasion_date || undefined}
                  onSelect={(date) =>
                    setReservation({ ...reservation, special_occasion_date: date })
                  }
                  initialFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Is this the actual date of your {reservation.special_occasion}? We'll send you a special offer next year!
              </p>
            </div>
          )}
          
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={reservation.notes}
              onChange={(e) =>
                setReservation({ ...reservation, notes: e.target.value })
              }
            />
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="marketing-consent"
              checked={reservation.marketing_consent}
              onCheckedChange={(checked) => 
                setReservation({ 
                  ...reservation, 
                  marketing_consent: checked === true 
                })
              }
            />
            <label htmlFor="marketing-consent" className="text-sm">
              I agree to receive bill receipts, special offers, and promotions via WhatsApp
            </label>
          </div>
          
          <div className="pt-2">
            <p className="text-sm">
              Reservation summary: Check-in on{" "}
              <strong>{format(reservation.start_date, "PPP")}</strong> and
              check-out on{" "}
              <strong>{format(reservation.end_date, "PPP")}</strong>
            </p>
            <p className="text-sm mt-1">
              Total cost: <strong>₹{(room.price || 0) * calculateDuration()}</strong>
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateReservation}
            disabled={!reservation.customer_name || !reservation.customer_phone}
          >
            Create Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationDialog;
