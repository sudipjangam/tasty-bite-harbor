import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRooms } from "@/hooks/useRooms";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { 
  Calendar, 
  Settings, 
  TrendingUp, 
  Clock,
  DollarSign,
  BarChart3,
  RefreshCw,
  Lock,
  Unlock,
  Ban
} from "lucide-react";

interface RateCalendarDay {
  date: Date;
  baseRate: number;
  channelRates: { [channelId: string]: number };
  restrictions: {
    minStay: number;
    maxStay?: number;
    stopSell: boolean;
    cta: boolean; // Closed to Arrival
    ctd: boolean; // Closed to Departure
  };
  occupancy: number;
  bookings: number;
}

interface RatePlan {
  id: string;
  name: string;
  roomId: string;
  rateDays: RateCalendarDay[];
}

const EnhancedRateManagement = () => {
  const { rooms = [] } = useRooms();
  const { bookingChannels } = useChannelManagement();
  
  const [selectedRoom, setSelectedRoom] = useState(rooms[0]?.id || '');
  const [selectedRatePlan, setSelectedRatePlan] = useState('standard');
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Generate calendar days for the current month
  const generateCalendarDays = (): RateCalendarDay[] => {
    const days: RateCalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const baseRate = 5000 + Math.floor(Math.random() * 2000); // Mock base rate
      const channelRates: { [channelId: string]: number } = {};
      
      bookingChannels.forEach(channel => {
        const commissionAdjustment = 1 + (channel.commission_rate / 100);
        channelRates[channel.id] = Math.round(baseRate * commissionAdjustment);
      });
      
      days.push({
        date,
        baseRate,
        channelRates,
        restrictions: {
          minStay: Math.random() > 0.8 ? 2 : 1,
          maxStay: Math.random() > 0.9 ? 7 : undefined,
          stopSell: Math.random() > 0.95,
          cta: Math.random() > 0.97,
          ctd: Math.random() > 0.97
        },
        occupancy: Math.floor(Math.random() * 100),
        bookings: Math.floor(Math.random() * 5)
      });
    }
    
    return days;
  };

  const [calendarDays, setCalendarDays] = useState(generateCalendarDays());
  
  const updateRate = (dayIndex: number, newRate: number) => {
    setCalendarDays(prev => prev.map((day, index) => 
      index === dayIndex ? {
        ...day,
        baseRate: newRate,
        channelRates: Object.keys(day.channelRates).reduce((rates, channelId) => {
          const channel = bookingChannels.find(c => c.id === channelId);
          const commissionAdjustment = 1 + ((channel?.commission_rate || 0) / 100);
          rates[channelId] = Math.round(newRate * commissionAdjustment);
          return rates;
        }, {} as { [channelId: string]: number })
      } : day
    ));
  };

  const toggleRestriction = (dayIndex: number, restriction: string) => {
    setCalendarDays(prev => prev.map((day, index) => 
      index === dayIndex ? {
        ...day,
        restrictions: {
          ...day.restrictions,
          [restriction]: !day.restrictions[restriction as keyof typeof day.restrictions]
        }
      } : day
    ));
  };

  const getDayColor = (day: RateCalendarDay) => {
    if (day.restrictions.stopSell) return 'bg-red-100 border-red-300';
    if (day.restrictions.cta || day.restrictions.ctd) return 'bg-yellow-100 border-yellow-300';
    if (day.occupancy > 80) return 'bg-green-100 border-green-300';
    if (day.occupancy < 30) return 'bg-blue-100 border-blue-300';
    return 'bg-white border-gray-200';
  };

  const getWeekdays = () => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    setCalendarDays(generateCalendarDays());
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Rate Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control rates and offers across all channels. Set occupancy-based pricing, 
            OTA-specific rates, MLOS controls, stop sell settings, and weekday/weekend pricing.
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
              <Label>Rate Plan</Label>
              <Select value={selectedRatePlan} onValueChange={setSelectedRatePlan}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Rate</SelectItem>
                  <SelectItem value="advance">Advance Purchase</SelectItem>
                  <SelectItem value="flexible">Flexible Rate</SelectItem>
                  <SelectItem value="package">Package Deal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>View Mode</Label>
              <Select value={viewMode} onValueChange={(value: 'monthly' | 'weekly') => setViewMode(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly View</SelectItem>
                  <SelectItem value="weekly">Weekly View</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Rates
              </Button>
              <Button size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Sync Rates
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">Rate Calendar</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          <TabsTrigger value="analytics">Rate Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {/* Calendar Navigation */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
                    ←
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
                    →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {getWeekdays().map(day => (
                  <div key={day} className="p-2 text-center font-semibold text-sm text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div 
                    key={index}
                    className={`p-2 border rounded-lg ${getDayColor(day)} hover:shadow-md transition-shadow cursor-pointer`}
                  >
                    <div className="text-xs font-semibold mb-1">
                      {day.date.getDate()}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-xs font-mono">
                        ₹{day.baseRate.toLocaleString()}
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {day.restrictions.stopSell && (
                          <Badge variant="destructive" className="text-xs h-4">
                            <Ban className="w-2 h-2" />
                          </Badge>
                        )}
                        {day.restrictions.cta && (
                          <Badge variant="secondary" className="text-xs h-4">CTA</Badge>
                        )}
                        {day.restrictions.ctd && (
                          <Badge variant="secondary" className="text-xs h-4">CTD</Badge>
                        )}
                        {day.restrictions.minStay > 1 && (
                          <Badge variant="outline" className="text-xs h-4">
                            {day.restrictions.minStay}N
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {day.occupancy}% • {day.bookings} bookings
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Channel Rate Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Channel Rate Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bookingChannels.slice(0, 3).map((channel) => (
                  <div key={channel.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <span className="font-medium">{channel.channel_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {channel.commission_rate}%
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg Rate: ₹{(calendarDays.reduce((sum, day) => sum + (day.channelRates[channel.id] || 0), 0) / calendarDays.length).toFixed(0)}
                    </div>
                  </div>
                ))}
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
                  <h3 className="font-semibold">Rate Adjustments</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>Date Range</Label>
                      <div className="flex gap-2 mt-1">
                        <Input type="date" className="flex-1" />
                        <Input type="date" className="flex-1" />
                      </div>
                    </div>
                    <div>
                      <Label>Adjustment Type</Label>
                      <Select>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select adjustment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage Change</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                          <SelectItem value="set">Set Rate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Value</Label>
                      <Input type="number" placeholder="Enter value" className="mt-1" />
                    </div>
                    <Button className="w-full">Apply Rate Changes</Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Restrictions</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Stop Sell</Label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Closed to Arrival</Label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Closed to Departure</Label>
                      <Switch />
                    </div>
                    <div>
                      <Label>Minimum Stay</Label>
                      <Select>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select min stay" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Night</SelectItem>
                          <SelectItem value="2">2 Nights</SelectItem>
                          <SelectItem value="3">3 Nights</SelectItem>
                          <SelectItem value="7">7 Nights</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" className="w-full">Apply Restrictions</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">₹{(calendarDays.reduce((sum, day) => sum + day.baseRate, 0) / calendarDays.length).toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Avg Daily Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{(calendarDays.reduce((sum, day) => sum + day.occupancy, 0) / calendarDays.length).toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Avg Occupancy</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">₹{((calendarDays.reduce((sum, day) => sum + day.baseRate * day.occupancy, 0) / 100) / calendarDays.length).toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">RevPAR</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold">{calendarDays.filter(day => day.restrictions.stopSell).length}</div>
                <div className="text-sm text-muted-foreground">Stopped Days</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedRateManagement;