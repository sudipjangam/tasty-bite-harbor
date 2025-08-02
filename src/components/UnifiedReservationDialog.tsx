import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Phone, Mail, Users, Calendar, Clock, MessageSquare, Sparkles, Building, Car } from 'lucide-react';
import { useTables } from '@/hooks/useTables';
import { useRooms } from '@/hooks/useRooms';

interface UnifiedReservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  type: 'table' | 'room';
}

const UnifiedReservationDialog: React.FC<UnifiedReservationDialogProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  type,
}) => {
  const { tables } = useTables();
  const { rooms } = useRooms();
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 1,
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: '19:00',
    duration_minutes: 120,
    special_requests: '',
    table_id: '',
    room_id: '',
    end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // tomorrow
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Customer name is required';
    }

    if (!formData.customer_phone) {
      newErrors.customer_phone = 'Phone number is required';
    } else {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(formData.customer_phone.replace(/\D/g, ''))) {
        newErrors.customer_phone = 'Phone number must be exactly 10 digits';
      }
    }

    if (formData.customer_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.customer_email)) {
        newErrors.customer_email = 'Please enter a valid email address';
      }
    }

    if (type === 'table' && !formData.table_id) {
      newErrors.table_id = 'Please select a table';
    }

    if (type === 'room' && !formData.room_id) {
      newErrors.room_id = 'Please select a room';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        party_size: 1,
        reservation_date: new Date().toISOString().split('T')[0],
        reservation_time: '19:00',
        duration_minutes: 120,
        special_requests: '',
        table_id: '',
        room_id: '',
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      setErrors({});
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting reservation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setFormData({ ...formData, customer_phone: value });
      if (errors.customer_phone) {
        setErrors({ ...errors, customer_phone: '' });
      }
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const availableItems = type === 'table' ? tables : rooms;
  const itemIcon = type === 'table' ? Car : Building;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl">
        <DialogHeader className="pb-4 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Make {type === 'table' ? 'Table' : 'Room'} Reservation
              </DialogTitle>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-blue-500" />
                Select {type} and fill details
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Selection Section */}
          <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 rounded-xl p-4 border border-green-100/50">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              {React.createElement(itemIcon, { className: "h-4 w-4 text-green-600" })}
              Select {type === 'table' ? 'Table' : 'Room'}
            </h3>
            
            <div>
              <Label htmlFor={`${type}_id`} className="text-xs font-medium text-gray-700">
                {type === 'table' ? 'Table' : 'Room'} *
              </Label>
              <Select
                value={type === 'table' ? formData.table_id : formData.room_id}
                onValueChange={(value) => {
                  if (type === 'table') {
                    setFormData({ ...formData, table_id: value });
                  } else {
                    setFormData({ ...formData, room_id: value });
                  }
                  if (errors[`${type}_id`]) {
                    setErrors({ ...errors, [`${type}_id`]: '' });
                  }
                }}
              >
                <SelectTrigger className={`mt-1 h-10 bg-white/80 backdrop-blur-sm border ${errors[`${type}_id`] ? 'border-red-500' : 'border-gray-200'} focus:border-green-500 rounded-lg transition-all duration-200`}>
                  <SelectValue placeholder={`Select ${type}`} />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-xl rounded-xl">
                  {availableItems?.map((item) => (
                    <SelectItem 
                      key={item.id} 
                      value={item.id}
                      className="hover:bg-green-50 rounded-lg"
                    >
                      {item.name} {type === 'table' && `(Capacity: ${item.capacity})`} {type === 'room' && `(₹${item.price}/night)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors[`${type}_id`] && (
                <p className="text-xs text-red-500 mt-1">{errors[`${type}_id`]}</p>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl p-4 border border-blue-100/50">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Customer Information
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="customer_name" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Customer Name *
                </Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => {
                    setFormData({ ...formData, customer_name: e.target.value });
                    if (errors.customer_name) {
                      setErrors({ ...errors, customer_name: '' });
                    }
                  }}
                  required
                  className={`mt-1 h-10 bg-white/80 backdrop-blur-sm border ${errors.customer_name ? 'border-red-500' : 'border-gray-200'} focus:border-blue-500 rounded-lg transition-all duration-200`}
                  placeholder="Enter customer name"
                />
                {errors.customer_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.customer_name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="customer_phone" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone *
                  </Label>
                  <Input
                    id="customer_phone"
                    type="tel"
                    value={formData.customer_phone}
                    onChange={handlePhoneChange}
                    className={`mt-1 h-10 bg-white/80 backdrop-blur-sm border ${errors.customer_phone ? 'border-red-500' : 'border-gray-200'} focus:border-blue-500 rounded-lg transition-all duration-200`}
                    placeholder="10-digit phone number"
                    maxLength={10}
                  />
                  {errors.customer_phone && (
                    <p className="text-xs text-red-500 mt-1">{errors.customer_phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="customer_email" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => {
                      setFormData({ ...formData, customer_email: e.target.value });
                      if (errors.customer_email) {
                        setErrors({ ...errors, customer_email: '' });
                      }
                    }}
                    className={`mt-1 h-10 bg-white/80 backdrop-blur-sm border ${errors.customer_email ? 'border-red-500' : 'border-gray-200'} focus:border-blue-500 rounded-lg transition-all duration-200`}
                    placeholder="Email address"
                  />
                  {errors.customer_email && (
                    <p className="text-xs text-red-500 mt-1">{errors.customer_email}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reservation Details */}
          <div className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-xl p-4 border border-purple-100/50">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              {type === 'table' ? 'Reservation' : 'Stay'} Details
            </h3>
            
            <div className="space-y-3">
              {type === 'table' && (
                <div>
                  <Label htmlFor="party_size" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Party Size *
                  </Label>
                  <Select
                    value={formData.party_size.toString()}
                    onValueChange={(value) => setFormData({ ...formData, party_size: parseInt(value) })}
                  >
                    <SelectTrigger className="mt-1 h-10 bg-white/80 backdrop-blur-sm border border-gray-200 focus:border-purple-500 rounded-lg transition-all duration-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-xl rounded-xl">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((size) => (
                        <SelectItem 
                          key={size} 
                          value={size.toString()}
                          className="hover:bg-purple-50 rounded-lg"
                        >
                          {size} {size === 1 ? 'Person' : 'People'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="reservation_date" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {type === 'table' ? 'Date' : 'Check-in Date'} *
                  </Label>
                  <Input
                    id="reservation_date"
                    type="date"
                    value={formData.reservation_date}
                    onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="mt-1 h-10 bg-white/80 backdrop-blur-sm border border-gray-200 focus:border-purple-500 rounded-lg transition-all duration-200"
                  />
                </div>

                {type === 'table' ? (
                  <div>
                    <Label htmlFor="reservation_time" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Time *
                    </Label>
                    <Select
                      value={formData.reservation_time}
                      onValueChange={(value) => setFormData({ ...formData, reservation_time: value })}
                    >
                      <SelectTrigger className="mt-1 h-10 bg-white/80 backdrop-blur-sm border border-gray-200 focus:border-purple-500 rounded-lg transition-all duration-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-xl rounded-xl max-h-40">
                        {generateTimeSlots().map((time) => (
                          <SelectItem 
                            key={time} 
                            value={time}
                            className="hover:bg-purple-50 rounded-lg"
                          >
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="end_date" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Check-out Date *
                    </Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      min={formData.reservation_date}
                      required
                      className="mt-1 h-10 bg-white/80 backdrop-blur-sm border border-gray-200 focus:border-purple-500 rounded-lg transition-all duration-200"
                    />
                  </div>
                )}
              </div>

              {type === 'table' && (
                <div>
                  <Label htmlFor="duration_minutes" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Duration
                  </Label>
                  <Select
                    value={formData.duration_minutes.toString()}
                    onValueChange={(value) => setFormData({ ...formData, duration_minutes: parseInt(value) })}
                  >
                    <SelectTrigger className="mt-1 h-10 bg-white/80 backdrop-blur-sm border border-gray-200 focus:border-purple-500 rounded-lg transition-all duration-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-xl rounded-xl">
                      <SelectItem value="60" className="hover:bg-purple-50 rounded-lg">1 Hour</SelectItem>
                      <SelectItem value="90" className="hover:bg-purple-50 rounded-lg">1.5 Hours</SelectItem>
                      <SelectItem value="120" className="hover:bg-purple-50 rounded-lg">2 Hours</SelectItem>
                      <SelectItem value="150" className="hover:bg-purple-50 rounded-lg">2.5 Hours</SelectItem>
                      <SelectItem value="180" className="hover:bg-purple-50 rounded-lg">3 Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Special Requests */}
          <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 rounded-xl p-4 border border-green-100/50">
            <Label htmlFor="special_requests" className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-2">
              <MessageSquare className="h-3 w-3" />
              Special Requests
            </Label>
            <Textarea
              id="special_requests"
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              rows={2}
              className="bg-white/80 backdrop-blur-sm border border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200 resize-none"
              placeholder="Any special requests or notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/20 bg-white/50 backdrop-blur-sm rounded-xl p-3 -mx-4 -mb-4 sticky bottom-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border border-gray-300 hover:border-gray-400 bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-gray-50 rounded-lg py-2 font-medium transition-all duration-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-2 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? 'Creating...' : `Create ${type === 'table' ? 'Table' : 'Room'} Reservation`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedReservationDialog;