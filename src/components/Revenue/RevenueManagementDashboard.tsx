
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRevenueManagement } from "@/hooks/useRevenueManagement";
import { TrendingUp, TrendingDown, DollarSign, Users, Bed, Target } from "lucide-react";
import { HighchartComponent } from "@/components/ui/highcharts";
import { Options } from "highcharts";

const RevenueManagementDashboard = () => {
  const { 
    revenueMetrics, 
    competitorPricing, 
    metricsComparison, 
    isLoadingMetrics 
  } = useRevenueManagement();

  const formatCurrency = (value: number) => `₹${value.toFixed(0)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getChangeIcon = (change: number) => {
    return change >= 0 ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  // Revenue chart data
  const revenueChartOptions: Options = {
    chart: {
      type: 'line',
      height: 400,
    },
    title: {
      text: 'Revenue Trends (Last 30 Days)',
    },
    xAxis: {
      categories: revenueMetrics.slice(0, 30).reverse().map(m => 
        new Date(m.date).toLocaleDateString()
      ),
    },
    yAxis: {
      title: {
        text: 'Revenue (₹)',
      },
    },
    series: [
      {
        type: 'line',
        name: 'Total Revenue',
        data: revenueMetrics.slice(0, 30).reverse().map(m => m.total_revenue),
        color: '#3B82F6',
      },
      {
        type: 'line',
        name: 'Room Revenue',
        data: revenueMetrics.slice(0, 30).reverse().map(m => m.room_revenue),
        color: '#10B981',
      },
      {
        type: 'line',
        name: 'F&B Revenue',
        data: revenueMetrics.slice(0, 30).reverse().map(m => m.f_and_b_revenue),
        color: '#F59E0B',
      },
    ],
    credits: {
      enabled: false,
    },
  };

  // Occupancy chart
  const occupancyChartOptions: Options = {
    chart: {
      type: 'column',
      height: 300,
    },
    title: {
      text: 'Occupancy Rate Trends',
    },
    xAxis: {
      categories: revenueMetrics.slice(0, 14).reverse().map(m => 
        new Date(m.date).toLocaleDateString()
      ),
    },
    yAxis: {
      title: {
        text: 'Occupancy (%)',
      },
      max: 100,
    },
    series: [
      {
        type: 'column',
        name: 'Occupancy Rate',
        data: revenueMetrics.slice(0, 14).reverse().map(m => m.occupancy_rate),
        color: '#8B5CF6',
      },
    ],
    credits: {
      enabled: false,
    },
  };

  if (isLoadingMetrics) {
    return <div>Loading revenue data...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Revenue Management Dashboard</h2>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(metricsComparison.occupancy.current)}
            </div>
            <div className={`text-xs flex items-center space-x-1 ${getChangeColor(metricsComparison.occupancy.change)}`}>
              {getChangeIcon(metricsComparison.occupancy.change)}
              <span>
                {metricsComparison.occupancy.change >= 0 ? '+' : ''}
                {formatPercentage(metricsComparison.occupancy.change)} from yesterday
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Daily Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metricsComparison.adr.current)}
            </div>
            <div className={`text-xs flex items-center space-x-1 ${getChangeColor(metricsComparison.adr.change)}`}>
              {getChangeIcon(metricsComparison.adr.change)}
              <span>
                {metricsComparison.adr.change >= 0 ? '+' : ''}
                {formatCurrency(metricsComparison.adr.change)} from yesterday
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RevPAR</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metricsComparison.revpar.current)}
            </div>
            <div className={`text-xs flex items-center space-x-1 ${getChangeColor(metricsComparison.revpar.change)}`}>
              {getChangeIcon(metricsComparison.revpar.change)}
              <span>
                {metricsComparison.revpar.change >= 0 ? '+' : ''}
                {formatCurrency(metricsComparison.revpar.change)} from yesterday
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metricsComparison.revenue.current)}
            </div>
            <div className={`text-xs flex items-center space-x-1 ${getChangeColor(metricsComparison.revenue.change)}`}>
              {getChangeIcon(metricsComparison.revenue.change)}
              <span>
                {metricsComparison.revenue.change >= 0 ? '+' : ''}
                {formatCurrency(metricsComparison.revenue.change)} from yesterday
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <HighchartComponent options={revenueChartOptions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Occupancy Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <HighchartComponent options={occupancyChartOptions} />
          </CardContent>
        </Card>
      </div>

      {/* Competitor Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Competitor Pricing Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {competitorPricing.slice(0, 5).map((competitor, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{competitor.competitor_name}</div>
                  <div className="text-sm text-gray-500">
                    {competitor.room_type || 'Standard Room'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {formatCurrency(competitor.price)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(competitor.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueManagementDashboard;
