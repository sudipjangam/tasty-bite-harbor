
import React from 'react';
import RoomCheckoutPage from './CheckoutComponents/RoomCheckoutPage';

interface RoomCheckoutProps {
  roomId: string;
  reservationId: string;
  onComplete: () => Promise<void>;
}

const RoomCheckout: React.FC<RoomCheckoutProps> = ({ 
  roomId, 
  reservationId, 
  onComplete 
}) => {
  return <RoomCheckoutPage roomId={roomId} reservationId={reservationId} onComplete={onComplete} />;
};

export default RoomCheckout;
