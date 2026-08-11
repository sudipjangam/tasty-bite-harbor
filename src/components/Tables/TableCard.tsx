
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
        return "bg-gradient-to-b from-red-400 to-red-600 text-white border-red-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)]";
      case "available":
        return "bg-gradient-to-b from-green-400 to-green-600 text-white border-green-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)]";
      case "reserved":
        return "bg-gradient-to-b from-yellow-400 to-yellow-600 text-white border-yellow-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)]";
      default:
        return "bg-gradient-to-b from-gray-400 to-gray-600 text-white border-gray-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)]";
    }
  };

  return (
    <Card className="p-4 sm:p-5 bg-gradient-to-b from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-300/80 dark:border-gray-700 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_12px_20px_-8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-300 hover:-translate-y-1 w-full rounded-2xl relative overflow-hidden group">
      {/* Decorative physical highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
      
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg sm:text-xl text-gray-800 dark:text-gray-100 drop-shadow-sm truncate">{table.name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <div className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded-full shadow-inner">
                <Users className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300 flex-shrink-0" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Capacity: {table.capacity}
              </span>
            </div>
          </div>
          <Badge className={`${getStatusColor(table.status)} flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border`}>
            {table.status}
          </Badge>
        </div>
        
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent my-2"></div>
        
        <div className="flex justify-between gap-2 sm:gap-3 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(table)}
            className="flex-1 text-xs sm:text-sm px-2 py-1 sm:py-2 bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-700 dark:to-gray-800 border border-gray-300 dark:border-gray-600 shadow-[0_4px_6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] active:translate-y-[1px] rounded-xl font-bold text-gray-700 dark:text-gray-200 transition-all"
          >
            <Edit className="h-4 w-4 sm:mr-1.5 drop-shadow-sm text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          {onReserve && table.status === 'available' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onReserve(table)}
              className="flex-1 text-xs sm:text-sm px-2 py-1 sm:py-2 bg-gradient-to-b from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border border-pink-700 shadow-[0_4px_6px_rgba(219,39,119,0.3),inset_0_2px_2px_rgba(255,255,255,0.4)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-[1px] rounded-xl font-bold transition-all"
            >
              <Calendar className="h-4 w-4 sm:mr-1.5 drop-shadow-md" />
              <span className="hidden sm:inline drop-shadow-md">Reserve</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(table.id)}
            className="flex-1 text-xs sm:text-sm px-2 py-1 sm:py-2 bg-gradient-to-b from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 dark:from-red-900/30 dark:to-red-900/50 border border-red-300 dark:border-red-800 shadow-[0_4px_6px_rgba(239,68,68,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_6px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] active:shadow-[inset_0_2px_4px_rgba(239,68,68,0.2)] active:translate-y-[1px] rounded-xl font-bold text-red-600 dark:text-red-400 transition-all"
          >
            <Trash2 className="h-4 w-4 sm:mr-1.5 drop-shadow-sm text-red-600 dark:text-red-400" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TableCard;
