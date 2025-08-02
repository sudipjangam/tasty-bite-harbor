import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { useRooms } from "@/hooks/useRooms";
import { DollarSign, TrendingUp, TrendingDown, Percent, Bed, Eye, ExternalLink } from "lucide-react";

interface PriceManagementProps {
  channels: any[];
}

interface RoomPrice {
  roomId: string;
  price: number;
}

const PriceManagement = ({ channels }: PriceManagementProps) => {
  const { bulkUpdatePrices } = useChannelManagement();
  const { rooms = [], loading: roomsLoading } = useRooms();
  
  // Single price mode
  const [basePrice, setBasePrice] = useState<number>(5000);
  const [adjustmentType, setAdjustmentType] = useState<'percentage' | 'fixed'>('percentage');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(10);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  
  // Individual room prices mode
  const [roomPrices, setRoomPrices] = useState<RoomPrice[]>(() => 
    rooms.map(room => ({ roomId: room.id, price: room.price || 5000 }))
  );
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);

  React.useEffect(() => {
    if (rooms.length > 0) {
      setRoomPrices(rooms.map(room => ({ roomId: room.id, price: room.price || 5000 })));
    }
  }, [rooms]);

  const calculateChannelPrice = (channel: any, basePrice: number) => {
    const commissionRate = channel.commission_rate || 0;
    let adjustedPrice = basePrice;

    if (adjustmentType === 'percentage') {
      adjustedPrice = basePrice * (1 + adjustmentValue / 100);
    } else {
      adjustedPrice = basePrice + adjustmentValue;
    }

    // Account for channel commission
    const finalPrice = adjustedPrice * (1 + commissionRate / 100);
    return Math.round(finalPrice);
  };

  const handleBulkPriceUpdate = async () => {
    const channelsToUpdate = selectedChannels.length > 0 ? selectedChannels : channels.map(c => c.id);
    const finalPrice = calculateChannelPrice({ commission_rate: 0 }, basePrice);
    
    await bulkUpdatePrices.mutateAsync({
      priceAdjustment: finalPrice,
      channels: channelsToUpdate
    });
  };

  const handleRoomPriceUpdate = async () => {
    // Update prices for individual rooms across channels
    const channelsToUpdate = selectedChannels.length > 0 ? selectedChannels : channels.map(c => c.id);
    
    for (const roomPrice of roomPrices) {
      const finalPrice = calculateChannelPrice({ commission_rate: 0 }, roomPrice.price);
      await bulkUpdatePrices.mutateAsync({
        priceAdjustment: finalPrice,
        channels: channelsToUpdate
      });
    }
  };

  const updateRoomPrice = (roomId: string, price: number) => {
    setRoomPrices(prev => 
      prev.map(rp => rp.roomId === roomId ? { ...rp, price } : rp)
    );
  };

  const toggleChannelSelection = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const openPriceModal = (room: any) => {
    setSelectedRoom(room);
    setShowPriceModal(true);
  };

  if (roomsLoading) {
    return <div>Loading rooms...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Price Management Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bulk" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bulk">Bulk Pricing</TabsTrigger>
              <TabsTrigger value="individual">Individual Room Pricing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="bulk" className="space-y-6 mt-6">
              {/* Base Price Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="base-price">Base Room Rate (₹)</Label>
                  <Input
                    id="base-price"
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    placeholder="5000"
                  />
                </div>
                <div>
                  <Label htmlFor="adjustment-type">Adjustment Type</Label>
                  <Select value={adjustmentType} onValueChange={(value: 'percentage' | 'fixed') => setAdjustmentType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="adjustment-value">
                    Adjustment Value {adjustmentType === 'percentage' ? '(%)' : '(₹)'}
                  </Label>
                  <Input
                    id="adjustment-value"
                    type="number"
                    value={adjustmentValue}
                    onChange={(e) => setAdjustmentValue(Number(e.target.value))}
                    placeholder={adjustmentType === 'percentage' ? '10' : '500'}
                  />
                </div>
              </div>

              {/* Channel Selection */}
              <div>
                <Label className="text-base font-semibold">Select Channels to Update</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  {channels.map((channel) => (
                    <Card 
                      key={channel.id} 
                      className={`cursor-pointer transition-all border-2 ${
                        selectedChannels.includes(channel.id) || selectedChannels.length === 0
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleChannelSelection(channel.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{channel.channel_name}</h4>
                          <Badge variant={channel.is_active ? 'default' : 'secondary'} className="text-xs">
                            {channel.channel_type.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Commission:</span>
                            <span>{channel.commission_rate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Final Price:</span>
                            <span className="font-mono font-semibold">
                              ₹{calculateChannelPrice(channel, basePrice).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedChannels.length === 0 
                    ? 'All channels will be updated' 
                    : `${selectedChannels.length} channel(s) selected`}
                </p>
              </div>

              <Button 
                onClick={handleBulkPriceUpdate}
                className="w-full"
                disabled={bulkUpdatePrices.isPending}
              >
                {bulkUpdatePrices.isPending ? "Updating Prices..." : "Update All Rooms with Same Price"}
              </Button>
            </TabsContent>

            <TabsContent value="individual" className="space-y-6 mt-6">
              {/* Individual Room Pricing */}
              <div>
                <Label className="text-base font-semibold mb-4 block">Set Individual Room Prices</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rooms.map((room) => {
                    const roomPrice = roomPrices.find(rp => rp.roomId === room.id)?.price || room.price || 5000;
                    return (
                      <Card key={room.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                          <Bed className="w-4 h-4 text-primary" />
                          <h4 className="font-medium">{room.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {room.capacity} guests
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm">Base Price (₹)</Label>
                            <Input
                              type="number"
                              value={roomPrice}
                              onChange={(e) => updateRoomPrice(room.id, Number(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <div className="font-medium mb-1 flex items-center justify-between">
                              <span>Channel Prices Preview:</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => openPriceModal(room)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View All
                              </Button>
                            </div>
                            {channels.slice(0, 2).map(channel => (
                              <div key={channel.id} className="flex justify-between">
                                <span className="truncate">{channel.channel_name}:</span>
                                <span className="font-mono">₹{calculateChannelPrice(channel, roomPrice).toLocaleString()}</span>
                              </div>
                            ))}
                            {channels.length > 2 && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-4 p-0 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => openPriceModal(room)}
                              >
                                +{channels.length - 2} more channels
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Channel Selection for Individual Pricing */}
              <div>
                <Label className="text-base font-semibold">Select Channels to Update</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  {channels.map((channel) => (
                    <Card 
                      key={channel.id} 
                      className={`cursor-pointer transition-all border-2 ${
                        selectedChannels.includes(channel.id) || selectedChannels.length === 0
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleChannelSelection(channel.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{channel.channel_name}</h4>
                          <Badge variant={channel.is_active ? 'default' : 'secondary'} className="text-xs">
                            {channel.channel_type.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Commission:</span>
                            <span>{channel.commission_rate}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleRoomPriceUpdate}
                className="w-full"
                disabled={bulkUpdatePrices.isPending}
              >
                {bulkUpdatePrices.isPending ? "Updating Prices..." : "Update Individual Room Prices"}
              </Button>
            </TabsContent>
          </Tabs>

          {/* Price Summary */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 mt-6">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Price Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Rooms</div>
                  <div className="font-mono font-semibold">{rooms.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Active Channels</div>
                  <div className="font-mono font-semibold">{channels.filter(c => c.is_active).length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Avg Commission</div>
                  <div className="font-mono font-semibold">
                    {channels.length > 0 
                      ? (channels.reduce((sum, c) => sum + c.commission_rate, 0) / channels.length).toFixed(1)
                      : 0}%
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Selected Channels</div>
                  <div className="font-mono font-semibold">
                    {selectedChannels.length === 0 ? 'All' : selectedChannels.length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Modal for Individual Room */}
          <Dialog open={showPriceModal} onOpenChange={setShowPriceModal}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bed className="w-5 h-5" />
                  {selectedRoom?.name} - Channel Pricing Details
                  <Badge variant="outline" className="ml-2">
                    {selectedRoom?.capacity} guests
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  View detailed pricing breakdown across all channels for this room, including base prices, commissions, and final rates.
                </DialogDescription>
              </DialogHeader>
              
              {selectedRoom && (
                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Base Price:</span>
                        <span className="font-mono font-semibold ml-2">
                          ₹{(roomPrices.find(rp => rp.roomId === selectedRoom.id)?.price || selectedRoom.price || 5000).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Room Status:</span>
                        <Badge variant={selectedRoom.status === 'available' ? 'default' : 'secondary'} className="ml-2">
                          {selectedRoom.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {channels.map((channel) => {
                      const basePrice = roomPrices.find(rp => rp.roomId === selectedRoom.id)?.price || selectedRoom.price || 5000;
                      const finalPrice = calculateChannelPrice(channel, basePrice);
                      const markup = finalPrice - basePrice;
                      const markupPercentage = ((markup / basePrice) * 100).toFixed(1);
                      
                      return (
                        <Card key={channel.id} className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium">{channel.channel_name}</h4>
                              <Badge 
                                variant={channel.is_active ? 'default' : 'secondary'} 
                                className="text-xs mt-1"
                              >
                                {channel.channel_type.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-lg">
                                ₹{finalPrice.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Final Price
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Base Price:</span>
                              <span className="font-mono">₹{basePrice.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Commission:</span>
                              <span className="font-mono">{channel.commission_rate}%</span>
                            </div>
                            {adjustmentValue > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Adjustment:</span>
                                <span className="font-mono">
                                  {adjustmentType === 'percentage' ? `+${adjustmentValue}%` : `+₹${adjustmentValue}`}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-muted-foreground">Total Markup:</span>
                              <span className="font-mono text-green-600">
                                +₹{markup} ({markupPercentage}%)
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">Channel Status:</span>
                              <Badge variant={channel.is_active ? 'default' : 'destructive'} className="text-xs">
                                {channel.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceManagement;