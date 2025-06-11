import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LogOut, Receipt, CreditCard, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

interface GuestCheckOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkIn: any;
  onCheckOut: (data: { checkInId: string; roomId: string; additionalCharges: any[] }) => Promise<void>;
}

const GuestCheckOutDialog: React.FC<GuestCheckOutDialogProps> = ({
  open,
  onOpenChange,
  checkIn,
  onCheckOut,
}) => {
  const [additionalCharges, setAdditionalCharges] = useState<Array<{
    description: string;
    amount: number;
    type: string;
  }>>([]);
  
  const [newCharge, setNewCharge] = useState({
    description: "",
    amount: 0,
    type: "service",
  });

  const addCharge = () => {
    if (newCharge.description && newCharge.amount > 0) {
      setAdditionalCharges(prev => [...prev, newCharge]);
      setNewCharge({ description: "", amount: 0, type: "service" });
    }
  };

  const removeCharge = (index: number) => {
    setAdditionalCharges(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const checkInDate = new Date(checkIn.check_in_time);
    const checkOutDate = new Date();
    const nightsStayed = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const roomCharges = checkIn.room_rate * nightsStayed;
    const additionalTotal = additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
    const securityDeposit = checkIn.security_deposit || 0;
    
    return {
      nightsStayed,
      roomCharges,
      additionalTotal,
      securityDeposit,
      totalBill: roomCharges + additionalTotal,
      finalAmount: roomCharges + additionalTotal - securityDeposit,
    };
  };

  const handleCheckOut = async () => {
    try {
      await onCheckOut({
        checkInId: checkIn.id,
        roomId: checkIn.room_id,
        additionalCharges,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Check-out failed:", error);
    }
  };

  const billSummary = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Guest Check-Out
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guest Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Guest Name</Label>
                <p className="font-medium">{checkIn.guest_profiles?.guest_name}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Room</Label>
                <p className="font-medium">{checkIn.rooms?.name}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Check-in Time</Label>
                <p className="font-medium">{format(new Date(checkIn.check_in_time), "PPp")}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Expected Check-out</Label>
                <p className="font-medium">{format(new Date(checkIn.expected_check_out), "PPp")}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Nights Stayed</Label>
                <p className="font-medium">{billSummary.nightsStayed}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Total Guests</Label>
                <p className="font-medium">{checkIn.total_guests}</p>
              </div>
            </CardContent>
          </Card>

          {/* Additional Charges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Charges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Charge */}
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2">
                  <Input
                    placeholder="Description"
                    value={newCharge.description}
                    onChange={(e) => setNewCharge(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newCharge.amount || ""}
                    onChange={(e) => setNewCharge(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <Button onClick={addCharge} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Existing Charges */}
              {additionalCharges.map((charge, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{charge.description}</p>
                    <p className="text-sm text-muted-foreground">{charge.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">₹{charge.amount}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCharge(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}

              {additionalCharges.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No additional charges</p>
              )}
            </CardContent>
          </Card>

          {/* Bill Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Bill Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Room Charges ({billSummary.nightsStayed} nights × ₹{checkIn.room_rate})</span>
                <span>₹{billSummary.roomCharges}</span>
              </div>
              
              {additionalCharges.map((charge, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{charge.description}</span>
                  <span>₹{charge.amount}</span>
                </div>
              ))}
              
              <Separator />
              
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>₹{billSummary.totalBill}</span>
              </div>
              
              {billSummary.securityDeposit > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Security Deposit (Refundable)</span>
                  <span>-₹{billSummary.securityDeposit}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-lg font-bold">
                <span>Final Amount</span>
                <span>₹{billSummary.finalAmount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Special Requests */}
          {checkIn.special_requests && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Special Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm bg-blue-50 p-3 rounded-lg">{checkIn.special_requests}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckOut} className="bg-red-600 hover:bg-red-700">
              <LogOut className="w-4 h-4 mr-2" />
              Complete Check-Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestCheckOutDialog;
