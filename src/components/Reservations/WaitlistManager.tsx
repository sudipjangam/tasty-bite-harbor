import { useState } from 'react';
import { useWaitlist } from '@/hooks/useWaitlist';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Users, Phone, Mail, Plus, CheckCircle, XCircle } from 'lucide-react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

export const WaitlistManager = () => {
  const { waitlist, isLoading, addToWaitlist, updateWaitlistStatus, deleteFromWaitlist, restaurantId } = useWaitlist();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 2,
    priority: 0,
    estimated_wait_time: 30,
    notes: '',
  });

  // Real-time subscription
  useRealtimeSubscription({
    table: 'waitlist',
    queryKey: ['waitlist', restaurantId],
    filter: restaurantId ? { column: 'restaurant_id', value: restaurantId } : null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addToWaitlist.mutateAsync({
      ...formData,
      status: 'waiting',
    });
    setIsDialogOpen(false);
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      party_size: 2,
      priority: 0,
      estimated_wait_time: 30,
      notes: '',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500';
      case 'seated': return 'bg-green-500';
      case 'cancelled': return 'bg-gray-500';
      case 'no_show': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const waitingCount = waitlist.filter(w => w.status === 'waiting').length;

  if (isLoading) return <div>Loading waitlist...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Waitlist Management</h2>
          <p className="text-muted-foreground">
            {waitingCount} {waitingCount === 1 ? 'party' : 'parties'} waiting
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add to Waitlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Party to Waitlist</DialogTitle>
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
                <Label htmlFor="customer_phone">Phone</Label>
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
                <Input
                  id="party_size"
                  type="number"
                  min="1"
                  value={formData.party_size}
                  onChange={(e) => setFormData({ ...formData, party_size: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority.toString()}
                  onValueChange={(value) => setFormData({ ...formData, priority: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Normal</SelectItem>
                    <SelectItem value="1">High</SelectItem>
                    <SelectItem value="2">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estimated_wait_time">Estimated Wait (minutes)</Label>
                <Input
                  id="estimated_wait_time"
                  type="number"
                  min="0"
                  value={formData.estimated_wait_time}
                  onChange={(e) => setFormData({ ...formData, estimated_wait_time: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Add to Waitlist</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {waitlist.filter(w => w.status === 'waiting').map((entry) => (
          <Card key={entry.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{entry.customer_name}</h3>
                    <Badge className={getStatusColor(entry.status)}>
                      {entry.status}
                    </Badge>
                    {entry.priority > 0 && (
                      <Badge variant="outline">
                        {entry.priority === 2 ? 'VIP' : 'High Priority'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {entry.party_size} {entry.party_size === 1 ? 'guest' : 'guests'}
                    </div>
                    {entry.estimated_wait_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        ~{entry.estimated_wait_time} min wait
                      </div>
                    )}
                    {entry.customer_phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {entry.customer_phone}
                      </div>
                    )}
                    {entry.customer_email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {entry.customer_email}
                      </div>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground">Note: {entry.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Checked in: {new Date(entry.check_in_time).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateWaitlistStatus.mutate({ id: entry.id, status: 'seated' })}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Seat
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateWaitlistStatus.mutate({ id: entry.id, status: 'cancelled' })}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {waitingCount === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No parties currently waiting
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
