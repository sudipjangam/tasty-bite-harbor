
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomData: {
    id?: string;
    name: string;
    capacity: number;
    price: number;
    status: string;
  };
  setRoomData: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => void;
  mode: 'add' | 'edit';
}

const RoomDialog: React.FC<RoomDialogProps> = ({
  open,
  onOpenChange,
  roomData,
  setRoomData,
  onSave,
  mode
}) => {
  const title = mode === 'add' ? 'Add New Room' : 'Edit Room';
  const description = mode === 'add' ? 'Create a new room for your property.' : 'Update room details and status.';
  const buttonText = mode === 'add' ? 'Add Room' : 'Save Changes';
  const idPrefix = mode === 'add' ? '' : 'edit-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}name`}>Room Name</Label>
            <Input
              id={`${idPrefix}name`}
              value={roomData.name}
              onChange={(e) =>
                setRoomData({ ...roomData, name: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}capacity`}>Capacity</Label>
            <Input
              id={`${idPrefix}capacity`}
              type="number"
              min="1"
              value={roomData.capacity}
              onChange={(e) =>
                setRoomData({
                  ...roomData,
                  capacity: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}price`}>Price per Night (₹)</Label>
            <Input
              id={`${idPrefix}price`}
              type="number"
              min="0"
              value={roomData.price}
              onChange={(e) =>
                setRoomData({
                  ...roomData,
                  price: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}status`}>Status</Label>
            <Select
              value={roomData.status}
              onValueChange={(value) =>
                setRoomData({ ...roomData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave}>{buttonText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoomDialog;
