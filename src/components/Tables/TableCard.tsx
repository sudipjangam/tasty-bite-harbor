
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users, Calendar } from "lucide-react";

export interface TableData {
  id: string;
  name: string;
  capacity: number;
  status: string;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
}

interface TableCardProps {
  table: TableData;
  onEdit: (table: TableData) => void;
  onDelete: (id: string) => void;
  onReserve?: (table: TableData) => void;
}

const TableCard: React.FC<TableCardProps> = ({ table, onEdit, onDelete, onReserve }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "occupied":
        return "bg-red-500";
      case "available":
        return "bg-green-500";
      case "reserved":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="p-3 sm:p-4 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 w-full">
      <div className="flex flex-col space-y-3 sm:space-y-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg truncate">{table.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                Capacity: {table.capacity}
              </span>
            </div>
          </div>
          <Badge className={`${getStatusColor(table.status)} flex-shrink-0 text-xs`}>
            {table.status}
          </Badge>
        </div>
        <div className="flex justify-end gap-1 sm:gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(table)}
            className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          {onReserve && table.status === 'available' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onReserve(table)}
              className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Reserve</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(table.id)}
            className="text-destructive hover:text-destructive text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TableCard;
