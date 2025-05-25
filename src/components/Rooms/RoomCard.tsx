
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ShoppingBag, Users, Tag } from "lucide-react";

interface RoomCardProps {
  room: {
    id: string;
    name: string;
    capacity: number;
    status: string;
    price: number;
  };
  foodOrdersTotal?: number;
  onEdit: (room: any) => void;
  onReserve: (room: any) => void;
  onFoodOrder: (room: any) => void;
  onCheckout: (roomId: string) => void;
  getStatusClass: (status: string) => string;
}

const RoomCard: React.FC<RoomCardProps> = ({
  room,
  foodOrdersTotal,
  onEdit,
  onReserve,
  onFoodOrder,
  onCheckout,
  getStatusClass
}) => {
  // Get status border color
  const getStatusBorderColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'border-l-4 border-l-emerald-500';
      case 'occupied':
        return 'border-l-4 border-l-blue-500';
      case 'cleaning':
        return 'border-l-4 border-l-amber-500';
      case 'maintenance':
        return 'border-l-4 border-l-rose-500';
      default:
        return 'border-l-4 border-l-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>;
      case 'occupied':
        return <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>;
      case 'cleaning':
        return <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>;
      case 'maintenance':
        return <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span>;
      default:
        return <span className="w-2 h-2 rounded-full bg-gray-300 mr-1.5"></span>;
    }
  };
  
  return (
    <Card className={`${getStatusBorderColor(room.status)} overflow-hidden shadow-md hover:shadow-lg transition-all duration-200`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center text-lg font-medium">
          {room.name}
          <span
            className={`flex items-center px-2.5 py-1 text-xs rounded-full font-medium ${getStatusClass(room.status)}`}
          >
            {getStatusIcon(room.status)}
            {room.status}
          </span>
        </CardTitle>
        <CardDescription className="space-y-1.5 mt-1">
          <div className="flex items-center text-sm">
            <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <span>Capacity: {room.capacity} {room.capacity === 1 ? "person" : "people"}</span>
          </div>
          <div className="flex items-center text-sm">
            <Tag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <span>₹{room.price} / night</span>
          </div>
          {room.status === "occupied" && foodOrdersTotal && foodOrdersTotal > 0 && (
            <div className="flex items-center text-sm font-medium text-purple-600 mt-2">
              <ShoppingBag className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
              Food Orders: ₹{foodOrdersTotal.toFixed(2)}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-wrap gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onEdit(room)}
          className="text-gray-600"
        >
          Edit
        </Button>
        
        {room.status === "available" ? (
          <Button
            variant="default"
            size="sm"
            onClick={() => onReserve(room)}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
            Reserve
          </Button>
        ) : room.status === "occupied" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFoodOrder(room)}
              className="text-purple-600 hover:bg-purple-50 hover:text-purple-700"
            >
              <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
              Food Order
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCheckout(room.id)}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Checkout
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={room.status !== "available"}
            className="text-gray-500"
          >
            {room.status === "cleaning" ? "Cleaning" : "Maintenance"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default RoomCard;
