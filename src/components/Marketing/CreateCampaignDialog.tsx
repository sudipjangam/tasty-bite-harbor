
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StandardizedButton } from '@/components/ui/standardized-button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateCampaignDialog: React.FC<CreateCampaignDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'promotional',
    discount_type: 'percentage',
    discount_percentage: 0,
    discount_amount: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    target_audience: 'all_customers',
    promotion_code: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('promotion_campaigns')
        .insert([{
          ...formData,
          restaurant_id: restaurantId,
          status: 'scheduled',
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Campaign created successfully',
      });

      setFormData({
        name: '',
        description: '',
        campaign_type: 'promotional',
        discount_type: 'percentage',
        discount_percentage: 0,
        discount_amount: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        target_audience: 'all_customers',
        promotion_code: '',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to create campaign',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Marketing Campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="campaign_type">Campaign Type</Label>
              <Select
                value={formData.campaign_type}
                onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="loyalty">Loyalty</SelectItem>
                  <SelectItem value="anniversary">Anniversary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="discount_type">Discount Type</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.discount_type === 'percentage' ? (
              <div>
                <Label htmlFor="discount_percentage">Discount %</Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) })}
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="discount_amount">Discount Amount (₹)</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  min="0"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({ ...formData, discount_amount: parseInt(e.target.value) })}
                />
              </div>
            )}
            <div>
              <Label htmlFor="promotion_code">Promo Code</Label>
              <Input
                id="promotion_code"
                value={formData.promotion_code}
                onChange={(e) => setFormData({ ...formData, promotion_code: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="target_audience">Target Audience</Label>
            <Select
              value={formData.target_audience}
              onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_customers">All Customers</SelectItem>
                <SelectItem value="loyal_customers">Loyal Customers</SelectItem>
                <SelectItem value="new_customers">New Customers</SelectItem>
                <SelectItem value="special_occasions">Special Occasions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <StandardizedButton
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </StandardizedButton>
            <StandardizedButton
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Campaign'}
            </StandardizedButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignDialog;
