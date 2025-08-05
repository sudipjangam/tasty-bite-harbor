import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRooms } from "@/hooks/useRooms";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { useToast } from "@/hooks/use-toast";
import { 
  Save,
  Settings, 
  DollarSign,
  Edit,
  Copy,
  Calendar,
  TrendingUp
} from "lucide-react";

interface RoomRate {
  roomId: string;
  baseRate: number;
  channelRates: { [channelId: string]: number };
  dateRange: {
    start: string;
    end: string;
  };
}

interface RoomPricingConfig {
  roomId: string;
  roomName: string;
  defaultRate: number;
  seasonalRates: RoomRate[];
  channelSpecificRates: { [channelId: string]: number };
}

const RoomSpecificRateManager = () => {
  const { rooms = [] } = useRooms();
  const { bookingChannels } = useChannelManagement();
  const { toast } = useToast();
  
  const [roomPricingConfigs, setRoomPricingConfigs] = useState<RoomPricingConfig[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  
  // Initialize room pricing configs
  useEffect(() => {
    if (rooms.length > 0) {
      const configs = rooms.map(room => ({
        roomId: room.id,
        roomName: room.name,
        defaultRate: room.price || 0,
        seasonalRates: [],
        channelSpecificRates: bookingChannels.reduce((rates, channel) => {
          const commissionAdjustment = 1 + (channel.commission_rate / 100);
          rates[channel.id] = Math.round((room.price || 0) * commissionAdjustment);
          return rates;
        }, {} as { [channelId: string]: number })
      }));
      setRoomPricingConfigs(configs);
      if (!selectedRoom && rooms.length > 0) {
        setSelectedRoom(rooms[0].id);
      }
    }
  }, [rooms, bookingChannels]);

  const getCurrentRoomConfig = () => {
    return roomPricingConfigs.find(config => config.roomId === selectedRoom);
  };

  const updateRoomDefaultRate = (roomId: string, newRate: number) => {
    setRoomPricingConfigs(prev => prev.map(config => 
      config.roomId === roomId 
        ? {
            ...config,
            defaultRate: newRate,
            channelSpecificRates: bookingChannels.reduce((rates, channel) => {
              const commissionAdjustment = 1 + (channel.commission_rate / 100);
              rates[channel.id] = Math.round(newRate * commissionAdjustment);
              return rates;
            }, {} as { [channelId: string]: number })
          }
        : config
    ));
  };

  const updateChannelSpecificRate = (roomId: string, channelId: string, rate: number) => {
    setRoomPricingConfigs(prev => prev.map(config => 
      config.roomId === roomId 
        ? {
            ...config,
            channelSpecificRates: {
              ...config.channelSpecificRates,
              [channelId]: rate
            }
          }
        : config
    ));
  };

  const copyRatesFromRoom = (sourceRoomId: string, targetRoomId: string) => {
    const sourceConfig = roomPricingConfigs.find(config => config.roomId === sourceRoomId);
    if (!sourceConfig) return;

    setRoomPricingConfigs(prev => prev.map(config => 
      config.roomId === targetRoomId 
        ? {
            ...config,
            defaultRate: sourceConfig.defaultRate,
            channelSpecificRates: { ...sourceConfig.channelSpecificRates }
          }
        : config
    ));

    toast({
      title: "Rates Copied",
      description: `Rates copied from ${sourceConfig.roomName} successfully.`,
    });
  };

  const saveRoomRates = async (roomId: string) => {
    const config = roomPricingConfigs.find(c => c.roomId === roomId);
    if (!config) return;

    try {
      // Here you would typically save to your backend/database
      // For now, we'll just show a success message
      toast({
        title: "Rates Saved",
        description: `Rates for ${config.roomName} have been saved successfully.`,
      });
      setEditingRoom(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save room rates. Please try again.",
      });
    }
  };

  const currentConfig = getCurrentRoomConfig();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Room-Specific Rate Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set different rates for each room across all booking channels. 
            Customize pricing based on room type, amenities, and view.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Select Room to Configure</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name} - {room.capacity} guests
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => setEditingRoom(editingRoom === selectedRoom ? null : selectedRoom)}
              variant={editingRoom === selectedRoom ? "secondary" : "outline"}
            >
              <Edit className="w-4 h-4 mr-2" />
              {editingRoom === selectedRoom ? "Cancel Edit" : "Edit Rates"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentConfig && (
        <Tabs defaultValue="rates" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rates">Rate Configuration</TabsTrigger>
            <TabsTrigger value="comparison">Room Comparison</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="rates" className="space-y-4">
            {/* Base Rate Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Base Rate for {currentConfig.roomName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Default Rate (₹)</Label>
                    <Input
                      type="number"
                      value={currentConfig.defaultRate}
                      onChange={(e) => updateRoomDefaultRate(selectedRoom, Number(e.target.value))}
                      disabled={editingRoom !== selectedRoom}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={() => saveRoomRates(selectedRoom)}
                      disabled={editingRoom !== selectedRoom}
                      className="w-full"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Base Rate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Channel-Specific Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Channel-Specific Rates</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Customize rates for each booking channel. Rates are automatically calculated based on commission but can be manually overridden.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bookingChannels.map((channel) => (
                    <Card key={channel.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{channel.channel_name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {channel.commission_rate}% commission
                          </Badge>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Rate (₹)</Label>
                          <Input
                            type="number"
                            value={currentConfig.channelSpecificRates[channel.id] || 0}
                            onChange={(e) => updateChannelSpecificRate(selectedRoom, channel.id, Number(e.target.value))}
                            disabled={editingRoom !== selectedRoom}
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          Suggested: ₹{Math.round(currentConfig.defaultRate * (1 + channel.commission_rate / 100))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                
                {editingRoom === selectedRoom && (
                  <div className="mt-4 pt-4 border-t">
                    <Button onClick={() => saveRoomRates(selectedRoom)} className="w-full">
                      <Save className="w-4 h-4 mr-2" />
                      Save All Channel Rates
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Room Rate Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Room</th>
                        <th className="text-left p-2">Base Rate</th>
                        {bookingChannels.slice(0, 3).map(channel => (
                          <th key={channel.id} className="text-left p-2">{channel.channel_name}</th>
                        ))}
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomPricingConfigs.map((config) => (
                        <tr key={config.roomId} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{config.roomName}</td>
                          <td className="p-2">₹{config.defaultRate.toLocaleString()}</td>
                          {bookingChannels.slice(0, 3).map(channel => (
                            <td key={channel.id} className="p-2">
                              ₹{(config.channelSpecificRates[channel.id] || 0).toLocaleString()}
                            </td>
                          ))}
                          <td className="p-2">
                            <div className="flex gap-2">
                              <Select onValueChange={(sourceRoomId) => copyRatesFromRoom(sourceRoomId, config.roomId)}>
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Copy from..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {roomPricingConfigs
                                    .filter(c => c.roomId !== config.roomId)
                                    .map(c => (
                                      <SelectItem key={c.roomId} value={c.roomId}>
                                        {c.roomName}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Rate Operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Apply Rate Increase</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Increase Type</Label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Value</Label>
                        <Input type="number" placeholder="Enter value" className="mt-1" />
                      </div>
                      <div>
                        <Label>Apply to Rooms</Label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select rooms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Rooms</SelectItem>
                            <SelectItem value="selected">Selected Rooms</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Apply Rate Increase
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Rate Synchronization</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Source Room</Label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select source room" />
                          </SelectTrigger>
                          <SelectContent>
                            {rooms.map(room => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Target Rooms</Label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select target rooms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Other Rooms</SelectItem>
                            <SelectItem value="similar">Similar Room Types</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" className="w-full">
                        <Copy className="w-4 h-4 mr-2" />
                        Sync Rates
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default RoomSpecificRateManager;