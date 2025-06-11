
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, User, Phone, Mail, CreditCard, Key } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface GuestCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: any;
  room: any;
  onCheckIn: (checkInData: any) => Promise<void>;
}

const GuestCheckInDialog: React.FC<GuestCheckInDialogProps> = ({
  open,
  onOpenChange,
  reservation,
  room,
  onCheckIn,
}) => {
  const [guestData, setGuestData] = useState({
    guest_name: reservation?.customer_name || "",
    guest_email: reservation?.customer_email || "",
    guest_phone: reservation?.customer_phone || "",
    id_type: "",
    id_number: "",
    nationality: "",
    date_of_birth: null as Date | null,
    address: {
      street: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
    },
    emergency_contact: {
      name: "",
      phone: "",
      relationship: "",
    },
  });

  const [checkInDetails, setCheckInDetails] = useState({
    total_guests: 1,
    security_deposit: 1000,
    special_requests: "",
    key_cards_issued: 1,
    room_rate: room?.price || 0,
  });

  const [currentStep, setCurrentStep] = useState(1);

  const handleGuestDataChange = (field: string, value: any) => {
    setGuestData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setGuestData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setGuestData(prev => ({
      ...prev,
      emergency_contact: { ...prev.emergency_contact, [field]: value }
    }));
  };

  const handleCheckIn = async () => {
    try {
      await onCheckIn({
        guestData,
        checkInDetails: {
          ...checkInDetails,
          reservation_id: reservation.id,
          room_id: room.id,
          expected_check_out: reservation.end_time,
        },
      });
      onOpenChange(false);
      setCurrentStep(1);
    } catch (error) {
      console.error("Check-in failed:", error);
    }
  };

  const isStep1Valid = guestData.guest_name && guestData.guest_phone && guestData.id_type && guestData.id_number;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Guest Check-In - {room?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-4">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
              currentStep >= 1 ? "bg-primary text-white" : "bg-gray-200 text-gray-600"
            )}>
              1
            </div>
            <div className="w-16 h-0.5 bg-gray-200"></div>
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
              currentStep >= 2 ? "bg-primary text-white" : "bg-gray-200 text-gray-600"
            )}>
              2
            </div>
            <div className="w-16 h-0.5 bg-gray-200"></div>
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
              currentStep >= 3 ? "bg-primary text-white" : "bg-gray-200 text-gray-600"
            )}>
              3
            </div>
          </div>

          {/* Reservation Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Reservation Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Guest Name</Label>
                <p className="font-medium">{reservation?.customer_name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Room</Label>
                <p className="font-medium">{room?.name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Check-in</Label>
                <p className="font-medium">{format(new Date(reservation?.start_time), "PPP")}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Check-out</Label>
                <p className="font-medium">{format(new Date(reservation?.end_time), "PPP")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Step 1: Guest Information */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Guest Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guest_name">Full Name *</Label>
                    <Input
                      id="guest_name"
                      value={guestData.guest_name}
                      onChange={(e) => handleGuestDataChange("guest_name", e.target.value)}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="guest_phone">Phone Number *</Label>
                    <Input
                      id="guest_phone"
                      value={guestData.guest_phone}
                      onChange={(e) => handleGuestDataChange("guest_phone", e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guest_email">Email</Label>
                    <Input
                      id="guest_email"
                      type="email"
                      value={guestData.guest_email}
                      onChange={(e) => handleGuestDataChange("guest_email", e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      value={guestData.nationality}
                      onChange={(e) => handleGuestDataChange("nationality", e.target.value)}
                      placeholder="Enter nationality"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="id_type">ID Type *</Label>
                    <Select
                      value={guestData.id_type}
                      onValueChange={(value) => handleGuestDataChange("id_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="drivers_license">Driver's License</SelectItem>
                        <SelectItem value="aadhar">Aadhar Card</SelectItem>
                        <SelectItem value="voter_id">Voter ID</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="id_number">ID Number *</Label>
                    <Input
                      id="id_number"
                      value={guestData.id_number}
                      onChange={(e) => handleGuestDataChange("id_number", e.target.value)}
                      placeholder="Enter ID number"
                    />
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !guestData.date_of_birth && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {guestData.date_of_birth ? (
                            format(guestData.date_of_birth, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={guestData.date_of_birth}
                          onSelect={(date) => handleGuestDataChange("date_of_birth", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Address & Emergency Contact */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Address Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        value={guestData.address.street}
                        onChange={(e) => handleAddressChange("street", e.target.value)}
                        placeholder="Enter street address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={guestData.address.city}
                        onChange={(e) => handleAddressChange("city", e.target.value)}
                        placeholder="Enter city"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={guestData.address.state}
                        onChange={(e) => handleAddressChange("state", e.target.value)}
                        placeholder="Enter state"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={guestData.address.country}
                        onChange={(e) => handleAddressChange("country", e.target.value)}
                        placeholder="Enter country"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={guestData.address.postal_code}
                        onChange={(e) => handleAddressChange("postal_code", e.target.value)}
                        placeholder="Enter postal code"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="emergency_name">Contact Name</Label>
                      <Input
                        id="emergency_name"
                        value={guestData.emergency_contact.name}
                        onChange={(e) => handleEmergencyContactChange("name", e.target.value)}
                        placeholder="Enter contact name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergency_phone">Contact Phone</Label>
                      <Input
                        id="emergency_phone"
                        value={guestData.emergency_contact.phone}
                        onChange={(e) => handleEmergencyContactChange("phone", e.target.value)}
                        placeholder="Enter contact phone"
                      />
                    </div>
                    <div>
                      <Label htmlFor="relationship">Relationship</Label>
                      <Input
                        id="relationship"
                        value={guestData.emergency_contact.relationship}
                        onChange={(e) => handleEmergencyContactChange("relationship", e.target.value)}
                        placeholder="e.g., Spouse, Parent"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Check-in Details */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Check-in Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="total_guests">Total Guests</Label>
                    <Input
                      id="total_guests"
                      type="number"
                      min="1"
                      value={checkInDetails.total_guests}
                      onChange={(e) => setCheckInDetails(prev => ({ 
                        ...prev, 
                        total_guests: parseInt(e.target.value) || 1 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="key_cards">Key Cards</Label>
                    <Input
                      id="key_cards"
                      type="number"
                      min="1"
                      value={checkInDetails.key_cards_issued}
                      onChange={(e) => setCheckInDetails(prev => ({ 
                        ...prev, 
                        key_cards_issued: parseInt(e.target.value) || 1 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="security_deposit">Security Deposit (₹)</Label>
                    <Input
                      id="security_deposit"
                      type="number"
                      min="0"
                      value={checkInDetails.security_deposit}
                      onChange={(e) => setCheckInDetails(prev => ({ 
                        ...prev, 
                        security_deposit: parseFloat(e.target.value) || 0 
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="room_rate">Room Rate per Night (₹)</Label>
                  <Input
                    id="room_rate"
                    type="number"
                    min="0"
                    value={checkInDetails.room_rate}
                    onChange={(e) => setCheckInDetails(prev => ({ 
                      ...prev, 
                      room_rate: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="special_requests">Special Requests</Label>
                  <Textarea
                    id="special_requests"
                    value={checkInDetails.special_requests}
                    onChange={(e) => setCheckInDetails(prev => ({ 
                      ...prev, 
                      special_requests: e.target.value 
                    }))}
                    placeholder="Any special requests or notes..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {currentStep < 3 ? (
                <Button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={currentStep === 1 && !isStep1Valid}
                >
                  Next
                </Button>
              ) : (
                <Button onClick={handleCheckIn} className="bg-green-600 hover:bg-green-700">
                  <Key className="w-4 h-4 mr-2" />
                  Complete Check-In
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestCheckInDialog;
