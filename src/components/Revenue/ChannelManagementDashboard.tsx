
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { Settings, RefreshCw, TrendingUp, Globe, Edit, Trash2 } from "lucide-react";
import ChannelIntegrationManager from "./ChannelIntegrationManager";
import ChannelManagementGuide from "./ChannelManagementGuide";
import BookingConsolidation from "./BookingConsolidation";
import AddChannelDialog from "./AddChannelDialog";
import EditChannelDialog from "./EditChannelDialog";
import PriceManagement from "./PriceManagement";
import AdvancedIntegration from "./AdvancedIntegration";

const ChannelManagementDashboard = () => {
  const { bookingChannels, updateChannel, isLoadingChannels, syncChannels, bulkUpdatePrices } = useChannelManagement();
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [activeView, setActiveView] = useState("overview");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleChannelToggle = (channelId: string, isActive: boolean) => {
    updateChannel.mutate({
      channelId,
      updates: { is_active: isActive }
    });
  };

  const handleSyncChannel = async (channelId: string) => {
    setIsSyncing(true);
    try {
      await syncChannels.mutateAsync({ channelId, syncType: 'all' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAllChannels = async () => {
    setIsSyncing(true);
    try {
      await syncChannels.mutateAsync({ syncType: 'all' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditChannel = (channel: any) => {
    setSelectedChannel(channel);
    setEditDialogOpen(true);
  };

  const getChannelTypeColor = (type: string) => {
    switch (type) {
      case 'direct': return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'ota': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'gds': return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  if (isLoadingChannels) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="standardized-page">
      <div className="standardized-header">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="standardized-title flex items-center gap-3">
              <Globe className="w-8 h-8 text-primary" />
              Channel Management
            </h1>
            <p className="standardized-description">
              Manage your booking channels, sync rates, and monitor performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ChannelManagementGuide />
            <AddChannelDialog onChannelAdded={() => window.location.reload()} />
            <Button 
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg"
              onClick={handleSyncAllChannels}
              disabled={isSyncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync All Channels'}
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Channel Overview</TabsTrigger>
          <TabsTrigger value="pricing">Price Management</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Integration</TabsTrigger>
          <TabsTrigger value="consolidation">Booking Consolidation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookingChannels.map((channel) => (
              <Card key={channel.id} className="standardized-card-elevated group hover:scale-105 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-primary/80"></div>
                    {channel.channel_name}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={channel.is_active}
                      onCheckedChange={(checked) => handleChannelToggle(channel.id, checked)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => handleEditChannel(channel)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Badge className={getChannelTypeColor(channel.channel_type)}>
                      {channel.channel_type.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium text-muted-foreground">
                      {channel.commission_rate}% commission
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Last Sync:</span>
                    <span className={!channel.last_sync ? 'text-red-500 font-medium' : 'text-foreground'}>
                      {channel.last_sync 
                        ? new Date(channel.last_sync).toLocaleDateString()
                        : 'Never'
                      }
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full hover:bg-primary hover:text-white border-primary/30 text-primary transition-all duration-200"
                    onClick={() => handleSyncChannel(channel.id)}
                    disabled={!channel.is_active || isSyncing}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Channel Performance Summary */}
          <Card className="standardized-card-glass">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold">
                <div className="p-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 mr-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                Channel Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                    {bookingChannels.filter(c => c.is_active).length}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 font-medium">Active Channels</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {bookingChannels.filter(c => c.channel_type === 'ota').length}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">OTA Channels</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    {bookingChannels.length > 0 ? (bookingChannels.reduce((sum, c) => sum + c.commission_rate, 0) / bookingChannels.length).toFixed(1) : 0}%
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">Avg Commission</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                    {bookingChannels.filter(c => !c.last_sync).length}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">Need Sync</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <PriceManagement channels={bookingChannels} />
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedIntegration channels={bookingChannels} />
        </TabsContent>

        <TabsContent value="consolidation">
          <BookingConsolidation />
        </TabsContent>
      </Tabs>

      <EditChannelDialog 
        channel={selectedChannel} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
      />
    </div>
  );
};

export default ChannelManagementDashboard;
