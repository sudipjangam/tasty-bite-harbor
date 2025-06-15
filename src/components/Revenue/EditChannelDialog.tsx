
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Edit } from "lucide-react";
import { useChannelManagement, BookingChannel } from "@/hooks/useChannelManagement";

interface EditChannelDialogProps {
  channel: BookingChannel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditChannelDialog = ({ channel, open, onOpenChange }: EditChannelDialogProps) => {
  const { updateChannel } = useChannelManagement();
  const [formData, setFormData] = useState({
    channel_name: "",
    channel_type: "",
    api_endpoint: "",
    api_key: "",
    api_secret: "",
    commission_rate: 0,
    is_active: true,
    sync_frequency_minutes: 60,
  });

  useEffect(() => {
    if (channel) {
      setFormData({
        channel_name: channel.channel_name,
        channel_type: channel.channel_type,
        api_endpoint: channel.api_endpoint || "",
        api_key: channel.api_key || "",
        api_secret: channel.api_secret || "",
        commission_rate: channel.commission_rate,
        is_active: channel.is_active,
        sync_frequency_minutes: channel.sync_frequency_minutes,
      });
    }
  }, [channel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!channel) return;

    updateChannel.mutate({
      channelId: channel.id,
      updates: formData
    });
    
    onOpenChange(false);
  };

  if (!channel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            Edit Channel - {channel.channel_name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit_channel_name" className="text-sm font-medium text-foreground">
              Channel Name *
            </Label>
            <Input
              id="edit_channel_name"
              value={formData.channel_name}
              onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
              className="standardized-input"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_channel_type" className="text-sm font-medium text-foreground">
              Channel Type *
            </Label>
            <Select value={formData.channel_type} onValueChange={(value) => setFormData({ ...formData, channel_type: value })}>
              <SelectTrigger className="standardized-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="ota">OTA (Online Travel Agency)</SelectItem>
                <SelectItem value="direct">Direct Booking</SelectItem>
                <SelectItem value="gds">GDS (Global Distribution System)</SelectItem>
                <SelectItem value="metasearch">Metasearch</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_commission_rate" className="text-sm font-medium text-foreground">
              Commission Rate (%)
            </Label>
            <Input
              id="edit_commission_rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.commission_rate}
              onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
              className="standardized-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_api_endpoint" className="text-sm font-medium text-foreground">
              API Endpoint
            </Label>
            <Input
              id="edit_api_endpoint"
              value={formData.api_endpoint}
              onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
              className="standardized-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_api_key" className="text-sm font-medium text-foreground">
                API Key
              </Label>
              <Input
                id="edit_api_key"
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className="standardized-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_api_secret" className="text-sm font-medium text-foreground">
                API Secret
              </Label>
              <Input
                id="edit_api_secret"
                type="password"
                value={formData.api_secret}
                onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                className="standardized-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_sync_frequency" className="text-sm font-medium text-foreground">
              Sync Frequency (minutes)
            </Label>
            <Input
              id="edit_sync_frequency"
              type="number"
              min="5"
              value={formData.sync_frequency_minutes}
              onChange={(e) => setFormData({ ...formData, sync_frequency_minutes: parseInt(e.target.value) || 60 })}
              className="standardized-input"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="edit_is_active" className="text-sm font-medium text-foreground">
              Active Channel
            </Label>
            <Switch
              id="edit_is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white"
              disabled={updateChannel.isPending}
            >
              {updateChannel.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditChannelDialog;
