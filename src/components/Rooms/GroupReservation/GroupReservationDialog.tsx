import React, { useState, useEffect } from "react";
import { format, addDays, startOfDay } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  useGroupReservations,
  GroupDetails,
  RoomSelection,
} from "@/hooks/useGroupReservations";
import { Room } from "@/hooks/useRooms";
import RoomSelector from "./RoomSelector";
import {
  Users,
  Calendar as CalendarIcon,
  User,
  Phone,
  Mail,
  Building,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  FileText,
  Sparkles,
  Bed,
} from "lucide-react";

interface GroupReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = "details" | "rooms" | "review";

const GroupReservationDialog: React.FC<GroupReservationDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { symbol: currencySymbol } = useCurrencyContext();
  const { fetchAvailableRooms, createGroupReservation, loading } =
    useGroupReservations();

  const [step, setStep] = useState<Step>("details");
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Group Details
  const [groupName, setGroupName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [organizerPhone, setOrganizerPhone] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [checkInDate, setCheckInDate] = useState<Date>(startOfDay(new Date()));
  const [checkOutDate, setCheckOutDate] = useState<Date>(
    startOfDay(addDays(new Date(), 1))
  );
  const [notes, setNotes] = useState("");

  // Room Selection
  const [selectedRooms, setSelectedRooms] = useState<RoomSelection[]>([]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep("details");
      setGroupName("");
      setOrganizerName("");
      setOrganizerPhone("");
      setOrganizerEmail("");
      setCompanyName("");
      setCheckInDate(startOfDay(new Date()));
      setCheckOutDate(startOfDay(addDays(new Date(), 1)));
      setNotes("");
      setSelectedRooms([]);
      setAvailableRooms([]);
    }
  }, [open]);

  // Fetch available rooms when dates change
  const loadAvailableRooms = async () => {
    setLoadingRooms(true);
    const rooms = await fetchAvailableRooms(checkInDate, checkOutDate);
    setAvailableRooms(rooms);
    setLoadingRooms(false);
  };

  const handleNext = async () => {
    if (step === "details") {
      await loadAvailableRooms();
      setStep("rooms");
    } else if (step === "rooms") {
      setStep("review");
    }
  };

  const handleBack = () => {
    if (step === "rooms") {
      setStep("details");
    } else if (step === "review") {
      setStep("rooms");
    }
  };

  const handleSubmit = async () => {
    const groupDetails: GroupDetails = {
      groupName,
      organizerName,
      organizerPhone,
      organizerEmail,
      companyName: companyName || undefined,
      checkInDate,
      checkOutDate,
      notes: notes || undefined,
    };

    const success = await createGroupReservation(groupDetails, selectedRooms);

    if (success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const isDetailsValid =
    groupName && organizerName && organizerPhone && checkInDate && checkOutDate;
  const isRoomsValid = selectedRooms.length > 0;

  const calculateNights = () => {
    const diff = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : 1;
  };

  const totalPrice =
    selectedRooms.reduce((sum, room) => sum + room.price, 0) *
    calculateNights();

  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-6">
      {(["details", "rooms", "review"] as Step[]).map((s, i) => (
        <div key={s} className="contents">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              step === s
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg"
                : i < ["details", "rooms", "review"].indexOf(step)
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            {i < ["details", "rooms", "review"].indexOf(step) ? (
              <Check className="h-4 w-4" />
            ) : (
              <span>{i + 1}</span>
            )}
            <span className="hidden sm:inline">
              {s === "details"
                ? "Group Details"
                : s === "rooms"
                ? "Select Rooms"
                : "Review"}
            </span>
          </div>
          {i < 2 && (
            <div
              className={cn(
                "w-8 h-0.5 rounded",
                i < ["details", "rooms", "review"].indexOf(step)
                  ? "bg-emerald-400"
                  : "bg-gray-200 dark:bg-gray-700"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-purple-500/20 p-6 -m-6 mb-6 border-b border-white/20">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Create Group Reservation
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Book multiple rooms for your group
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {stepIndicator}

        {/* Step 1: Group Details */}
        {step === "details" && (
          <div className="space-y-6">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <Label className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Group Name *
              </Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Sharma Family Wedding Party"
                className="mt-2 border-indigo-200 dark:border-indigo-800 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  Organizer Name *
                </Label>
                <Input
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="Full name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  Phone *
                </Label>
                <Input
                  value={organizerPhone}
                  onChange={(e) => setOrganizerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  Email
                </Label>
                <Input
                  value={organizerEmail}
                  onChange={(e) => setOrganizerEmail(e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  Company Name
                </Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="For corporate bookings"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  Check-in Date *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(checkInDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={checkInDate}
                      onSelect={(date) =>
                        date && setCheckInDate(startOfDay(date))
                      }
                      disabled={(date) => date < startOfDay(new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  Check-out Date *
                </Label>
                <Popover>
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
                      onSelect={(date) =>
                        date && setCheckOutDate(startOfDay(date))
                      }
                      disabled={(date) => date <= checkInDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                Notes
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special requirements, event details..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 2: Room Selection */}
        {step === "rooms" && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              📅 Showing rooms available from{" "}
              <strong>{format(checkInDate, "MMM d")}</strong> to{" "}
              <strong>{format(checkOutDate, "MMM d, yyyy")}</strong> (
              {calculateNights()} night{calculateNights() !== 1 ? "s" : ""})
            </div>

            {loadingRooms ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="ml-2 text-gray-500">
                  Loading available rooms...
                </span>
              </div>
            ) : (
              <RoomSelector
                rooms={availableRooms}
                selectedRooms={selectedRooms}
                onSelectionChange={setSelectedRooms}
              />
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <div className="space-y-6">
            {/* Group Summary */}
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <h4 className="font-semibold text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                {groupName}
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Organizer:</span>
                  <span className="ml-2 font-medium">{organizerName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <span className="ml-2 font-medium">{organizerPhone}</span>
                </div>
                <div>
                  <span className="text-gray-500">Check-in:</span>
                  <span className="ml-2 font-medium">
                    {format(checkInDate, "PPP")}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Check-out:</span>
                  <span className="ml-2 font-medium">
                    {format(checkOutDate, "PPP")}
                  </span>
                </div>
              </div>
            </div>

            {/* Rooms Summary */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Bed className="h-5 w-5 text-gray-500" />
                Selected Rooms ({selectedRooms.length})
              </h4>
              <div className="space-y-2">
                {selectedRooms.map((room) => (
                  <div
                    key={room.roomId}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{room.roomName}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({room.capacity} guests)
                      </span>
                    </div>
                    <div className="font-semibold text-indigo-600">
                      {currencySymbol}
                      {room.price.toLocaleString()}/night
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-80">
                    Total for {calculateNights()} night
                    {calculateNights() !== 1 ? "s" : ""}
                  </div>
                  <div className="text-3xl font-bold mt-1">
                    {currencySymbol}
                    {totalPrice.toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-sm opacity-80">
                  <div>{selectedRooms.length} rooms</div>
                  <div>
                    {currencySymbol}
                    {(totalPrice / calculateNights()).toLocaleString()}/night
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex w-full gap-3">
            {step !== "details" && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}

            {step !== "review" ? (
              <Button
                onClick={handleNext}
                disabled={step === "details" ? !isDetailsValid : !isRoomsValid}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Group Reservation
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupReservationDialog;
