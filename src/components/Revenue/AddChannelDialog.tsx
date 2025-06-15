
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { useToast } from "@/hooks/use-toast";

interface AddChannelDialogProps {
  onChannelAdded?: () => void;
}

const AddChannelDialog = ({ onChannelAdded }: AddChannelDialogProps) => {
  const [open, setOpen] = useState(false);
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

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.channel_name || !formData.channel_type) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    try {
      // Here you would call your API to create the channel
      // For now, we'll simulate success
      toast({
        title: "Success",
        description: `Channel "${formData.channel_name}" added successfully`,
      });
      
      setOpen(false);
      setFormData({
        channel_name: "",
        channel_type: "",
        api_endpoint: "",
        api_key: "",
        api_secret: "",
        commission_rate: 0,
        is_active: true,
        sync_frequency_minutes: 60,
      });
      
      if (onChannelAdded) {
        onChannelAdded();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add channel",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          Add New Channel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-background border-border shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add New Booking Channel
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="channel_name" className="text-sm font-medium text-foreground">
              Channel Name *
            </Label>
            <Input
              id="channel_name"
              placeholder="e.g., EaseMyTrip.com"
              value={formData.channel_name}
              onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
              className="standardized-input"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel_type" className="text-sm font-medium text-foreground">
              Channel Type *
            </Label>
            <Select value={formData.channel_type} onValueChange={(value) => setFormData({ ...formData, channel_type: value })}>
              <SelectTrigger className="standardized-input">
                <SelectValue placeholder="Select channel type" />
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
            <Label htmlFor="commission_rate" className="text-sm font-medium text-foreground">
              Commission Rate (%)
            </Label>
            <Input
              id="commission_rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="e.g., 15.5"
              value={formData.commission_rate}
              onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
              className="standardized-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_endpoint" className="text-sm font-medium text-foreground">
              API Endpoint (Optional)
            </Label>
            <Input
              id="api_endpoint"
              placeholder="https://api.easemytrip.com/v1/"
              value={formData.api_endpoint}
              onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
              className="standardized-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="api_key" className="text-sm font-medium text-foreground">
                API Key (Optional)
              </Label>
              <Input
                id="api_key"
                type="password"
                placeholder="Enter API key"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className="standardized-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_secret" className="text-sm font-medium text-foreground">
                API Secret (Optional)
              </Label>
              <Input
                id="api_secret"
                type="password"
                placeholder="Enter API secret"
                value={formData.api_secret}
                onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                className="standardized-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sync_frequency" className="text-sm font-medium text-foreground">
              Sync Frequency (minutes)
            </Label>
            <Input
              id="sync_frequency"
              type="number"
              min="5"
              placeholder="60"
              value={formData.sync_frequency_minutes}
              onChange={(e) => setFormData({ ...formData, sync_frequency_minutes: parseInt(e.target.value) || 60 })}
              className="standardized-input"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active" className="text-sm font-medium text-foreground">
              Active Channel
            </Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white"
            >
              Add Channel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddChannelDialog;
