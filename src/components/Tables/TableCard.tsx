
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users } from "lucide-react";

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
}

const TableCard: React.FC<TableCardProps> = ({ table, onEdit, onDelete }) => {
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
    <Card
      className="p-4 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{table.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Capacity: {table.capacity}
              </span>
            </div>
          </div>
          <Badge className={getStatusColor(table.status)}>
            {table.status}
          </Badge>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(table)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(table.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TableCard;
