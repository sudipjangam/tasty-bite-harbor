
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { Settings, Wifi, Database, Calendar, Bell, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ChannelIntegrationManager = () => {
  const { bookingChannels, updateChannel, ratePlans, isLoadingChannels } = useChannelManagement();
  const [activeTab, setActiveTab] = useState("connections");
  const [integrationSettings, setIntegrationSettings] = useState({
    autoSync: true,
    syncInterval: 15,
    priceStrategy: "competitive",
    inventoryBuffer: 2
  });

  const handleAPIConnection = (channelId: string, apiSettings: any) => {
    updateChannel.mutate({
      channelId,
      updates: {
        api_endpoint: apiSettings.endpoint,
        api_key: apiSettings.key,
        api_secret: apiSettings.secret,
        channel_settings: {
          ...apiSettings,
          connected: true,
          connectionTime: new Date().toISOString()
        }
      }
    });
  };

  const getConnectionStatus = (channel: any) => {
    const isConnected = channel.api_key && channel.api_secret;
    const lastSync = channel.last_sync ? new Date(channel.last_sync) : null;
    const isRecentSync = lastSync && (Date.now() - lastSync.getTime()) < 3600000; // 1 hour

    if (isConnected && isRecentSync) return "connected";
    if (isConnected && !isRecentSync) return "warning";
    return "disconnected";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning": return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  if (isLoadingChannels) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="rates" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Rate Sync
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Availability
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Automation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OTA Channel Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {bookingChannels.filter(channel => channel.channel_type === 'ota').map((channel) => (
                  <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(getConnectionStatus(channel))}
                      <div>
                        <h3 className="font-semibold">{channel.channel_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {channel.commission_rate}% commission
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getConnectionStatus(channel) === 'connected' ? 'default' : 'destructive'}>
                        {getConnectionStatus(channel)}
                      </Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4 mr-1" />
                            Configure
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Configure {channel.channel_name}</DialogTitle>
                          </DialogHeader>
                          <APIConnectionForm 
                            channel={channel} 
                            onSave={(settings) => handleAPIConnection(channel.id, settings)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Synchronization</CardTitle>
            </CardHeader>
            <CardContent>
              <RateSyncManager ratePlans={ratePlans} channels={bookingChannels} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Availability Management</CardTitle>
            </CardHeader>
            <CardContent>
              <AvailabilityManager channels={bookingChannels} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <AutomationSettings 
                settings={integrationSettings}
                onUpdate={setIntegrationSettings}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const APIConnectionForm = ({ channel, onSave }: { channel: any; onSave: (settings: any) => void }) => {
  const [settings, setSettings] = useState({
    endpoint: channel.api_endpoint || "",
    key: channel.api_key || "",
    secret: channel.api_secret || "",
    testConnection: false
  });

  const handleSave = () => {
    onSave(settings);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="endpoint">API Endpoint</Label>
        <Input
          id="endpoint"
          value={settings.endpoint}
          onChange={(e) => setSettings({ ...settings, endpoint: e.target.value })}
          placeholder="https://api.booking.com/v1/"
        />
      </div>
      <div>
        <Label htmlFor="api-key">API Key</Label>
        <Input
          id="api-key"
          value={settings.key}
          onChange={(e) => setSettings({ ...settings, key: e.target.value })}
          placeholder="Enter your API key"
        />
      </div>
      <div>
        <Label htmlFor="api-secret">API Secret</Label>
        <Input
          id="api-secret"
          type="password"
          value={settings.secret}
          onChange={(e) => setSettings({ ...settings, secret: e.target.value })}
          placeholder="Enter your API secret"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={settings.testConnection}
          onCheckedChange={(checked) => setSettings({ ...settings, testConnection: checked })}
        />
        <Label>Test connection after saving</Label>
      </div>
      <Button onClick={handleSave} className="w-full">
        Save Configuration
      </Button>
    </div>
  );
};

const RateSyncManager = ({ ratePlans, channels }: { ratePlans: any[]; channels: any[] }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Sync Strategy</Label>
          <Select defaultValue="competitive">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="competitive">Competitive Pricing</SelectItem>
              <SelectItem value="fixed">Fixed Rates</SelectItem>
              <SelectItem value="dynamic">Dynamic Pricing</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Update Frequency</Label>
          <Select defaultValue="15">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Every 5 minutes</SelectItem>
              <SelectItem value="15">Every 15 minutes</SelectItem>
              <SelectItem value="60">Every hour</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-2">Rate Plan Distribution</h4>
        {ratePlans.map((plan) => (
          <div key={plan.id} className="flex justify-between items-center py-2">
            <span>{plan.name}</span>
            <span className="font-mono">₹{plan.base_rate}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AvailabilityManager = ({ channels }: { channels: any[] }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">85%</div>
          <div className="text-sm text-muted-foreground">Avg Occupancy</div>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">12</div>
          <div className="text-sm text-muted-foreground">Rooms Available</div>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">3</div>
          <div className="text-sm text-muted-foreground">Pending Sync</div>
        </div>
      </div>
      <div>
        <Label>Inventory Buffer</Label>
        <Input type="number" defaultValue="2" className="w-full" />
        <p className="text-sm text-muted-foreground mt-1">
          Keep this many rooms as buffer to prevent overbooking
        </p>
      </div>
    </div>
  );
};

const AutomationSettings = ({ settings, onUpdate }: { settings: any; onUpdate: (settings: any) => void }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Auto-sync rates and availability</Label>
          <p className="text-sm text-muted-foreground">Automatically sync changes across all channels</p>
        </div>
        <Switch
          checked={settings.autoSync}
          onCheckedChange={(checked) => onUpdate({ ...settings, autoSync: checked })}
        />
      </div>
      <div>
        <Label>Sync Interval (minutes)</Label>
        <Input
          type="number"
          value={settings.syncInterval}
          onChange={(e) => onUpdate({ ...settings, syncInterval: parseInt(e.target.value) })}
        />
      </div>
      <div>
        <Label>Price Strategy</Label>
        <Select
          value={settings.priceStrategy}
          onValueChange={(value) => onUpdate({ ...settings, priceStrategy: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="competitive">Competitive</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="budget">Budget</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ChannelIntegrationManager;
