
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
import { TableData } from './TableCard';
import { ReservationFormData } from '@/types/reservations';

interface ReservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  table: TableData | null;
  onSubmit: (data: ReservationFormData) => Promise<void>;
}

const ReservationDialog: React.FC<ReservationDialogProps> = ({
  isOpen,
  onOpenChange,
  table,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<ReservationFormData>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 1,
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: '19:00',
    duration_minutes: 120,
    special_requests: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!table) return;

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
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting reservation:', error);
    } finally {
      setIsSubmitting(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Make Reservation - {table?.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="customer_name">Customer Name *</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="customer_phone">Phone Number</Label>
            <Input
              id="customer_phone"
              type="tel"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="customer_email">Email</Label>
            <Input
              id="customer_email"
              type="email"
              value={formData.customer_email}
              onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="party_size">Party Size *</Label>
            <Select
              value={formData.party_size.toString()}
              onValueChange={(value) => setFormData({ ...formData, party_size: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: table?.capacity || 8 }, (_, i) => i + 1).map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} {size === 1 ? 'Person' : 'People'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reservation_date">Date *</Label>
            <Input
              id="reservation_date"
              type="date"
              value={formData.reservation_date}
              onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <Label htmlFor="reservation_time">Time *</Label>
            <Select
              value={formData.reservation_time}
              onValueChange={(value) => setFormData({ ...formData, reservation_time: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generateTimeSlots().map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="duration_minutes">Duration (minutes)</Label>
            <Select
              value={formData.duration_minutes.toString()}
              onValueChange={(value) => setFormData({ ...formData, duration_minutes: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1 Hour</SelectItem>
                <SelectItem value="90">1.5 Hours</SelectItem>
                <SelectItem value="120">2 Hours</SelectItem>
                <SelectItem value="150">2.5 Hours</SelectItem>
                <SelectItem value="180">3 Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="special_requests">Special Requests</Label>
            <Textarea
              id="special_requests"
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Reservation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationDialog;
