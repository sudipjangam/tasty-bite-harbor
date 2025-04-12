
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, BarChart3, Loader2, Package, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchSalesForecasts, fetchInventoryRecommendations } from '@/utils/aiAnalytics';
import type { SalesForecast, InventoryRecommendation } from '@/utils/aiAnalytics';

const PredictiveAnalytics = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [forecastDays, setForecastDays] = useState(7);
  const [salesForecasts, setSalesForecasts] = useState<SalesForecast[]>([]);
  const [inventoryRecommendations, setInventoryRecommendations] = useState<InventoryRecommendation[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Fetch restaurant ID
  const { data: restaurantId } = useQuery({
    queryKey: ["restaurant-id"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .maybeSingle();

      return userProfile?.restaurant_id || null;
    },
  });

  // Load sales forecasts
  useEffect(() => {
    const loadSalesForecasts = async () => {
      if (!restaurantId) return;
      
      setIsLoadingSales(true);
      try {
        const forecasts = await fetchSalesForecasts(restaurantId, forecastDays);
        setSalesForecasts(forecasts);
      } catch (error) {
        console.error("Error loading sales forecasts:", error);
      } finally {
        setIsLoadingSales(false);
      }
    };

    loadSalesForecasts();
  }, [restaurantId, forecastDays]);

  // Load inventory recommendations
  useEffect(() => {
    const loadInventoryRecommendations = async () => {
      if (!restaurantId) return;
      
      setIsLoadingInventory(true);
      try {
        const recommendations = await fetchInventoryRecommendations(restaurantId);
        setInventoryRecommendations(recommendations);
      } catch (error) {
        console.error("Error loading inventory recommendations:", error);
      } finally {
        setIsLoadingInventory(false);
      }
    };

    loadInventoryRecommendations();
  }, [restaurantId]);

  // Calculate overall sales trend
  const calculateSalesTrend = () => {
    if (salesForecasts.length < 2) return 0;
    
    const firstDay = salesForecasts[0].predicted_revenue;
    const lastDay = salesForecasts[salesForecasts.length - 1].predicted_revenue;
    
    return ((lastDay - firstDay) / firstDay) * 100;
  };

  const salesTrend = calculateSalesTrend();
  const trendIsPositive = salesTrend >= 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="p-4 md:p-6 bg-gradient-to-br from-card/50 to-background/50 backdrop-blur-xl border border-primary/10">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          AI-Powered Predictions
        </h2>
        
        <div className="w-full sm:w-auto overflow-x-auto pb-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="sales" className="flex items-center whitespace-nowrap">
                <BarChart3 className="h-4 w-4 mr-2" />
                Sales Forecast
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center whitespace-nowrap">
                <Package className="h-4 w-4 mr-2" />
                Inventory
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="sales" className="mt-0">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {salesForecasts.length > 0 && (
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">
                    {forecastDays}-Day Forecast
                  </h3>
                  <Badge variant={trendIsPositive ? "success" : "destructive"} className="flex items-center">
                    {trendIsPositive ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                    {Math.abs(salesTrend).toFixed(1)}%
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={forecastDays === 7 ? "default" : "outline"} 
                size="sm"
                onClick={() => setForecastDays(7)}
                disabled={isLoadingSales}
              >
                7 Days
              </Button>
              <Button 
                variant={forecastDays === 14 ? "default" : "outline"} 
                size="sm"
                onClick={() => setForecastDays(14)}
                disabled={isLoadingSales}
              >
                14 Days
              </Button>
              <Button 
                variant={forecastDays === 30 ? "default" : "outline"} 
                size="sm"
                onClick={() => setForecastDays(30)}
                disabled={isLoadingSales}
              >
                30 Days
              </Button>
            </div>
          </div>

          {isLoadingSales ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading AI predictions...</span>
            </div>
          ) : salesForecasts.length > 0 ? (
            <div>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={salesForecasts}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'var(--color-foreground)' }}
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                    />
                    <YAxis 
                      tick={{ fill: 'var(--color-foreground)' }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Predicted Revenue"]}
                      labelFormatter={(date) => {
                        const d = new Date(date);
                        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="predicted_revenue" 
                      stroke="var(--color-primary)" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {salesForecasts.slice(0, 3).map((forecast, index) => (
                  <Card key={index} className="p-4 bg-card/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(forecast.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-2xl font-semibold mt-1">{formatCurrency(forecast.predicted_revenue)}</p>
                      </div>
                      <Badge variant="outline" className="bg-primary/10">
                        {forecast.confidence}% confidence
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium">Key factors:</p>
                      <ul className="text-xs text-muted-foreground mt-1">
                        {forecast.factors.map((factor, idx) => (
                          <li key={idx} className="flex items-center gap-1">• {factor}</li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-2" />
              <h3 className="text-lg font-medium">No forecast data available</h3>
              <p className="text-muted-foreground mt-1">
                We couldn't generate predictions at this time. This could be due to insufficient historical data.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="inventory">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Intelligent Inventory Recommendations</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered suggestions to optimize your inventory and prevent stockouts
            </p>
          </div>

          {isLoadingInventory ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Analyzing inventory data...</span>
            </div>
          ) : inventoryRecommendations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-2">Item</th>
                    <th className="text-right px-4 py-2">Current Stock</th>
                    <th className="text-right px-4 py-2">Order Recommendation</th>
                    <th className="text-right px-4 py-2">Days Until Stockout</th>
                    <th className="text-left px-4 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryRecommendations.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="text-right px-4 py-3">
                        <Badge variant={item.current_stock <= 0 ? "destructive" : "outline"} className="font-mono">
                          {item.current_stock}
                        </Badge>
                      </td>
                      <td className="text-right px-4 py-3 font-medium">
                        {item.recommended_order}
                      </td>
                      <td className="text-right px-4 py-3">
                        <Badge 
                          variant={
                            item.days_until_stockout <= 1 ? "destructive" : 
                            item.days_until_stockout <= 3 ? "warning" : "outline"
                          }
                        >
                          {item.days_until_stockout} days
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No inventory recommendations</h3>
              <p className="text-muted-foreground mt-1">
                Your inventory levels appear to be optimal, or we don't have enough data to make recommendations.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default PredictiveAnalytics;
