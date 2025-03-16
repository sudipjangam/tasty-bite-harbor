
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ShoppingBag } from "lucide-react";

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
  return (
    <Card key={room.id}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {room.name}
          <span
            className={`px-2 py-1 text-xs rounded-full ${getStatusClass(room.status)}`}
          >
            {room.status}
          </span>
        </CardTitle>
        <CardDescription>
          <div>Capacity: {room.capacity} {room.capacity === 1 ? "person" : "people"}</div>
          <div>Price: ₹{room.price} / night</div>
          {room.status === "occupied" && foodOrdersTotal && foodOrdersTotal > 0 && (
            <div className="mt-2 font-medium text-purple-600">
              Food Orders: ₹{foodOrdersTotal.toFixed(2)}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => onEdit(room)}>
          Edit
        </Button>
        
        {room.status === "available" ? (
          <Button
            variant="default"
            onClick={() => onReserve(room)}
          >
            <CalendarCheck className="mr-2 h-4 w-4" />
            Reserve
          </Button>
        ) : room.status === "occupied" ? (
          <>
            <Button
              variant="outline"
              onClick={() => onFoodOrder(room)}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Food Order
            </Button>
            <Button
              variant="secondary"
              onClick={() => onCheckout(room.id)}
            >
              Checkout
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            disabled={room.status !== "available"}
          >
            {room.status === "cleaning" ? "Cleaning" : "Maintenance"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default RoomCard;
