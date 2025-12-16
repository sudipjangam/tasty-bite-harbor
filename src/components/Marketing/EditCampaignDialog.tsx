
import React, { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EditCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: any | null;
  onSaved?: () => void;
}

const EditCampaignDialog: React.FC<EditCampaignDialogProps> = ({ open, onOpenChange, campaign, onSaved }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_percentage: 0,
    discount_amount: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    promotion_code: '',
    status: 'active',
    is_active: true,
  });

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        discount_type: campaign.discount_percentage ? 'percentage' : 'fixed',
        discount_percentage: campaign.discount_percentage || 0,
        discount_amount: campaign.discount_amount || 0,
        start_date: (campaign.start_date || '').slice(0, 10),
        end_date: (campaign.end_date || '').slice(0, 10),
        promotion_code: campaign.promotion_code || '',
        status: campaign.status || 'active',
        is_active: !!campaign.is_active,
      });
    }
  }, [campaign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('promotion_campaigns')
        .update({
          name: formData.name,
          description: formData.description,
          discount_percentage: formData.discount_type === 'percentage' ? formData.discount_percentage : 0,
          discount_amount: formData.discount_type === 'fixed' ? formData.discount_amount : 0,
          start_date: formData.start_date,
          end_date: formData.end_date,
          promotion_code: formData.promotion_code || null,
          status: formData.status as any,
          is_active: formData.is_active,
        })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({ title: 'Updated', description: 'Campaign updated successfully' });
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({ title: 'Error', description: 'Failed to update campaign', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value, is_active: value === 'active' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="discount_type">Discount Type</Label>
              <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value })}>
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
                <Input id="discount_percentage" type="number" min="0" max="100" value={formData.discount_percentage} onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value || '0', 10) })} />
              </div>
            ) : (
              <div>
                <Label htmlFor="discount_amount">Discount Amount (₹)</Label>
                <Input id="discount_amount" type="number" min="0" value={formData.discount_amount} onChange={(e) => setFormData({ ...formData, discount_amount: parseInt(e.target.value || '0', 10) })} />
              </div>
            )}
            <div>
              <Label htmlFor="promotion_code">Promo Code</Label>
              <Input id="promotion_code" value={formData.promotion_code} onChange={(e) => setFormData({ ...formData, promotion_code: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date *</Label>
              <Input id="start_date" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="end_date">End Date *</Label>
              <Input id="end_date" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} min={formData.start_date} required />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <StandardizedButton type="button" variant="secondary" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </StandardizedButton>
            <StandardizedButton type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </StandardizedButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCampaignDialog;
