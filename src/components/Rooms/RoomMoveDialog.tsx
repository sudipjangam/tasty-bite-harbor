import React, { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRoomMove, RoomMoveData } from "@/hooks/useRoomMove";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  ArrowRightLeft,
  Bed,
  Loader2,
  Wrench,
  TrendingUp,
  User,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkIn: {
    id: string;
    guest_name: string;
    room_id: string;
    room_name: string;
    room_rate: number;
  } | null;
  onSuccess?: () => void;
}

interface AvailableRoom {
  id: string;
  name: string;
  price: number;
  capacity: number;
  status: string;
}

const MOVE_REASONS = [
  { value: "upgrade", label: "Room Upgrade", icon: TrendingUp },
  { value: "maintenance", label: "Maintenance Issue", icon: Wrench },
  { value: "guest_request", label: "Guest Request", icon: User },
  { value: "other", label: "Other", icon: ArrowRightLeft },
];

const RoomMoveDialog: React.FC<RoomMoveDialogProps> = ({
  open,
  onOpenChange,
  checkIn,
  onSuccess,
}) => {
  const { moveRoom, isMoving, getAvailableRooms } = useRoomMove();
  const { symbol: currencySymbol } = useCurrencyContext();

  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [reason, setReason] = useState<
    "upgrade" | "maintenance" | "guest_request" | "other"
  >("upgrade");
  const [isComplimentary, setIsComplimentary] = useState(false);
  const [rateAdjustment, setRateAdjustment] = useState(0);
  const [notes, setNotes] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Load available rooms when dialog opens
  useEffect(() => {
    if (open && checkIn) {
      setLoadingRooms(true);
      getAvailableRooms().then((rooms) => {
        setAvailableRooms(rooms);
        setLoadingRooms(false);
      });
      // Reset form
      setSelectedRoom("");
      setReason("upgrade");
      setIsComplimentary(false);
      setRateAdjustment(0);
      setNotes("");
    }
  }, [open, checkIn]);

  const selectedRoomData = availableRooms.find((r) => r.id === selectedRoom);
  const rateDifference = selectedRoomData
    ? selectedRoomData.price - (checkIn?.room_rate || 0)
    : 0;

  const handleMove = async () => {
    if (!checkIn || !selectedRoom) return;

    try {
      await moveRoom({
        checkInId: checkIn.id,
        fromRoomId: checkIn.room_id,
        toRoomId: selectedRoom,
        reason,
        rateAdjustment: isComplimentary ? 0 : rateAdjustment,
        isComplimentary,
        notes,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Move failed:", error);
    }
  };

  if (!checkIn) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl">
        <DialogHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-5 -m-6 mb-4 border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
              <ArrowRightLeft className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Move Guest
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Transfer {checkIn.guest_name} to a different room
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Current Room */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <Label className="text-sm text-gray-500 mb-1 block">
              Current Room
            </Label>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-blue-500" />
                <span className="font-semibold text-lg">
                  {checkIn.room_name}
                </span>
              </div>
              <span className="text-gray-600">
                {currencySymbol}
                {checkIn.room_rate}/night
              </span>
            </div>
          </div>

          {/* New Room Selection */}
          <div className="space-y-2">
            <Label>Move To Room *</Label>
            {loadingRooms ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : availableRooms.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-amber-50 text-amber-700 rounded-lg">
                <AlertTriangle className="h-5 w-5" />
                No rooms available for transfer
              </div>
            ) : (
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new room" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{room.name}</span>
                        <span className="text-gray-500 ml-4">
                          {currencySymbol}
                          {room.price}/night
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedRoomData && rateDifference !== 0 && (
              <div
                className={cn(
                  "p-2 rounded-lg text-sm",
                  rateDifference > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-blue-50 text-blue-700"
                )}
              >
                {rateDifference > 0 ? "Upgrade" : "Downgrade"}: {currencySymbol}
                {Math.abs(rateDifference)}/night{" "}
                {rateDifference > 0 ? "more" : "less"}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Move *</Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as typeof reason)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOVE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      <r.icon className="h-4 w-4" />
                      {r.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Complimentary Toggle */}
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
            <div>
              <Label className="text-purple-700 font-medium">
                Complimentary Upgrade
              </Label>
              <p className="text-sm text-purple-600">
                No additional charge for room change
              </p>
            </div>
            <Switch
              checked={isComplimentary}
              onCheckedChange={setIsComplimentary}
            />
          </div>

          {/* Rate Adjustment */}
          {!isComplimentary && (
            <div className="space-y-2">
              <Label>Rate Adjustment ({currencySymbol})</Label>
              <Input
                type="number"
                value={rateAdjustment}
                onChange={(e) => setRateAdjustment(Number(e.target.value))}
                placeholder="0"
              />
              <p className="text-xs text-gray-500">
                Enter positive for upgrade charge, negative for discount
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this room transfer..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedRoom || isMoving}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          >
            {isMoving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Move Guest
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoomMoveDialog;
