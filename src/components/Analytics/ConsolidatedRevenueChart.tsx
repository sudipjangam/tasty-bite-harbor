import { Card } from "@/components/ui/card";
import { HighchartComponent } from "@/components/ui/highcharts";
import { Options } from "highcharts";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { Building2, UtensilsCrossed, TrendingUp } from "lucide-react";

interface ConsolidatedRevenueChartProps {
  data: {
    dailyRevenue: Array<{
      date: string;
      restaurantRevenue: number;
      hotelRevenue: number;
      totalRevenue: number;
    }>;
    totalRestaurantRevenue: number;
    totalHotelRevenue: number;
    grandTotal: number;
    restaurantPercentage: number;
    hotelPercentage: number;
  };
}

export const ConsolidatedRevenueChart = ({ data }: ConsolidatedRevenueChartProps) => {
  const { formatCurrency, symbol } = useCurrency();

  const chartOptions: Options = {
    chart: {
      type: 'area',
      backgroundColor: 'transparent',
      height: 400,
    },
    title: {
      text: '',
    },
    xAxis: {
      categories: data.dailyRevenue.map(d => format(new Date(d.date), 'MMM dd')),
      labels: {
        style: {
          color: '#64748b',
        },
      },
      gridLineWidth: 0,
    },
    yAxis: {
      title: {
        text: `Revenue (${symbol})`,
        style: {
          color: '#64748b',
        },
      },
      labels: {
        style: {
          color: '#64748b',
        },
        formatter: function() {
          return symbol + (this.value as number).toLocaleString();
        }
      },
      gridLineWidth: 1,
      gridLineColor: '#e2e8f0',
    },
    tooltip: {
      shared: true,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadow: true,
      formatter: function() {
        const context = this as any;
        let tooltip = `<b>${context.x}</b><br/>`;
        if (context.points) {
          context.points.forEach((point: any) => {
            tooltip += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${symbol}${(point.y as number).toLocaleString()}</b><br/>`;
          });
        }
        return tooltip;
      }
    },
    plotOptions: {
      area: {
        stacking: 'normal',
        lineWidth: 2,
        marker: {
          enabled: false,
          states: {
            hover: {
              enabled: true,
              radius: 5
            }
          }
        },
        fillOpacity: 0.5,
      }
    },
    legend: {
      align: 'center',
      verticalAlign: 'top',
      floating: false,
      itemStyle: {
        color: '#64748b',
        fontWeight: '500'
      }
    },
    credits: {
      enabled: false
    },
    series: [
      {
        name: 'Restaurant Revenue',
        type: 'area',
        data: data.dailyRevenue.map(d => d.restaurantRevenue),
        color: '#10b981',
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(16, 185, 129, 0.5)'],
            [1, 'rgba(16, 185, 129, 0.1)']
          ]
        }
      },
      {
        name: 'Hotel Revenue',
        type: 'area',
        data: data.dailyRevenue.map(d => d.hotelRevenue),
        color: '#3b82f6',
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(59, 130, 246, 0.5)'],
            [1, 'rgba(59, 130, 246, 0.1)']
          ]
        }
      }
    ]
  };

  return (
    <Card className="p-6 border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Consolidated Revenue Trend
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Last 30 days - Restaurant + Hotel combined
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(data.grandTotal)}</p>
          </div>
        </div>

        {/* Revenue breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <UtensilsCrossed className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Restaurant</span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {formatCurrency(data.totalRestaurantRevenue)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
              {data.restaurantPercentage.toFixed(1)}% of total
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Hotel</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(data.totalHotelRevenue)}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
              {data.hotelPercentage.toFixed(1)}% of total
            </p>
          </div>
        </div>
      </div>

      <HighchartComponent options={chartOptions} />
    </Card>
  );
};
