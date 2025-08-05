import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Globe, 
  TrendingUp, 
  Search, 
  Settings, 
  Star,
  Eye,
  MousePointer,
  RefreshCw,
  ExternalLink,
  AlertCircle
} from "lucide-react";

interface MetaSearchChannel {
  id: string;
  name: string;
  type: 'google_hotel_ads' | 'tripadvisor' | 'trivago' | 'kayak';
  status: 'connected' | 'pending' | 'error' | 'disconnected';
  isActive: boolean;
  metrics: {
    impressions: number;
    clicks: number;
    bookings: number;
    ctr: number;
    revenue: number;
  };
  settings: {
    bidStrategy: string;
    maxCpc: number;
    targetRoas: number;
  };
}

const MetaSearchIntegration = () => {
  const [channels, setChannels] = useState<MetaSearchChannel[]>([
    {
      id: '1',
      name: 'Google Hotel Ads',
      type: 'google_hotel_ads',
      status: 'connected',
      isActive: true,
      metrics: {
        impressions: 25400,
        clicks: 1270,
        bookings: 89,
        ctr: 5.0,
        revenue: 445000
      },
      settings: {
        bidStrategy: 'target_roas',
        maxCpc: 25,
        targetRoas: 400
      }
    },
    {
      id: '2',
      name: 'TripAdvisor',
      type: 'tripadvisor',
      status: 'connected',
      isActive: true,
      metrics: {
        impressions: 18200,
        clicks: 910,
        bookings: 45,
        ctr: 5.0,
        revenue: 225000
      },
      settings: {
        bidStrategy: 'maximize_clicks',
        maxCpc: 20,
        targetRoas: 350
      }
    },
    {
      id: '3',
      name: 'Trivago',
      type: 'trivago',
      status: 'pending',
      isActive: false,
      metrics: {
        impressions: 0,
        clicks: 0,
        bookings: 0,
        ctr: 0,
        revenue: 0
      },
      settings: {
        bidStrategy: 'manual_cpc',
        maxCpc: 15,
        targetRoas: 300
      }
    },
    {
      id: '4',
      name: 'Kayak',
      type: 'kayak',
      status: 'disconnected',
      isActive: false,
      metrics: {
        impressions: 0,
        clicks: 0,
        bookings: 0,
        ctr: 0,
        revenue: 0
      },
      settings: {
        bidStrategy: 'target_cpa',
        maxCpc: 18,
        targetRoas: 320
      }
    }
  ]);

  const [selectedChannel, setSelectedChannel] = useState<MetaSearchChannel | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'disconnected': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected': return <Badge className="bg-green-500 text-white">Connected</Badge>;
      case 'pending': return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case 'error': return <Badge className="bg-red-500 text-white">Error</Badge>;
      case 'disconnected': return <Badge variant="outline">Disconnected</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const toggleChannel = (channelId: string) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId ? { ...channel, isActive: !channel.isActive } : channel
    ));
  };

  const totalMetrics = channels.reduce((acc, channel) => ({
    impressions: acc.impressions + channel.metrics.impressions,
    clicks: acc.clicks + channel.metrics.clicks,
    bookings: acc.bookings + channel.metrics.bookings,
    revenue: acc.revenue + channel.metrics.revenue
  }), { impressions: 0, clicks: 0, bookings: 0, revenue: 0 });

  const avgCtr = totalMetrics.clicks > 0 ? (totalMetrics.clicks / totalMetrics.impressions * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Meta Search Distribution
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Connect your booking engine to Google/TripAdvisor. Manage multiple discounts, 
            attract travelers searching for hotels, and increase direct bookings.
          </p>
        </CardHeader>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{totalMetrics.impressions.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Impressions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MousePointer className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{totalMetrics.clicks.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Clicks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{avgCtr.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Avg CTR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">₹{(totalMetrics.revenue / 1000).toFixed(0)}K</div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels">Channel Status</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map((channel) => (
              <Card key={channel.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(channel.status)}`}></div>
                    {channel.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(channel.status)}
                    <Switch
                      checked={channel.isActive}
                      onCheckedChange={() => toggleChannel(channel.id)}
                      disabled={channel.status !== 'connected'}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {channel.status === 'connected' ? (
                      <>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Impressions</div>
                            <div className="font-bold">{channel.metrics.impressions.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Clicks</div>
                            <div className="font-bold">{channel.metrics.clicks.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Bookings</div>
                            <div className="font-bold">{channel.metrics.bookings}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">CTR</div>
                            <div className="font-bold">{channel.metrics.ctr}%</div>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="text-sm text-muted-foreground">Revenue (Last 30 Days)</div>
                          <div className="text-xl font-bold text-green-600">
                            ₹{channel.metrics.revenue.toLocaleString()}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {channel.status === 'pending' ? 'Integration pending approval' :
                           channel.status === 'error' ? 'Connection error - check settings' :
                           'Not connected'}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => setSelectedChannel(channel)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Channel Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {channels.filter(c => c.status === 'connected').map((channel) => (
                  <div key={channel.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{channel.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ₹{channel.metrics.revenue.toLocaleString()} revenue
                      </span>
                    </div>
                    <Progress 
                      value={(channel.metrics.revenue / totalMetrics.revenue) * 100} 
                      className="h-2"
                    />
                    <div className="grid grid-cols-4 gap-4 text-xs text-muted-foreground">
                      <div>Impressions: {channel.metrics.impressions.toLocaleString()}</div>
                      <div>Clicks: {channel.metrics.clicks.toLocaleString()}</div>
                      <div>CTR: {channel.metrics.ctr}%</div>
                      <div>Bookings: {channel.metrics.bookings}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {channels.map((channel) => (
              <Card key={channel.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(channel.status)}`}></div>
                    {channel.name} Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor={`bid-strategy-${channel.id}`}>Bid Strategy</Label>
                    <select 
                      id={`bid-strategy-${channel.id}`}
                      className="w-full mt-1 p-2 border rounded-md"
                      value={channel.settings.bidStrategy}
                    >
                      <option value="target_roas">Target ROAS</option>
                      <option value="target_cpa">Target CPA</option>
                      <option value="maximize_clicks">Maximize Clicks</option>
                      <option value="manual_cpc">Manual CPC</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor={`max-cpc-${channel.id}`}>Max CPC (₹)</Label>
                    <Input
                      id={`max-cpc-${channel.id}`}
                      type="number"
                      value={channel.settings.maxCpc}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`target-roas-${channel.id}`}>Target ROAS (%)</Label>
                    <Input
                      id={`target-roas-${channel.id}`}
                      type="number"
                      value={channel.settings.targetRoas}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">
                      <Settings className="w-4 h-4 mr-2" />
                      Update
                    </Button>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Portal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MetaSearchIntegration;