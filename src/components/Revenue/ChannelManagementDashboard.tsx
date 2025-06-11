
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { Settings, Sync, TrendingUp, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ChannelManagementDashboard = () => {
  const { bookingChannels, updateChannel, isLoadingChannels } = useChannelManagement();
  const [selectedChannel, setSelectedChannel] = useState<any>(null);

  const handleChannelToggle = (channelId: string, isActive: boolean) => {
    updateChannel.mutate({
      channelId,
      updates: { is_active: isActive }
    });
  };

  const handleSyncChannel = (channelId: string) => {
    updateChannel.mutate({
      channelId,
      updates: { last_sync: new Date().toISOString() }
    });
  };

  const getChannelTypeColor = (type: string) => {
    switch (type) {
      case 'direct': return 'bg-green-100 text-green-800';
      case 'ota': return 'bg-blue-100 text-blue-800';
      case 'gds': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoadingChannels) {
    return <div>Loading channels...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Channel Management</h2>
        <Button>
          <Sync className="w-4 h-4 mr-2" />
          Sync All Channels
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookingChannels.map((channel) => (
          <Card key={channel.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">
                {channel.channel_name}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={channel.is_active}
                  onCheckedChange={(checked) => handleChannelToggle(channel.id, checked)}
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Channel Settings - {channel.channel_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="commission">Commission Rate (%)</Label>
                        <Input
                          id="commission"
                          type="number"
                          value={channel.commission_rate}
                          onChange={(e) => {
                            updateChannel.mutate({
                              channelId: channel.id,
                              updates: { commission_rate: parseFloat(e.target.value) }
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="sync-frequency">Sync Frequency (minutes)</Label>
                        <Input
                          id="sync-frequency"
                          type="number"
                          value={channel.sync_frequency_minutes}
                          onChange={(e) => {
                            updateChannel.mutate({
                              channelId: channel.id,
                              updates: { sync_frequency_minutes: parseInt(e.target.value) }
                            });
                          }}
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Badge className={getChannelTypeColor(channel.channel_type)}>
                    {channel.channel_type.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {channel.commission_rate}% commission
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span>Last Sync:</span>
                  <span className={!channel.last_sync ? 'text-red-500' : 'text-gray-600'}>
                    {channel.last_sync 
                      ? new Date(channel.last_sync).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleSyncChannel(channel.id)}
                  disabled={!channel.is_active}
                >
                  <Sync className="w-4 h-4 mr-2" />
                  Sync Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channel Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Channel Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {bookingChannels.filter(c => c.is_active).length}
              </div>
              <div className="text-sm text-gray-500">Active Channels</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {bookingChannels.filter(c => c.channel_type === 'ota').length}
              </div>
              <div className="text-sm text-gray-500">OTA Channels</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(bookingChannels.reduce((sum, c) => sum + c.commission_rate, 0) / bookingChannels.length).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Avg Commission</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {bookingChannels.filter(c => !c.last_sync).length}
              </div>
              <div className="text-sm text-gray-500">Need Sync</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChannelManagementDashboard;
