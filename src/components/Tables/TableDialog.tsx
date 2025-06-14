
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
import { Plus, Edit, Table } from "lucide-react";

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              {editingTable ? (
                <Edit className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              ) : (
                <Plus className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              )}
            </div>
            {editingTable ? "Edit Table" : "Add New Table"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Table Name
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={editingTable?.name}
              placeholder="e.g., Table 1"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="capacity" className="text-sm font-medium">
              Capacity
            </Label>
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
          
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">
              Status
            </Label>
            <Select name="status" defaultValue={editingTable?.status || "available"}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Available
                  </div>
                </SelectItem>
                <SelectItem value="occupied">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Occupied
                  </div>
                </SelectItem>
                <SelectItem value="reserved">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    Reserved
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              <Table className="w-4 h-4 mr-2" />
              {editingTable ? "Update" : "Add"} Table
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TableDialog;
