import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRooms } from "@/hooks/useRooms";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { 
  Package, 
  Calendar, 
  TrendingUp, 
  RefreshCw,
  Clock,
  BarChart3,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Square,
  Minus
} from "lucide-react";

interface InventoryDay {
  date: Date;
  available: number;
  booked: number;
  blocked: number;
  total: number;
  status: 'available' | 'low' | 'blocked' | 'sold_out';
  bookings: ChannelBooking[];
}

interface ChannelBooking {
  channelId: string;
  channelName: string;
  roomsBooked: number;
  rate: number;
}

const PoolInventoryManagement = () => {
  const { rooms = [] } = useRooms();
  const { bookingChannels } = useChannelManagement();
  
  const [selectedRoom, setSelectedRoom] = useState(rooms[0]?.id || '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Generate inventory data for the current period
  const generateInventoryData = (): InventoryDay[] => {
    const days: InventoryDay[] = [];
    const totalRooms = 10; // Mock total rooms for selected room type
    
    if (viewMode === 'monthly') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const booked = Math.floor(Math.random() * totalRooms);
        const blocked = Math.floor(Math.random() * 2);
        const available = totalRooms - booked - blocked;
        
        let status: 'available' | 'low' | 'blocked' | 'sold_out';
        if (available === 0) status = 'sold_out';
        else if (blocked > 0) status = 'blocked';
        else if (available <= 2) status = 'low';
        else status = 'available';
        
        days.push({
          date,
          available,
          booked,
          blocked,
          total: totalRooms,
          status,
          bookings: bookingChannels.slice(0, Math.floor(Math.random() * 3) + 1).map(channel => ({
            channelId: channel.id,
            channelName: channel.channel_name,
            roomsBooked: Math.floor(Math.random() * 3) + 1,
            rate: 5000 + Math.floor(Math.random() * 2000)
          }))
        });
      }
    } else {
      // Yearly view - generate 12 months of data
      for (let month = 0; month < 12; month++) {
        const date = new Date(selectedYear, month, 15); // Mid-month
        const booked = Math.floor(Math.random() * totalRooms * 0.8);
        const blocked = Math.floor(Math.random() * totalRooms * 0.1);
        const available = totalRooms - booked - blocked;
        
        let status: 'available' | 'low' | 'blocked' | 'sold_out';
        if (available === 0) status = 'sold_out';
        else if (blocked > 0) status = 'blocked';
        else if (available <= 2) status = 'low';
        else status = 'available';
        
        days.push({
          date,
          available,
          booked,
          blocked,
          total: totalRooms,
          status,
          bookings: []
        });
      }
    }
    
    return days;
  };

  const [inventoryData, setInventoryData] = useState(generateInventoryData());
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 border-green-300 text-green-800';
      case 'low': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'blocked': return 'bg-gray-100 border-gray-300 text-gray-800';
      case 'sold_out': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-white border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'low': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'blocked': return <Minus className="w-4 h-4 text-gray-600" />;
      case 'sold_out': return <Square className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    setInventoryData(generateInventoryData());
  };

  const navigateYear = (direction: number) => {
    setSelectedYear(prev => prev + direction);
    setInventoryData(generateInventoryData());
  };

  const getWeekdays = () => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const getMonths = () => [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const totalStats = inventoryData.reduce((acc, day) => ({
    available: acc.available + day.available,
    booked: acc.booked + day.booked,
    blocked: acc.blocked + day.blocked,
    total: acc.total + day.total
  }), { available: 0, booked: 0, blocked: 0, total: 0 });

  const avgOccupancy = ((totalStats.booked / totalStats.total) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" />
            Pool Inventory Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pooled inventory means every channel has access to all rooms. Real-time updates, 
            2-year inventory management, and synchronized booking prevention.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Room Category</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>View Mode</Label>
              <Select value={viewMode} onValueChange={(value: 'monthly' | 'yearly') => setViewMode(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly View</SelectItem>
                  <SelectItem value="yearly">Yearly Overview</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 3}, (_, i) => new Date().getFullYear() + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Sync All
              </Button>
              <Button size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Update
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold text-green-600">{totalStats.available}</div>
            <div className="text-sm text-muted-foreground">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Square className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold text-blue-600">{totalStats.booked}</div>
            <div className="text-sm text-muted-foreground">Booked</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Minus className="w-8 h-8 mx-auto mb-2 text-gray-500" />
            <div className="text-2xl font-bold text-gray-600">{totalStats.blocked}</div>
            <div className="text-sm text-muted-foreground">Blocked</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold text-primary">{avgOccupancy}%</div>
            <div className="text-sm text-muted-foreground">Occupancy</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">Inventory Calendar</TabsTrigger>
          <TabsTrigger value="channels">Channel Breakdown</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">
                  {viewMode === 'monthly' 
                    ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : `${selectedYear} Overview`
                  }
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => viewMode === 'monthly' ? navigateMonth(-1) : navigateYear(-1)}
                  >
                    ←
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => viewMode === 'monthly' ? navigateMonth(1) : navigateYear(1)}
                  >
                    →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'monthly' ? (
                <>
                  {/* Monthly Calendar View */}
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {getWeekdays().map(day => (
                      <div key={day} className="p-2 text-center font-semibold text-sm text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {inventoryData.map((day, index) => (
                      <div 
                        key={index}
                        className={`p-2 border rounded-lg ${getStatusColor(day.status)} hover:shadow-md transition-shadow cursor-pointer`}
                      >
                        <div className="text-xs font-semibold mb-1 flex items-center justify-between">
                          <span>{day.date.getDate()}</span>
                          {getStatusIcon(day.status)}
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          <div className="grid grid-cols-3 gap-1 text-center">
                            <div className="text-green-600 font-semibold">{day.available}</div>
                            <div className="text-blue-600 font-semibold">{day.booked}</div>
                            <div className="text-gray-600 font-semibold">{day.blocked}</div>
                          </div>
                          
                          <div className="text-center text-muted-foreground">
                            {Math.round((day.booked / day.total) * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Yearly Overview */}
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {inventoryData.map((month, index) => (
                      <div 
                        key={index}
                        className={`p-4 border rounded-lg ${getStatusColor(month.status)} hover:shadow-md transition-shadow cursor-pointer`}
                      >
                        <div className="text-center">
                          <div className="font-semibold mb-2 flex items-center justify-center gap-2">
                            {getMonths()[index]}
                            {getStatusIcon(month.status)}
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-1 gap-1">
                              <div className="text-green-600 font-semibold">
                                Available: {month.available}
                              </div>
                              <div className="text-blue-600 font-semibold">
                                Booked: {month.booked}
                              </div>
                              <div className="text-gray-600 font-semibold">
                                Blocked: {month.blocked}
                              </div>
                            </div>
                            
                            <div className="text-center text-muted-foreground font-semibold border-t pt-2">
                              {Math.round((month.booked / month.total) * 100)}% Occupied
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm">Low Inventory</span>
                </div>
                <div className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <Square className="w-4 h-4 text-red-600" />
                  <span className="text-sm">Sold Out</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Channel Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingChannels.map((channel) => {
                  const channelBookings = inventoryData.reduce((sum, day) => 
                    sum + day.bookings.filter(b => b.channelId === channel.id).length, 0
                  );
                  const totalBookings = inventoryData.reduce((sum, day) => sum + day.bookings.length, 0);
                  const percentage = totalBookings > 0 ? (channelBookings / totalBookings) * 100 : 0;
                  
                  return (
                    <div key={channel.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-primary"></div>
                          <span className="font-medium">{channel.channel_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {channel.channel_type.toUpperCase()}
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold">
                          {channelBookings} bookings ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Alerts & Automation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Low Inventory Alerts</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span>Alert when inventory drops below 3 rooms</span>
                      </div>
                      <Button size="sm" variant="outline">Configure</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Square className="w-4 h-4 text-red-500" />
                        <span>Stop sell when sold out</span>
                      </div>
                      <Button size="sm" variant="outline">Configure</Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Sync Status</h3>
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h4 className="text-lg font-medium mb-2">Real-Time Sync Active</h4>
                    <p className="text-sm">
                      Inventory updates are synced across all connected OTAs in real-time
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PoolInventoryManagement;