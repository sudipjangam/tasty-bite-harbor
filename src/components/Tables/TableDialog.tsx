
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableData } from "./TableCard";

interface TableDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingTable: TableData | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

const TableDialog: React.FC<TableDialogProps> = ({
  isOpen,
  onOpenChange,
  editingTable,
  onSubmit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingTable ? "Edit Table" : "Add New Table"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Table Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={editingTable?.name}
              placeholder="e.g., Table 1"
              required
            />
          </div>
          <div>
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min="1"
              defaultValue={editingTable?.capacity}
              placeholder="Number of seats"
              required
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={editingTable?.status || "available"}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            {editingTable ? "Update" : "Add"} Table
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TableDialog;
