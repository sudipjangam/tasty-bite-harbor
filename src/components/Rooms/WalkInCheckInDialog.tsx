import React, { useState } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { GuestPreferencesEditor } from "./GuestPreferences";
import {
  User,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  CreditCard,
  Upload,
  IdCard,
  Loader2,
  CheckCircle2,
  Building,
  Gift,
  Heart,
  MessageSquare,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WalkInCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: {
    id: string;
    name: string;
    price: number;
    restaurant_id: string;
  } | null;
  onSuccess: () => void;
}

const ID_TYPES = [
  { value: "aadhar", label: "Aadhar Card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "voter_id", label: "Voter ID" },
  { value: "pan_card", label: "PAN Card" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
];

const SPECIAL_OCCASIONS = [
  { value: "none", label: "None" },
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "engagement", label: "Engagement" },
  { value: "wedding", label: "Wedding" },
  { value: "honeymoon", label: "Honeymoon" },
  { value: "business", label: "Business Trip" },
  { value: "other", label: "Other Special Occasion" },
];

const WalkInCheckInDialog: React.FC<WalkInCheckInDialogProps> = ({
  open,
  onOpenChange,
  room,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guest Details
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [idType, setIdType] = useState("aadhar");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState(1);

  // Stay Details
  const [checkInDate] = useState(new Date());
  const [checkOutDate, setCheckOutDate] = useState(addDays(new Date(), 1));
  const [showCheckOutCalendar, setShowCheckOutCalendar] = useState(false);

  // Payment Details
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  // Special Occasions & Marketing
  const [specialOccasion, setSpecialOccasion] = useState("none");
  const [specialOccasionDate, setSpecialOccasionDate] = useState<Date | null>(
    null
  );
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Guest Preferences Dialog
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);

  // Calculate stay details - normalize to start of day to avoid time issues
  const numberOfNights = Math.max(
    1,
    differenceInDays(
      new Date(
        checkOutDate.getFullYear(),
        checkOutDate.getMonth(),
        checkOutDate.getDate()
      ),
      new Date(
        checkInDate.getFullYear(),
        checkInDate.getMonth(),
        checkInDate.getDate()
      )
    )
  );
  const totalAmount = room ? room.price * numberOfNights : 0;
  const balanceAmount = totalAmount - advanceAmount;

  const resetForm = () => {
    setGuestName("");
    setGuestPhone("");
    setGuestEmail("");
    setIdType("aadhar");
    setIdNumber("");
    setAddress("");
    setNumberOfGuests(1);
    setCheckOutDate(addDays(new Date(), 1));
    setAdvanceAmount(0);
    setPaymentMethod("cash");
    setNotes("");
    setSpecialOccasion("none");
    setSpecialOccasionDate(null);
    setMarketingConsent(false);
  };

  const handleCheckIn = async () => {
    if (!room) return;

    // Validation
    if (!guestName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Guest name is required",
      });
      return;
    }

    if (!guestPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Phone number is required",
      });
      return;
    }

    if (!idNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "ID number is required",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create reservation with confirmed status
      const { data: reservation, error: reservationError } = await supabase
        .from("reservations")
        .insert({
          room_id: room.id,
          restaurant_id: room.restaurant_id,
          customer_name: guestName.trim(),
          customer_phone: guestPhone.trim(),
          customer_email: guestEmail.trim() || null,
          start_time: checkInDate.toISOString(),
          end_time: checkOutDate.toISOString(),
          status: "confirmed",
          notes: notes.trim() || null,
          special_occasion: specialOccasion !== "none" ? specialOccasion : null,
          special_occasion_date: specialOccasionDate
            ? format(specialOccasionDate, "yyyy-MM-dd")
            : null,
          marketing_consent: marketingConsent,
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      // 2. Update room status to occupied
      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "occupied" })
        .eq("id", room.id);

      if (roomError) throw roomError;

      // 3. Create initial billing record if advance is paid
      if (advanceAmount > 0) {
        const { error: billingError } = await supabase
          .from("room_billings")
          .insert({
            room_id: room.id,
            reservation_id: reservation.id,
            restaurant_id: room.restaurant_id,
            description: "Advance Payment",
            amount: -advanceAmount, // Negative to represent payment
            billing_type: "payment",
            payment_method: paymentMethod,
          });

        if (billingError) {
          console.error("Billing error:", billingError);
          // Don't throw - reservation is created, billing is secondary
        }
      }

      // 4. Store guest ID details (if we have a guests table, otherwise in notes)
      // For now, append to reservation notes
      const idDetails = `\n\nGuest ID: ${idType.toUpperCase()} - ${idNumber}${
        address ? `\nAddress: ${address}` : ""
      }`;

      await supabase
        .from("reservations")
        .update({
          notes: (notes.trim() || "") + idDetails,
        })
        .eq("id", reservation.id);

      toast({
        title: "Check-in Successful! ✓",
        description: `${guestName} has been checked into ${room.name}`,
      });

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Check-in error:", error);
      toast({
        variant: "destructive",
        title: "Check-in Failed",
        description: error.message || "An error occurred during check-in",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!room) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Building className="h-5 w-5 text-white" />
              </div>
              Walk-in Check-in - {room.name}
            </DialogTitle>
            <DialogDescription>
              Check in a walk-in guest directly. Fill in guest details and
              collect advance payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Guest Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <User className="h-4 w-4" />
                Guest Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guestName">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="guestName"
                      placeholder="Enter guest name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guestPhone">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="guestPhone"
                      placeholder="Enter phone number"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guestEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="guestEmail"
                      type="email"
                      placeholder="Enter email (optional)"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfGuests">Number of Guests</Label>
                  <Input
                    id="numberOfGuests"
                    type="number"
                    min={1}
                    value={numberOfGuests}
                    onChange={(e) =>
                      setNumberOfGuests(parseInt(e.target.value) || 1)
                    }
                  />
                </div>
              </div>

              {/* Guest Preferences Button */}
              {guestPhone && guestPhone.length >= 10 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreferencesDialog(true)}
                  className="w-full mt-2 bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200 hover:border-rose-300 text-rose-700"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Guest Preferences
                </Button>
              )}
            </div>

            {/* ID Verification Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                ID Verification
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID Type</Label>
                  <Select value={idType} onValueChange={setIdType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ID_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idNumber">
                    ID Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="idNumber"
                    placeholder="Enter ID number"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Guest address (optional)"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Stay Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Stay Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Check-in Date</Label>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium">
                    {format(checkInDate, "PPP")}
                    <span className="ml-2 text-xs text-emerald-600">
                      (Today)
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Check-out Date</Label>
                  <Popover
                    open={showCheckOutCalendar}
                    onOpenChange={setShowCheckOutCalendar}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(checkOutDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={checkOutDate}
                        onSelect={(date) => {
                          if (date && date > checkInDate) {
                            setCheckOutDate(date);
                            setShowCheckOutCalendar(false);
                          }
                        }}
                        disabled={(date) => date <= checkInDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Duration</Label>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300">
                    {numberOfNights} night{numberOfNights > 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Room Rate
                  </span>
                  <span className="font-medium">
                    {currencySymbol}
                    {room.price.toFixed(2)} / night
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Total for {numberOfNights} night
                    {numberOfNights > 1 ? "s" : ""}
                  </span>
                  <span className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {currencySymbol}
                    {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Advance Payment
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="advanceAmount">Advance Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {currencySymbol}
                    </span>
                    <Input
                      id="advanceAmount"
                      type="number"
                      min={0}
                      max={totalAmount}
                      value={advanceAmount}
                      onChange={(e) =>
                        setAdvanceAmount(
                          Math.min(parseFloat(e.target.value) || 0, totalAmount)
                        )
                      }
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {advanceAmount > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-emerald-700 dark:text-emerald-300">
                      Balance Due at Checkout
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {currencySymbol}
                      {balanceAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Special Occasions Section */}
            <div className="bg-gradient-to-r from-pink-50/50 to-rose-50/50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-2xl p-4 border border-pink-100/50 dark:border-pink-800/50">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                Special Occasions
              </h3>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Special Occasion
                  </Label>
                  <Select
                    value={specialOccasion}
                    onValueChange={setSpecialOccasion}
                  >
                    <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 focus:border-pink-500 rounded-xl transition-all duration-200">
                      <SelectValue placeholder="Select occasion (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl">
                      {SPECIAL_OCCASIONS.map((occasion) => (
                        <SelectItem
                          key={occasion.value}
                          value={occasion.value}
                          className="hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-lg"
                        >
                          {occasion.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    We offer special promotions for your next year's special
                    occasion!
                  </p>
                </div>

                {specialOccasion && specialOccasion !== "none" && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Occasion Date
                    </Label>
                    <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                      <Calendar
                        mode="single"
                        selected={specialOccasionDate || undefined}
                        onSelect={(date) =>
                          setSpecialOccasionDate(date || null)
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Is this the actual date of your {specialOccasion}? We'll
                      send you a special offer next year!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-amber-100/50 dark:border-amber-800/50">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Additional Information
              </h3>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="notes"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 focus:border-amber-500 rounded-xl transition-all duration-200"
                    placeholder="Any special requests or notes..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="marketing-consent"
                    checked={marketingConsent}
                    onCheckedChange={(checked) =>
                      setMarketingConsent(checked === true)
                    }
                    className="border-2 border-gray-300 dark:border-gray-600 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-600"
                  />
                  <label
                    htmlFor="marketing-consent"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    I agree to receive bill receipts, special offers, and
                    promotions via WhatsApp
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking In...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Check In Guest
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Preferences Dialog */}
      <GuestPreferencesEditor
        open={showPreferencesDialog}
        onOpenChange={setShowPreferencesDialog}
        guestPhone={guestPhone}
        guestName={guestName}
      />
    </>
  );
};

export default WalkInCheckInDialog;
