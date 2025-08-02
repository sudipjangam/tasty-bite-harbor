import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Wifi,
  Zap,
  Settings,
  Activity,
  Database,
  Globe
} from "lucide-react";

interface SyncStatus {
  channelId: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSync: Date | null;
  progress: number;
  syncedItems: number;
  totalItems: number;
  errors: string[];
}

interface SyncConfig {
  autoSync: boolean;
  frequency: number; // in minutes
  syncTypes: string[];
  retryAttempts: number;
  batchSize: number;
}

const AdvancedChannelSync = () => {
  const { bookingChannels, syncChannels } = useChannelManagement();
  
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});
  const [globalSyncConfig, setGlobalSyncConfig] = useState<SyncConfig>({
    autoSync: true,
    frequency: 15,
    syncTypes: ['rates', 'availability', 'inventory'],
    retryAttempts: 3,
    batchSize: 50
  });
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [selectedSyncType, setSelectedSyncType] = useState('all');

  // Initialize sync statuses
  useEffect(() => {
    const initialStatuses: Record<string, SyncStatus> = {};
    bookingChannels.forEach(channel => {
      initialStatuses[channel.id] = {
        channelId: channel.id,
        status: 'idle',
        lastSync: channel.last_sync ? new Date(channel.last_sync) : null,
        progress: 0,
        syncedItems: 0,
        totalItems: 100, // Mock total items
        errors: []
      };
    });
    setSyncStatuses(initialStatuses);
  }, [bookingChannels]);

  const syncTypes = [
    { value: 'all', label: 'All Data', description: 'Sync rates, availability, and inventory' },
    { value: 'rates', label: 'Rates Only', description: 'Sync pricing information' },
    { value: 'availability', label: 'Availability Only', description: 'Sync room availability' },
    { value: 'inventory', label: 'Inventory Only', description: 'Sync room inventory counts' }
  ];

  const frequencies = [
    { value: 5, label: 'Every 5 minutes' },
    { value: 15, label: 'Every 15 minutes' },
    { value: 30, label: 'Every 30 minutes' },
    { value: 60, label: 'Every hour' },
    { value: 360, label: 'Every 6 hours' }
  ];

  const simulateSync = async (channelId: string, syncType: string) => {
    const totalSteps = 100;
    const stepDuration = 50; // milliseconds per step

    setSyncStatuses(prev => ({
      ...prev,
      [channelId]: {
        ...prev[channelId],
        status: 'syncing',
        progress: 0,
        syncedItems: 0,
        errors: []
      }
    }));

    for (let i = 0; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDuration));
      
      setSyncStatuses(prev => ({
        ...prev,
        [channelId]: {
          ...prev[channelId],
          progress: i,
          syncedItems: i
        }
      }));
    }

    // Simulate occasional errors
    const hasError = Math.random() < 0.2; // 20% chance of error
    
    setSyncStatuses(prev => ({
      ...prev,
      [channelId]: {
        ...prev[channelId],
        status: hasError ? 'error' : 'success',
        lastSync: hasError ? prev[channelId].lastSync : new Date(),
        errors: hasError ? ['Connection timeout', 'Invalid API response'] : []
      }
    }));
  };

  const handleSingleChannelSync = async (channelId: string) => {
    await simulateSync(channelId, selectedSyncType);
    
    // Also call the real sync function
    try {
      await syncChannels.mutateAsync({ 
        channelId, 
        syncType: selectedSyncType as 'rates' | 'availability' | 'all' 
      });
    } catch (error) {
      console.error('Real sync failed:', error);
    }
  };

  const handleBulkSync = async () => {
    setIsBulkSyncing(true);
    
    const activeChannels = bookingChannels.filter(channel => channel.is_active);
    
    // Run syncs in parallel with batch processing
    const batchPromises = activeChannels.map(channel => 
      simulateSync(channel.id, selectedSyncType)
    );
    
    try {
      await Promise.all(batchPromises);
      // Also call the real bulk sync
      await syncChannels.mutateAsync({ 
        syncType: selectedSyncType as 'rates' | 'availability' | 'all' 
      });
    } catch (error) {
      console.error('Bulk sync failed:', error);
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const getStatusIcon = (status: SyncStatus['status']) => {
    switch (status) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: SyncStatus['status']) => {
    switch (status) {
      case 'syncing': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'success': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'error': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      default: return 'border-gray-200';
    }
  };

  const activeChannelsCount = bookingChannels.filter(c => c.is_active).length;
  const syncingChannelsCount = Object.values(syncStatuses).filter(s => s.status === 'syncing').length;
  const successfulSyncsCount = Object.values(syncStatuses).filter(s => s.status === 'success').length;
  const failedSyncsCount = Object.values(syncStatuses).filter(s => s.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Sync Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Sync Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="auto-sync" 
                checked={globalSyncConfig.autoSync}
                onCheckedChange={(checked) => 
                  setGlobalSyncConfig(prev => ({ ...prev, autoSync: checked }))
                }
              />
              <Label htmlFor="auto-sync">Auto Sync</Label>
            </div>
            
            <div>
              <Label className="text-sm">Frequency</Label>
              <Select 
                value={globalSyncConfig.frequency.toString()} 
                onValueChange={(value) => 
                  setGlobalSyncConfig(prev => ({ ...prev, frequency: parseInt(value) }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value.toString()}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Sync Type</Label>
              <Select value={selectedSyncType} onValueChange={setSelectedSyncType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {syncTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleBulkSync}
                disabled={isBulkSyncing || syncingChannelsCount > 0}
                className="w-full"
              >
                <Zap className="w-4 h-4 mr-2" />
                {isBulkSyncing ? 'Syncing All...' : 'Bulk Sync'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Globe className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{activeChannelsCount}</div>
            <div className="text-sm text-muted-foreground">Active Channels</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">{syncingChannelsCount}</div>
            <div className="text-sm text-muted-foreground">Currently Syncing</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{successfulSyncsCount}</div>
            <div className="text-sm text-muted-foreground">Successful</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <div className="text-2xl font-bold">{failedSyncsCount}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Channel Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Channel Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bookingChannels.map((channel) => {
              const status = syncStatuses[channel.id];
              if (!status) return null;

              return (
                <div 
                  key={channel.id} 
                  className={`p-4 border rounded-lg transition-all ${getStatusColor(status.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status.status)}
                      <div>
                        <h4 className="font-semibold">{channel.channel_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {channel.channel_type.toUpperCase()}
                          </Badge>
                          <Wifi className={`w-3 h-3 ${channel.is_active ? 'text-green-500' : 'text-gray-400'}`} />
                          <span>{channel.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div className="font-medium">
                          {status.syncedItems}/{status.totalItems} items
                        </div>
                        <div className="text-muted-foreground">
                          Last: {status.lastSync ? status.lastSync.toLocaleString() : 'Never'}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSingleChannelSync(channel.id)}
                        disabled={status.status === 'syncing' || !channel.is_active}
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${status.status === 'syncing' ? 'animate-spin' : ''}`} />
                        Sync
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {status.status === 'syncing' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Syncing {selectedSyncType}...</span>
                        <span>{status.progress}%</span>
                      </div>
                      <Progress value={status.progress} className="h-2" />
                    </div>
                  )}

                  {/* Error Messages */}
                  {status.status === 'error' && status.errors.length > 0 && (
                    <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/20 rounded border-l-4 border-red-500">
                      <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                        Sync Errors:
                      </div>
                      <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                        {status.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Success Details */}
                  {status.status === 'success' && (
                    <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/20 rounded border-l-4 border-green-500">
                      <div className="text-sm text-green-800 dark:text-green-200">
                        ✓ Successfully synced {status.syncedItems} items • Commission: {channel.commission_rate}%
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedChannelSync;