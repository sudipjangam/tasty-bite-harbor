
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useTheme } from "@/hooks/useTheme";
import { HighchartComponent } from "@/components/ui/highcharts";
import { Options } from "highcharts";

interface RevenueChartProps {
  data: {
    date: string;
    total_revenue: number;
    order_count: number;
    average_order_value: number;
  }[];
}

const RevenueChart = ({ data }: RevenueChartProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const chartData = data
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(item => ({
      date: format(new Date(item.date), 'dd MMM'),
      revenue: Number(item.total_revenue),
      orders: item.order_count,
      average: Number(item.average_order_value),
    }));

  // Theme-aware colors
  const backgroundColor = 'transparent';
  const textColor = isDarkMode ? '#F7FAFC' : '#2D3748';
  const gridColor = isDarkMode ? '#4A5568' : '#E2E8F0';

  const chartOptions: Options = {
    chart: {
      type: 'line' as const,
      backgroundColor: backgroundColor,
      style: {
        fontFamily: 'Inter, sans-serif'
      },
      height: 400
    },
    title: {
      text: null
    },
    xAxis: {
      categories: chartData.map(item => item.date),
      labels: {
        style: {
          color: textColor
        }
      },
      lineColor: gridColor,
      tickColor: gridColor
    },
    yAxis: [
      {
        // Primary y-axis for revenue
        title: {
          text: 'Revenue (₹)',
          style: {
            color: '#2D3748'
          }
        },
        labels: {
          format: '₹{value}',
          style: {
            color: '#2D3748'
          }
        },
        gridLineColor: gridColor
      },
      {
        // Secondary y-axis for orders
        title: {
          text: 'Orders',
          style: {
            color: '#48BB78'
          }
        },
        labels: {
          style: {
            color: '#48BB78'
          }
        },
        opposite: true,
        gridLineColor: gridColor
      },
      {
        // Third y-axis for average order value
        title: {
          text: 'Avg Order Value (₹)',
          style: {
            color: '#F6AD55'
          }
        },
        labels: {
          format: '₹{value}',
          style: {
            color: '#F6AD55'
          }
        },
        opposite: true,
        gridLineColor: gridColor
      }
    ],
    legend: {
      enabled: true,
      itemStyle: {
        color: textColor
      }
    },
    credits: {
      enabled: false
    },
    tooltip: {
      shared: true,
      backgroundColor: isDarkMode ? '#2D3748' : '#FFFFFF',
      borderColor: isDarkMode ? '#4A5568' : '#E2E8F0',
      style: {
        color: textColor
      }
    },
    series: [
      {
        type: 'line' as const,
        name: 'Revenue',
        color: '#2D3748',
        data: chartData.map(item => item.revenue),
        tooltip: {
          valuePrefix: '₹'
        },
        lineWidth: 3,
        marker: {
          radius: 3,
          lineWidth: 2,
          lineColor: '#2C5282',
          fillColor: '#2D3748'
        }
      },
      {
        type: 'line' as const,
        name: 'Orders',
        color: '#48BB78',
        data: chartData.map(item => item.orders),
        yAxis: 1,
        lineWidth: 2,
        marker: {
          radius: 3,
          lineWidth: 2,
          lineColor: '#276749',
          fillColor: '#48BB78'
        }
      },
      {
        type: 'line' as const,
        name: 'Avg Order Value',
        color: '#F6AD55',
        data: chartData.map(item => item.average),
        yAxis: 2,
        lineWidth: 2,
        tooltip: {
          valuePrefix: '₹'
        },
        marker: {
          radius: 3,
          lineWidth: 2,
          lineColor: '#C05621',
          fillColor: '#F6AD55'
        }
      }
    ]
  };

  return (
    <Card className="col-span-4 shadow-card hover:shadow-card-hover transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Revenue Trends Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] chart-container">
          <HighchartComponent options={chartOptions} />
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
