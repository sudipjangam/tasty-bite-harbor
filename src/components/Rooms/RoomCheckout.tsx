import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  CreditCard, 
  Banknote, 
  QrCode, 
  Plus, 
  Trash2 
} from 'lucide-react';

interface RoomCheckoutProps {
  roomId: string;
  reservationId: string;
  onComplete: () => void;
}

interface RoomDetails {
  id: string;
  name: string;
  price: number;
  capacity: number;
  restaurant_id: string;
}

interface ReservationDetails {
  id: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  customer_email: string | null;
  customer_phone: string | null;
}

interface AdditionalCharge {
  id: string;
  name: string;
  amount: number;
}

const RoomCheckout: React.FC<RoomCheckoutProps> = ({ roomId, reservationId, onComplete }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [newCharge, setNewCharge] = useState({ name: '', amount: 0 });
  const [serviceCharge, setServiceCharge] = useState(0);
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [totalAmount, setTotalAmount] = useState(0);
  const [daysStayed, setDaysStayed] = useState(0);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError) throw roomError;
        
        if (roomData && typeof roomData.price === 'undefined') {
          roomData.price = 0;
        }
        
        setRoom(roomData as RoomDetails);

        const { data: reservationData, error: reservationError } = await supabase
          .from('reservations')
          .select('*')
          .eq('id', reservationId)
          .single();

        if (reservationError) throw reservationError;
        setReservation(reservationData);

        const startDate = new Date(reservationData.start_time);
        const endDate = new Date(reservationData.end_time);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysStayed(diffDays === 0 ? 1 : diffDays);
      } catch (error) {
        console.error('Error fetching details:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load room details. Please try again."
        });
      }
    };

    fetchDetails();
  }, [roomId, reservationId, toast]);

  useEffect(() => {
    if (room) {
      const roomTotal = room.price * daysStayed;
      const additionalTotal = additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
      const serviceChargeAmount = includeServiceCharge ? serviceCharge : 0;
      setTotalAmount(roomTotal + additionalTotal + serviceChargeAmount);
    }
  }, [room, daysStayed, additionalCharges, serviceCharge, includeServiceCharge]);

  const handleAddCharge = () => {
    if (newCharge.name && newCharge.amount > 0) {
      setAdditionalCharges([
        ...additionalCharges,
        { id: Date.now().toString(), ...newCharge }
      ]);
      setNewCharge({ name: '', amount: 0 });
    }
  };

  const handleRemoveCharge = (id: string) => {
    setAdditionalCharges(additionalCharges.filter(charge => charge.id !== id));
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      if (!room || !reservation) {
        throw new Error("Room or reservation details missing");
      }

      const formattedCharges = additionalCharges.map(charge => ({
        id: charge.id,
        name: charge.name,
        amount: Number(charge.amount)
      }));

      const { data, error } = await supabase
        .from('room_billings')
        .insert({
          reservation_id: reservationId,
          room_id: roomId,
          restaurant_id: room.restaurant_id,
          customer_name: reservation.customer_name,
          days_stayed: daysStayed,
          room_charges: room.price * daysStayed,
          service_charge: includeServiceCharge ? Number(serviceCharge) : 0,
          additional_charges: formattedCharges,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          payment_status: 'completed',
          checkout_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Checkout error:', error);
        throw error;
      }

      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'cleaning' })
        .eq('id', roomId)
        .eq('restaurant_id', room.restaurant_id);

      if (roomError) throw roomError;

      const { error: reservationError } = await supabase
        .from('reservations')
        .update({ status: 'completed' })
        .eq('id', reservationId)
        .eq('restaurant_id', room.restaurant_id);

      if (reservationError) throw reservationError;

      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        variant: "destructive",
        title: "Checkout Failed",
        description: "There was an error processing your checkout. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    onComplete();
  };

  if (!room || !reservation) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="pt-6">
          <p className="text-center">Loading checkout details...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Room Checkout</CardTitle>
          <CardDescription>
            Complete the checkout process for {reservation.customer_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium">Room Details</h3>
                <p className="text-sm text-muted-foreground">Room: {room.name}</p>
                <p className="text-sm text-muted-foreground">Rate: ₹{room.price} per day</p>
                <p className="text-sm text-muted-foreground">Days stayed: {daysStayed}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium">Guest Details</h3>
                <p className="text-sm text-muted-foreground">Name: {reservation.customer_name}</p>
                {reservation.customer_email && (
                  <p className="text-sm text-muted-foreground">Email: {reservation.customer_email}</p>
                )}
                {reservation.customer_phone && (
                  <p className="text-sm text-muted-foreground">Phone: {reservation.customer_phone}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Room Charges</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Room charge ({daysStayed} day{daysStayed !== 1 ? 's' : ''})</TableCell>
                    <TableCell className="text-right">₹{room.price * daysStayed}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Additional Charges</h3>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Service"
                    className="w-32"
                    value={newCharge.name}
                    onChange={(e) => setNewCharge({...newCharge, name: e.target.value})}
                  />
                  <Input 
                    type="number"
                    placeholder="Amount"
                    className="w-24"
                    value={newCharge.amount || ''}
                    onChange={(e) => setNewCharge({...newCharge, amount: parseFloat(e.target.value) || 0})}
                  />
                  <Button size="sm" variant="outline" onClick={handleAddCharge}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {additionalCharges.map((charge) => (
                    <TableRow key={charge.id}>
                      <TableCell>{charge.name}</TableCell>
                      <TableCell className="text-right">₹{charge.amount}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveCharge(charge.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="flex items-center gap-2">
                      <Label htmlFor="include-service">Service Charge</Label>
                      <input
                        id="include-service"
                        type="checkbox"
                        checked={includeServiceCharge}
                        onChange={(e) => setIncludeServiceCharge(e.target.checked)}
                        className="mr-2"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={serviceCharge}
                        onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                        className="w-24 ml-auto"
                        disabled={!includeServiceCharge}
                      />
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Payment Method</h3>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  className="flex items-center gap-2"
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote className="h-4 w-4" />
                  Cash
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  className="flex items-center gap-2"
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="h-4 w-4" />
                  Card
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'online' ? 'default' : 'outline'}
                  className="flex items-center gap-2"
                  onClick={() => setPaymentMethod('online')}
                >
                  <QrCode className="h-4 w-4" />
                  Online/QR
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onComplete}>
            Cancel
          </Button>
          <Button onClick={handleCheckout} disabled={loading}>
            {loading ? "Processing..." : "Complete Checkout"}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout Completed</DialogTitle>
            <DialogDescription>
              The room has been checked out successfully and marked for cleaning.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleSuccessClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoomCheckout;
