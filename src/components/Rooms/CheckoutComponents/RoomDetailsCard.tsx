
import React from 'react';

interface RoomDetailsCardProps {
  room: {
    name: string;
    price: number;
  };
  daysStayed: number;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    specialOccasion: string | null;
    specialOccasionDate: string | null;
  };
}

const RoomDetailsCard: React.FC<RoomDetailsCardProps> = ({ room, daysStayed, customer }) => {
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
        <p className="text-sm text-muted-foreground">Name: {customer.name}</p>
        {customer.email && (
          <p className="text-sm text-muted-foreground">Email: {customer.email}</p>
        )}
        {customer.phone && (
          <p className="text-sm text-muted-foreground">Phone: {customer.phone}</p>
        )}
        {customer.specialOccasion && (
          <p className="text-sm text-muted-foreground">
            Special Occasion: {customer.specialOccasion}
            {customer.specialOccasionDate && 
              ` (${new Date(customer.specialOccasionDate).toLocaleDateString()})`}
          </p>
        )}
      </div>
    </div>
  );
};

export default RoomDetailsCard;
