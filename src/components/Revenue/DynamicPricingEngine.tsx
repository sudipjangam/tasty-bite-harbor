import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { useRooms } from "@/hooks/useRooms";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Target, 
  BarChart3,
  Brain,
  Settings,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface PricingRule {
  id: string;
  name: string;
  type: 'occupancy' | 'demand' | 'competitor' | 'seasonal' | 'advance_booking';
  condition: string;
  adjustment: number;
  adjustmentType: 'percentage' | 'fixed';
  isActive: boolean;
  priority: number;
}

interface RoomPricing {
  roomId: string;
  basePrice: number;
  currentPrice: number;
  recommendedPrice: number;
  lastUpdated: Date;
  appliedRules: string[];
}

const DynamicPricingEngine = () => {
  const { ratePlans, pricingRules, savePricingRule } = useChannelManagement();
  const { rooms = [] } = useRooms();

  const [isEngineEnabled, setIsEngineEnabled] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState('balanced');
  const [priceUpdateFrequency, setPriceUpdateFrequency] = useState('hourly');
  
  // Default pricing rules
  const [rules, setRules] = useState<PricingRule[]>([
    {
      id: '1',
      name: 'High Occupancy Premium',
      type: 'occupancy',
      condition: 'occupancy > 80%',
      adjustment: 15,
      adjustmentType: 'percentage',
      isActive: true,
      priority: 1
    },
    {
      id: '2',
      name: 'Low Demand Discount',
      type: 'demand',
      condition: 'bookings < 3 in next 7 days',
      adjustment: 10,
      adjustmentType: 'percentage',
      isActive: true,
      priority: 2
    },
    {
      id: '3',
      name: 'Competitor Match',
      type: 'competitor',
      condition: 'competitor_avg < our_price - 5%',
      adjustment: -5,
      adjustmentType: 'percentage',
      isActive: false,
      priority: 3
    },
    {
      id: '4',
      name: 'Weekend Premium',
      type: 'seasonal',
      condition: 'weekend',
      adjustment: 20,
      adjustmentType: 'percentage',
      isActive: true,
      priority: 4
    },
    {
      id: '5',
      name: 'Early Bird Discount',
      type: 'advance_booking',
      condition: 'booking > 30 days advance',
      adjustment: 15,
      adjustmentType: 'percentage',
      isActive: true,
      priority: 5
    }
  ]);

  // Room pricing with AI recommendations
  const [roomPricing, setRoomPricing] = useState<RoomPricing[]>(() =>
    rooms.map(room => ({
      roomId: room.id,
      basePrice: room.price || 5000,
      currentPrice: room.price || 5000,
      recommendedPrice: Math.round((room.price || 5000) * (1 + Math.random() * 0.2 - 0.1)),
      lastUpdated: new Date(),
      appliedRules: ['High Occupancy Premium']
    }))
  );

  const strategies = [
    { value: 'aggressive', label: 'Aggressive Revenue', description: 'Maximize revenue with higher price adjustments' },
    { value: 'balanced', label: 'Balanced Growth', description: 'Balance between occupancy and revenue' },
    { value: 'conservative', label: 'Conservative Occupancy', description: 'Focus on maintaining high occupancy rates' }
  ];

  const frequencies = [
    { value: 'realtime', label: 'Real-time', description: 'Update prices as market conditions change' },
    { value: 'hourly', label: 'Every Hour', description: 'Check and update prices hourly' },
    { value: 'daily', label: 'Daily', description: 'Update prices once per day' }
  ];

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };

  const applyRecommendedPrices = () => {
    setRoomPricing(prev => prev.map(room => ({
      ...room,
      currentPrice: room.recommendedPrice,
      lastUpdated: new Date()
    })));
  };

  const calculateMarketInsights = () => {
    const totalRooms = rooms.length;
    const avgCurrentPrice = roomPricing.reduce((sum, room) => sum + room.currentPrice, 0) / totalRooms;
    const avgRecommendedPrice = roomPricing.reduce((sum, room) => sum + room.recommendedPrice, 0) / totalRooms;
    const potentialIncrease = ((avgRecommendedPrice - avgCurrentPrice) / avgCurrentPrice * 100).toFixed(1);
    
    return {
      totalRooms,
      avgCurrentPrice: Math.round(avgCurrentPrice),
      avgRecommendedPrice: Math.round(avgRecommendedPrice),
      potentialIncrease: parseFloat(potentialIncrease)
    };
  };

  const insights = calculateMarketInsights();

  return (
    <div className="space-y-6">
      {/* Engine Status & Controls */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Dynamic Pricing Engine
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="engine-toggle" className="text-sm font-medium">
                {isEngineEnabled ? 'Active' : 'Inactive'}
              </Label>
              <Switch
                id="engine-toggle"
                checked={isEngineEnabled}
                onCheckedChange={setIsEngineEnabled}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-base font-semibold">Pricing Strategy</Label>
              <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                <SelectTrigger className="mt-2">
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

            <div>
              <Label className="text-base font-semibold">Update Frequency</Label>
              <Select value={priceUpdateFrequency} onValueChange={setPriceUpdateFrequency}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      <div>
                        <div className="font-medium">{freq.label}</div>
                        <div className="text-sm text-muted-foreground">{freq.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{insights.totalRooms}</div>
            <div className="text-sm text-muted-foreground">Total Rooms</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">₹{insights.avgCurrentPrice.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Avg Current Price</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">₹{insights.avgRecommendedPrice.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">AI Recommended</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            {insights.potentialIncrease > 0 ? (
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-500" />
            ) : (
              <TrendingDown className="w-8 h-8 mx-auto mb-2 text-red-500" />
            )}
            <div className="text-2xl font-bold">
              {insights.potentialIncrease > 0 ? '+' : ''}{insights.potentialIncrease}%
            </div>
            <div className="text-sm text-muted-foreground">Potential Revenue Change</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Pricing Rules</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Automated Pricing Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className={`p-4 border rounded-lg transition-all ${
                      rule.isActive ? 'border-primary bg-primary/5' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={() => toggleRule(rule.id)}
                          />
                          <h4 className="font-semibold">{rule.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {rule.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Priority {rule.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground ml-12">
                          <div className="mb-1">
                            <strong>Condition:</strong> {rule.condition}
                          </div>
                          <div>
                            <strong>Adjustment:</strong> {rule.adjustment > 0 ? '+' : ''}{rule.adjustment}
                            {rule.adjustmentType === 'percentage' ? '%' : '₹'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rule.isActive ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Add New Rule
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Price Recommendations
                </div>
                <Button onClick={applyRecommendedPrices} className="bg-gradient-to-r from-primary to-primary/90">
                  Apply All Recommendations
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roomPricing.map((room) => {
                  const roomData = rooms.find(r => r.id === room.roomId);
                  const priceChange = ((room.recommendedPrice - room.currentPrice) / room.currentPrice * 100);
                  
                  return (
                    <div key={room.roomId} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{roomData?.name}</h4>
                          <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                            <div>
                              <div className="text-muted-foreground">Current Price</div>
                              <div className="font-mono font-bold text-lg">₹{room.currentPrice.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">AI Recommended</div>
                              <div className="font-mono font-bold text-lg text-primary">₹{room.recommendedPrice.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Change</div>
                              <div className={`font-bold text-lg ${priceChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="text-xs text-muted-foreground">Applied Rules:</div>
                            <div className="flex gap-1 mt-1">
                              {room.appliedRules.map((ruleName, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {ruleName}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setRoomPricing(prev => prev.map(r => 
                              r.roomId === room.roomId 
                                ? { ...r, currentPrice: r.recommendedPrice, lastUpdated: new Date() }
                                : r
                            ));
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Pricing Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Advanced Analytics Coming Soon</h3>
                <p className="text-sm">
                  Track pricing performance, revenue impact, and competitor analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DynamicPricingEngine;