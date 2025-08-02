import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { useRooms } from "@/hooks/useRooms";
import { 
  Settings, 
  RotateCcw, 
  Clock, 
  TrendingUp, 
  Wifi, 
  Calendar,
  RefreshCw,
  BarChart3,
  Shield
} from "lucide-react";

interface AdvancedIntegrationProps {
  channels: any[];
}

interface RatePlan {
  id: string;
  name: string;
  basePrice: number;
  description: string;
}

const AdvancedIntegration = ({ channels }: AdvancedIntegrationProps) => {
  const { syncChannels } = useChannelManagement();
  const { rooms = [] } = useRooms();

  const [syncStrategy, setSyncStrategy] = useState<string>('competitive');
  const [updateFrequency, setUpdateFrequency] = useState<string>('15');
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Default rate plans based on the image
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([
    { id: '1', name: 'Standard Rate', basePrice: 3000, description: 'Regular pricing for standard bookings' },
    { id: '2', name: 'Early Bird', basePrice: 2550, description: 'Discounted rate for advance bookings' },
    { id: '3', name: 'Last Minute', basePrice: 2400, description: 'Reduced rate for last-minute deals' },
    { id: '4', name: 'Group Rate', basePrice: 2500, description: 'Special pricing for group bookings' },
    { id: '5', name: 'Corporate Rate', basePrice: 2700, description: 'Business traveler rates' },
  ]);

  const syncStrategies = [
    { value: 'competitive', label: 'Competitive Pricing', description: 'Match competitor rates automatically' },
    { value: 'demand', label: 'Demand-Based', description: 'Adjust based on booking demand' },
    { value: 'seasonal', label: 'Seasonal Pricing', description: 'Seasonal rate adjustments' },
    { value: 'manual', label: 'Manual Override', description: 'Full manual control' },
  ];

  const updateFrequencies = [
    { value: '5', label: 'Every 5 minutes' },
    { value: '15', label: 'Every 15 minutes' },
    { value: '30', label: 'Every 30 minutes' },
    { value: '60', label: 'Every hour' },
    { value: '360', label: 'Every 6 hours' },
  ];

  const handleManualSync = async () => {
    try {
      await syncChannels.mutateAsync({});
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const updateRatePlanPrice = (id: string, newPrice: number) => {
    setRatePlans(prev => 
      prev.map(plan => 
        plan.id === id ? { ...plan, basePrice: newPrice } : plan
      )
    );
  };

  useEffect(() => {
    // Set initial last sync time
    setLastSyncTime(new Date());
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Advanced Integration & Rate Synchronization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rate-sync" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="rate-sync">Rate Sync</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
            </TabsList>

            <TabsContent value="rate-sync" className="space-y-6 mt-6">
              {/* Rate Synchronization Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Rate Synchronization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-base font-semibold">Sync Strategy</Label>
                      <Select value={syncStrategy} onValueChange={setSyncStrategy}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {syncStrategies.map((strategy) => (
                            <SelectItem key={strategy.value} value={strategy.value}>
                              <div>
                                <div className="font-medium">{strategy.label}</div>
                                <div className="text-sm text-muted-foreground">{strategy.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-base font-semibold">Update Frequency</Label>
                      <Select value={updateFrequency} onValueChange={setUpdateFrequency}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {updateFrequencies.map((freq) => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium">Last Sync</div>
                        <div className="text-sm text-muted-foreground">
                          {lastSyncTime ? lastSyncTime.toLocaleString() : 'Never'}
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={handleManualSync}
                      disabled={syncChannels.isPending}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncChannels.isPending ? 'animate-spin' : ''}`} />
                      {syncChannels.isPending ? 'Syncing...' : 'Sync Now'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Rate Plan Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Rate Plan Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ratePlans.map((plan) => (
                      <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium">{plan.name}</div>
                          <div className="text-sm text-muted-foreground">{plan.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-lg">₹{plan.basePrice.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Base Rate</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="availability" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Availability Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map((room) => (
                      <Card key={room.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{room.name}</h4>
                          <Badge variant={room.status === 'available' ? 'default' : 'secondary'}>
                            {room.status}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Capacity:</span>
                            <span>{room.capacity} guests</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rate:</span>
                            <span className="font-mono">₹{room.price?.toLocaleString() || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Synced Channels:</span>
                            <span>{channels.filter(c => c.is_active).length}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automation" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Automation Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border border-dashed border-muted-foreground/30 rounded-lg text-center">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <h4 className="font-medium">Smart Pricing Rules</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure automatic pricing adjustments based on occupancy, demand, and competitor analysis
                    </p>
                    <Button variant="outline" className="mt-3">
                      Configure Rules
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="connections" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Channel Connections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {channels.map((channel) => (
                      <Card key={channel.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{channel.channel_name}</h4>
                          <Badge variant={channel.is_active ? 'default' : 'destructive'}>
                            {channel.is_active ? 'Connected' : 'Disconnected'}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="uppercase">{channel.channel_type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Commission:</span>
                            <span>{channel.commission_rate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Sync:</span>
                            <span>{channel.last_sync ? new Date(channel.last_sync).toLocaleDateString() : 'Never'}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedIntegration;