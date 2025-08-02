import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRooms } from "@/hooks/useRooms";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { 
  Package, 
  TrendingUp, 
  Calendar, 
  Target,
  BarChart3,
  Settings,
  AlertTriangle,
  CheckCircle,
  Bed
} from "lucide-react";

interface RoomInventory {
  roomId: string;
  roomName: string;
  totalInventory: number;
  allocations: ChannelAllocation[];
  utilization: number;
}

interface ChannelAllocation {
  channelId: string;
  channelName: string;
  channelType: string;
  allocated: number;
  booked: number;
  available: number;
  percentage: number;
  priority: number;
}

const InventoryAllocation = () => {
  const { rooms = [] } = useRooms();
  const { bookingChannels } = useChannelManagement();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [allocationStrategy, setAllocationStrategy] = useState('balanced');
  
  // Mock room inventory data - in real implementation, this would come from channel_inventory table
  const [roomInventories, setRoomInventories] = useState<RoomInventory[]>(() =>
    rooms.map(room => ({
      roomId: room.id,
      roomName: room.name,
      totalInventory: 10, // Assuming 10 units per room type
      utilization: Math.floor(Math.random() * 40) + 60, // 60-100% utilization
      allocations: bookingChannels.map((channel, index) => ({
        channelId: channel.id,
        channelName: channel.channel_name,
        channelType: channel.channel_type,
        allocated: Math.floor(Math.random() * 3) + 1,
        booked: Math.floor(Math.random() * 2),
        available: Math.floor(Math.random() * 2) + 1,
        percentage: 0, // Will be calculated
        priority: index + 1
      }))
    }))
  );

  // Calculate allocation percentages
  React.useEffect(() => {
    setRoomInventories(prev => prev.map(room => {
      const totalAllocated = room.allocations.reduce((sum, alloc) => sum + alloc.allocated, 0);
      return {
        ...room,
        allocations: room.allocations.map(alloc => ({
          ...alloc,
          percentage: totalAllocated > 0 ? Math.round((alloc.allocated / totalAllocated) * 100) : 0
        }))
      };
    }));
  }, []);

  const strategies = [
    { value: 'balanced', label: 'Balanced Allocation', description: 'Equal distribution across all channels' },
    { value: 'revenue', label: 'Revenue Optimized', description: 'Prioritize highest-paying channels' },
    { value: 'occupancy', label: 'Occupancy Focused', description: 'Maximize room occupancy rates' },
    { value: 'custom', label: 'Custom Rules', description: 'Use predefined allocation rules' }
  ];

  const updateAllocation = (roomId: string, channelId: string, newAllocation: number) => {
    setRoomInventories(prev => prev.map(room => 
      room.roomId === roomId ? {
        ...room,
        allocations: room.allocations.map(alloc =>
          alloc.channelId === channelId ? { ...alloc, allocated: newAllocation } : alloc
        )
      } : room
    ));
  };

  const autoAllocate = (strategy: string) => {
    setRoomInventories(prev => prev.map(room => {
      const totalInventory = room.totalInventory;
      const channelCount = room.allocations.length;
      
      let newAllocations = [...room.allocations];
      
      switch (strategy) {
        case 'balanced':
          const equalShare = Math.floor(totalInventory / channelCount);
          newAllocations = newAllocations.map(alloc => ({
            ...alloc,
            allocated: equalShare
          }));
          break;
          
        case 'revenue':
          // Prioritize OTA channels (assuming they have higher rates)
          newAllocations = newAllocations.map((alloc, index) => ({
            ...alloc,
            allocated: alloc.channelType === 'ota' ? Math.ceil(totalInventory * 0.4 / channelCount) :
                      alloc.channelType === 'direct' ? Math.ceil(totalInventory * 0.5) :
                      Math.ceil(totalInventory * 0.1 / channelCount)
          }));
          break;
          
        case 'occupancy':
          // Give more to direct channels
          newAllocations = newAllocations.map((alloc, index) => ({
            ...alloc,
            allocated: alloc.channelType === 'direct' ? Math.ceil(totalInventory * 0.6) :
                      Math.ceil(totalInventory * 0.4 / (channelCount - 1))
          }));
          break;
      }
      
      return { ...room, allocations: newAllocations };
    }));
  };

  const getTotalAllocated = (room: RoomInventory) => 
    room.allocations.reduce((sum, alloc) => sum + alloc.allocated, 0);

  const getChannelTypeColor = (type: string) => {
    switch (type) {
      case 'ota': return 'bg-blue-500';
      case 'direct': return 'bg-green-500';
      case 'gds': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Inventory Allocation Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date-select">Target Date</Label>
              <Input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="strategy-select">Allocation Strategy</Label>
              <Select value={allocationStrategy} onValueChange={setAllocationStrategy}>
                <SelectTrigger id="strategy-select" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((strategy) => (
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
            <div className="flex items-end">
              <Button 
                onClick={() => autoAllocate(allocationStrategy)}
                className="w-full"
              >
                <Target className="w-4 h-4 mr-2" />
                Auto Allocate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Bed className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{rooms.length}</div>
            <div className="text-sm text-muted-foreground">Room Types</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{bookingChannels.length}</div>
            <div className="text-sm text-muted-foreground">Active Channels</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">
              {Math.round(roomInventories.reduce((sum, room) => sum + room.utilization, 0) / roomInventories.length)}%
            </div>
            <div className="text-sm text-muted-foreground">Avg Utilization</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">
              {roomInventories.reduce((sum, room) => sum + getTotalAllocated(room), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Allocated</div>
          </CardContent>
        </Card>
      </div>

      {/* Room Inventory Management */}
      <div className="space-y-6">
        {roomInventories.map((room) => {
          const totalAllocated = getTotalAllocated(room);
          const overAllocated = totalAllocated > room.totalInventory;
          
          return (
            <Card key={room.roomId} className={`${overAllocated ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bed className="w-5 h-5" />
                    {room.roomName}
                    {overAllocated && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Inventory:</span>
                      <span className="ml-2 font-bold">{room.totalInventory}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Allocated:</span>
                      <span className={`ml-2 font-bold ${overAllocated ? 'text-red-500' : 'text-green-600'}`}>
                        {totalAllocated}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Utilization:</span>
                      <span className="ml-2 font-bold">{room.utilization}%</span>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Allocation Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Allocation Progress</span>
                      <span>{Math.round((totalAllocated / room.totalInventory) * 100)}%</span>
                    </div>
                    <Progress 
                      value={Math.min((totalAllocated / room.totalInventory) * 100, 100)} 
                      className={`h-2 ${overAllocated ? 'bg-red-100' : ''}`}
                    />
                    {overAllocated && (
                      <p className="text-red-500 text-xs mt-1">
                        Over-allocated by {totalAllocated - room.totalInventory} units
                      </p>
                    )}
                  </div>

                  {/* Channel Allocations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {room.allocations.map((allocation) => (
                      <div key={allocation.channelId} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getChannelTypeColor(allocation.channelType)}`}></div>
                            <h4 className="font-medium text-sm">{allocation.channelName}</h4>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {allocation.channelType.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`allocation-${allocation.channelId}`} className="text-xs">
                              Allocated Units
                            </Label>
                            <Input
                              id={`allocation-${allocation.channelId}`}
                              type="number"
                              value={allocation.allocated}
                              onChange={(e) => updateAllocation(room.roomId, allocation.channelId, parseInt(e.target.value) || 0)}
                              className="mt-1"
                              min="0"
                              max={room.totalInventory}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Booked:</span>
                              <span className="ml-1 font-semibold">{allocation.booked}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Available:</span>
                              <span className="ml-1 font-semibold">{allocation.available}</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Share:</span>
                            <span className="font-bold">{allocation.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryAllocation;