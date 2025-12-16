
import { useRef, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays, subMonths, subYears, startOfDay, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";
import { BarChart3, TrendingUp } from "lucide-react";
import { Options, SeriesColumnOptions, SeriesLineOptions } from "highcharts";

interface RevenueHighchartProps {
  data: {
    date: string;
    total_revenue: number;
    order_count: number;
    average_order_value: number;
  }[];
}

// Time period options
type TimePeriod = '1d' | '7d' | '30d' | '90d' | '1y' | 'all';

const RevenueHighchart = ({ data }: RevenueHighchartProps) => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isDarkMode = theme === 'dark';
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);
  const [chartType, setChartType] = useState<'line' | 'column'>('line');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  
  // Filter data based on selected time period
  const filterDataByTimePeriod = (data: RevenueHighchartProps['data'], period: TimePeriod) => {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '1d':
        startDate = startOfDay(now);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      case '1y':
        startDate = subYears(now, 1);
        break;
      case 'all':
      default:
        return data;
    }
    
    return data.filter(item => new Date(item.date) >= startDate);
  };
  
  const filteredData = filterDataByTimePeriod(data, timePeriod);
  const sortedData = [...filteredData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const dates = sortedData.map(item => format(new Date(item.date), 'dd MMM'));
  const revenues = sortedData.map(item => Number(item.total_revenue));
  const orders = sortedData.map(item => item.order_count);
  const averages = sortedData.map(item => Number(item.average_order_value));

  // Theme-aware colors with modern gradients
  const backgroundColor = isDarkMode ? '#1e293b' : '#ffffff';
  const textColor = isDarkMode ? '#e2e8f0' : '#334155';
  const gridColor = isDarkMode ? '#334155' : '#e2e8f0';
  
  // Modern vibrant color palette
  const colors = {
    revenue: {
      main: isDarkMode ? '#a78bfa' : '#8b5cf6',
      gradient: isDarkMode 
        ? [{ offset: 0, color: 'rgba(167, 139, 250, 0.4)' }, { offset: 1, color: 'rgba(167, 139, 250, 0.05)' }]
        : [{ offset: 0, color: 'rgba(139, 92, 246, 0.4)' }, { offset: 1, color: 'rgba(139, 92, 246, 0.05)' }]
    },
    orders: {
      main: isDarkMode ? '#34d399' : '#10b981',
      gradient: isDarkMode
        ? [{ offset: 0, color: 'rgba(52, 211, 153, 0.4)' }, { offset: 1, color: 'rgba(52, 211, 153, 0.05)' }]
        : [{ offset: 0, color: 'rgba(16, 185, 129, 0.4)' }, { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }]
    },
    average: {
      main: isDarkMode ? '#fbbf24' : '#f59e0b',
      gradient: isDarkMode
        ? [{ offset: 0, color: 'rgba(251, 191, 36, 0.4)' }, { offset: 1, color: 'rgba(251, 191, 36, 0.05)' }]
        : [{ offset: 0, color: 'rgba(245, 158, 11, 0.4)' }, { offset: 1, color: 'rgba(245, 158, 11, 0.05)' }]
    }
  };
  
  const options: Options = {
    chart: {
      type: chartType === 'line' ? 'areaspline' : 'column',
      backgroundColor: backgroundColor,
      style: {
        fontFamily: 'Inter, sans-serif'
      },
      height: isMobile ? 280 : 400
    },
    title: {
      text: undefined
    },
    xAxis: {
      categories: dates,
      labels: {
        style: {
          color: textColor,
          fontSize: '11px'
        }
      },
      gridLineColor: gridColor,
      lineColor: gridColor,
      tickColor: gridColor
    },
    yAxis: [
      {
        title: {
          text: 'Revenue',
          style: {
            color: colors.revenue.main,
            fontWeight: '600'
          }
        },
        labels: {
          format: '₹{value}',
          style: {
            color: textColor
          }
        },
        gridLineColor: gridColor,
        gridLineDashStyle: 'Dash'
      },
      {
        title: {
          text: 'Orders',
          style: {
            color: colors.orders.main,
            fontWeight: '600'
          }
        },
        labels: {
          style: {
            color: textColor
          }
        },
        opposite: true,
        gridLineWidth: 0
      }
    ],
    tooltip: {
      shared: true,
      useHTML: true,
      headerFormat: '<div style="font-size:12px;font-weight:600;margin-bottom:8px">{point.key}</div><table>',
      pointFormat: '<tr><td style="color:{series.color};padding:4px"><b>{series.name}:</b></td>' +
                    '<td style="text-align:right;padding:4px;font-weight:600">{point.y}</td></tr>',
      footerFormat: '</table>',
      backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
      borderRadius: 12,
      shadow: true,
      style: {
        color: textColor
      }
    },
    legend: {
      itemStyle: {
        color: textColor,
        fontWeight: '500'
      },
      itemHoverStyle: {
        color: colors.revenue.main
      }
    },
    credits: {
      enabled: false
    },
    responsive: {
      rules: [{
        condition: {
          maxWidth: 500
        },
        chartOptions: {
          legend: {
            align: 'center',
            verticalAlign: 'bottom',
            layout: 'horizontal'
          },
          yAxis: [{
            title: { text: null }
          }, {
            title: { text: null }
          }]
        }
      }]
    },
    plotOptions: {
      series: {
        animation: {
          duration: 1000
        },
        marker: {
          enabled: false,
          symbol: 'circle',
          radius: 4,
          states: {
            hover: {
              enabled: true,
              radiusPlus: 2
            }
          }
        }
      },
      areaspline: {
        fillOpacity: 0.3,
        lineWidth: 3
      },
      column: {
        borderRadius: 6,
        borderWidth: 0
      }
    },
    series: [
      {
        name: 'Revenue',
        type: chartType === 'line' ? 'areaspline' : 'column',
        yAxis: 0,
        data: revenues,
        color: colors.revenue.main,
        fillColor: chartType === 'line' ? {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: colors.revenue.gradient.map(g => [g.offset, g.color] as [number, string])
        } : undefined,
        tooltip: {
          valuePrefix: '₹'
        }
      } as SeriesLineOptions | SeriesColumnOptions,
      {
        name: 'Orders',
        type: chartType === 'line' ? 'areaspline' : 'column',
        yAxis: 1,
        data: orders,
        color: colors.orders.main,
        fillColor: chartType === 'line' ? {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: colors.orders.gradient.map(g => [g.offset, g.color] as [number, string])
        } : undefined
      } as SeriesLineOptions | SeriesColumnOptions,
      {
        name: 'Avg Order',
        type: chartType === 'line' ? 'areaspline' : 'column',
        yAxis: 0,
        data: averages,
        color: colors.average.main,
        fillColor: chartType === 'line' ? {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: colors.average.gradient.map(g => [g.offset, g.color] as [number, string])
        } : undefined,
        tooltip: {
          valuePrefix: '₹'
        }
      } as SeriesLineOptions | SeriesColumnOptions
    ]
  };

  const toggleChartType = () => {
    setChartType(prev => prev === 'line' ? 'column' : 'line');
  };

  return (
    <Card className="col-span-4 shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Revenue Trends Over Time</CardTitle>
        <div className="flex items-center space-x-2">
          {/* Time period selector */}
          <div className="flex items-center mr-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button 
              className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '1d' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setTimePeriod('1d')}
            >
              1D
            </button>
            <button 
              className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '7d' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setTimePeriod('7d')}
            >
              1W
            </button>
            <button 
              className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '30d' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setTimePeriod('30d')}
            >
              1M
            </button>
            <button 
              className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '90d' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setTimePeriod('90d')}
            >
              3M
            </button>
            <button 
              className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '1y' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setTimePeriod('1y')}
            >
              1Y
            </button>
            <button 
              className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === 'all' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setTimePeriod('all')}
            >
              All
            </button>
          </div>
          
          {/* Chart type toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button 
              className={`p-1 rounded text-xs ${chartType === 'line' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setChartType('line')}
              title="Line Chart"
            >
              <TrendingUp className="h-4 w-4" />
            </button>
            <button 
              className={`p-1 rounded text-xs ${chartType === 'column' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setChartType('column')}
              title="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No data available for the selected time period
          </div>
        ) : (
          <HighchartsReact
            highcharts={Highcharts}
            options={options}
            ref={chartComponentRef}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueHighchart;
