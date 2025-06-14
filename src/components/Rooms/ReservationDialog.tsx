
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
import { User, Phone, Mail, Calendar as CalendarIcon, Gift, MessageSquare, Sparkles, Heart } from 'lucide-react';

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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-red-500/20 p-6 -m-6 mb-6 border-b border-white/20">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  New Reservation for {room.name}
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Create a new reservation for this room
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="grid gap-6 py-4 px-6">
          {/* Guest Information Section */}
          <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-2xl p-4 border border-blue-100/50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Guest Information
            </h3>
            
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="customer-name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Guest Name *
                </Label>
                <Input
                  id="customer-name"
                  value={reservation.customer_name}
                  onChange={(e) =>
                    setReservation({
                      ...reservation,
                      customer_name: e.target.value,
                    })
                  }
                  className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-all duration-200"
                  placeholder="Enter guest name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="customer-email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Guest Email
                  </Label>
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
                    className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-all duration-200"
                    placeholder="guest@email.com"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="customer-phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Guest Phone *
                  </Label>
                  <Input
                    id="customer-phone"
                    value={reservation.customer_phone}
                    onChange={(e) =>
                      setReservation({
                        ...reservation,
                        customer_phone: e.target.value,
                      })
                    }
                    className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-all duration-200"
                    placeholder="Phone number"
                  />
                  <p className="text-xs text-gray-500">Required for WhatsApp bill notifications and special occasion promotions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stay Dates Section */}
          <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 rounded-2xl p-4 border border-green-100/50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-green-600" />
              Stay Dates
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-gray-700">Check-in Date</Label>
                <div className="border-2 border-gray-200 rounded-xl p-2 bg-white/80 backdrop-blur-sm">
                  <Calendar
                    mode="single"
                    selected={reservation.start_date}
                    onSelect={(date) =>
                      date && setReservation({ ...reservation, start_date: date })
                    }
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-gray-700">Check-out Date</Label>
                <div className="border-2 border-gray-200 rounded-xl p-2 bg-white/80 backdrop-blur-sm">
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
                    className="pointer-events-auto"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Special Occasions Section */}
          <div className="bg-gradient-to-r from-pink-50/50 to-rose-50/50 rounded-2xl p-4 border border-pink-100/50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Gift className="h-5 w-5 text-pink-600" />
              Special Occasions
            </h3>
            
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="special-occasion" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Special Occasion
                </Label>
                <Select
                  value={reservation.special_occasion || "none"}
                  onValueChange={(value) =>
                    setReservation({ 
                      ...reservation, 
                      special_occasion: value === "none" ? "" : value 
                    })
                  }
                >
                  <SelectTrigger className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-pink-500 rounded-xl transition-all duration-200">
                    <SelectValue placeholder="Select occasion (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl">
                    {SPECIAL_OCCASIONS.map((occasion) => (
                      <SelectItem 
                        key={occasion.value} 
                        value={occasion.value}
                        className="hover:bg-pink-50 rounded-lg"
                      >
                        {occasion.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  We offer special promotions for your next year's special occasion!
                </p>
              </div>
              
              {reservation.special_occasion && reservation.special_occasion !== "none" && (
                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-gray-700">Occasion Date</Label>
                  <div className="border-2 border-gray-200 rounded-xl p-2 bg-white/80 backdrop-blur-sm">
                    <Calendar
                      mode="single"
                      selected={reservation.special_occasion_date || undefined}
                      onSelect={(date) =>
                        setReservation({ ...reservation, special_occasion_date: date })
                      }
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Is this the actual date of your {reservation.special_occasion}? We'll send you a special offer next year!
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Additional Information Section */}
          <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 rounded-2xl p-4 border border-amber-100/50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-600" />
              Additional Information
            </h3>
            
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">Notes</Label>
                <Input
                  id="notes"
                  value={reservation.notes}
                  onChange={(e) =>
                    setReservation({ ...reservation, notes: e.target.value })
                  }
                  className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-amber-500 rounded-xl transition-all duration-200"
                  placeholder="Any special requests or notes..."
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
                  className="border-2 border-gray-300 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-600"
                />
                <label htmlFor="marketing-consent" className="text-sm text-gray-700">
                  I agree to receive bill receipts, special offers, and promotions via WhatsApp
                </label>
              </div>
            </div>
          </div>
          
          {/* Reservation Summary */}
          <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-2xl p-4 border border-indigo-100/50">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Reservation Summary</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                Check-in on{" "}
                <strong className="text-indigo-600">{format(reservation.start_date, "PPP")}</strong> and
                check-out on{" "}
                <strong className="text-indigo-600">{format(reservation.end_date, "PPP")}</strong>
              </p>
              <p className="text-lg font-semibold">
                Total cost: <span className="text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">₹{(room.price || 0) * calculateDuration()}</span>
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="px-6 pb-6">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1 border-2 border-gray-300 hover:border-gray-400 bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-gray-50 rounded-xl py-3 font-semibold transition-all duration-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateReservation}
            disabled={!reservation.customer_name || !reservation.customer_phone}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Create Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationDialog;
