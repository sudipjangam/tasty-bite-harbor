
import React from 'react';

interface RoomDetailsCardProps {
  room: {
    name: string;
    price: number;
  };
  customerName: string;
  checkInDate: string;
  checkOutDate: string;
  daysStayed: number;
}

const RoomDetailsCard: React.FC<RoomDetailsCardProps> = ({ 
  room, 
  customerName, 
  checkInDate, 
  checkOutDate,
  daysStayed 
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="text-lg font-medium">Room Details</h3>
        <p className="text-sm text-muted-foreground">Room: {room.name}</p>
        <p className="text-sm text-muted-foreground">Rate: ₹{room.price} per day</p>
        <p className="text-sm text-muted-foreground">Days stayed: {daysStayed}</p>
      </div>
      <div>
        <h3 className="text-lg font-medium">Guest Details</h3>
        <p className="text-sm text-muted-foreground">Name: {customerName}</p>
        <p className="text-sm text-muted-foreground">Check-in: {checkInDate}</p>
        <p className="text-sm text-muted-foreground">Check-out: {checkOutDate}</p>
      </div>
    </div>
  );
};

export default RoomDetailsCard;
