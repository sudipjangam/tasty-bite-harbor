import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Users,
  User,
  Phone,
  Mail,
  Utensils,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { FloorTable } from "@/types/tableFloorPlan";

interface TableBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Array<{ id: string; name: string; capacity: number }>;
  defaultTableId?: string;
  onSubmit: (data: {
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    party_size: number;
    reservation_date: string;
    reservation_time: string;
    duration_minutes: number;
    special_requests?: string;
    table_id: string;
  }) => Promise<void>;
}

export const TableBookingDialog: React.FC<TableBookingDialogProps> = ({
  isOpen,
  onClose,
  tables,
  defaultTableId,
  onSubmit,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [partySize, setPartySize] = useState<number>(4);
  const [reservationDate, setReservationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reservationTime, setReservationTime] = useState("19:30");
  const [tableId, setTableId] = useState(defaultTableId || (tables[0]?.id ?? ""));
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync default table
  React.useEffect(() => {
    if (defaultTableId) {
      setTableId(defaultTableId);
    } else if (tables.length > 0 && !tableId) {
      setTableId(tables[0].id);
    }
  }, [defaultTableId, tables]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !tableId) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        party_size: partySize,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        duration_minutes: 120,
        special_requests: specialRequests,
        table_id: tableId,
      });
      onClose();
      // Reset
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setSpecialRequests("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeSlots = [
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-md">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-white">
                New Table Dining Booking
              </DialogTitle>
              <p className="text-xs text-gray-500">
                Reserve a dining table for a customer party
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1 text-xs">
          {/* Table Selector */}
          <div className="space-y-1">
            <Label className="font-semibold text-gray-700 dark:text-gray-300">
              Select Dining Table *
            </Label>
            <Select value={tableId} onValueChange={setTableId}>
              <SelectTrigger className="rounded-xl h-9 text-xs">
                <SelectValue placeholder="Choose table" />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-48">
                {tables.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    Table {t.name} ({t.capacity} Pax)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Guest Name & Phone */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <User className="h-3 w-3 text-purple-600" /> Guest Name *
              </Label>
              <Input
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. John Doe"
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Phone className="h-3 w-3 text-purple-600" /> Phone Number
              </Label>
              <Input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit number"
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          {/* Date, Time & Party Size */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-purple-600" /> Date *
              </Label>
              <Input
                type="date"
                required
                value={reservationDate}
                onChange={(e) => setReservationDate(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Clock className="h-3 w-3 text-purple-600" /> Time *
              </Label>
              <Select value={reservationTime} onValueChange={setReservationTime}>
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-48">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot} className="text-xs">
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Users className="h-3 w-3 text-purple-600" /> Guests
              </Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={partySize}
                onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          {/* Notes / Occasion */}
          <div className="space-y-1">
            <Label className="font-semibold text-gray-700 dark:text-gray-300">
              Special Occasion / Dietary Notes (Optional)
            </Label>
            <Textarea
              rows={2}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="e.g. Birthday celebration, window seat, high chair needed"
              className="rounded-xl text-xs resize-none"
            />
          </div>

          <DialogFooter className="flex gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !customerName}
              className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white font-bold text-xs h-9 shadow-md"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Confirm Booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
