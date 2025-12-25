import React, { useState } from "react";
import { format, startOfDay } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useLostFound,
  CATEGORY_OPTIONS,
  ItemCategory,
  CreateLostFoundData,
} from "@/hooks/useLostFound";
import { useRooms } from "@/hooks/useRooms";
import {
  Package,
  Calendar as CalendarIcon,
  MapPin,
  Loader2,
  FileText,
  Archive,
} from "lucide-react";

interface LostFoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LostFoundDialog: React.FC<LostFoundDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { createItemAsync, isCreating } = useLostFound();
  const { rooms } = useRooms();

  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ItemCategory | "">("");
  const [foundLocation, setFoundLocation] = useState("");
  const [roomId, setRoomId] = useState("");
  const [foundDate, setFoundDate] = useState<Date>(startOfDay(new Date()));
  const [storageLocation, setStorageLocation] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setItemName("");
    setDescription("");
    setCategory("");
    setFoundLocation("");
    setRoomId("");
    setFoundDate(startOfDay(new Date()));
    setStorageLocation("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!itemName) return;

    const data: CreateLostFoundData = {
      item_name: itemName,
      description: description || undefined,
      category: (category as ItemCategory) || undefined,
      found_location: foundLocation || undefined,
      room_id: roomId || undefined,
      found_date: foundDate,
      storage_location: storageLocation || undefined,
      notes: notes || undefined,
    };

    await createItemAsync(data);
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 p-5 -m-6 mb-4 border-b border-white/20">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl shadow-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  Log Found Item
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400 mt-0.5">
                  Record a lost & found item
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-4">
          {/* Item Name */}
          <div>
            <Label className="text-sm font-medium">Item Name *</Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Black iPhone, Gold Watch"
              className="mt-1"
            />
          </div>

          {/* Category & Found Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as ItemCategory)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                Found Date *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full mt-1 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(foundDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={foundDate}
                    onSelect={(date) => date && setFoundDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Room & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Room</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Other Location</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Found Location
              </Label>
              <Input
                value={foundLocation}
                onChange={(e) => setFoundLocation(e.target.value)}
                placeholder="e.g. Lobby, Restaurant"
                className="mt-1"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item (color, brand, condition...)"
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Storage Location */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1">
              <Archive className="h-3.5 w-3.5" />
              Stored At
            </Label>
            <Input
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="e.g. Front Desk Safe, Storage Room A"
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium">Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!itemName || isCreating}
              className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Log Item
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LostFoundDialog;
