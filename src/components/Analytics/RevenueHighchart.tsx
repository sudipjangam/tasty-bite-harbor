
import { useRef, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays, subMonths, subYears, startOfDay, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { useTheme } from "@/hooks/useTheme";
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

  // Theme-aware colors
  const backgroundColor = isDarkMode ? '#1e293b' : '#ffffff';
  const textColor = isDarkMode ? '#e2e8f0' : '#334155';
  const gridColor = isDarkMode ? '#334155' : '#e2e8f0';
  
  const options: Options = {
    chart: {
      type: chartType,
      backgroundColor: backgroundColor,
      style: {
        fontFamily: 'Inter, sans-serif'
      },
      height: 400
    },
    title: {
      text: undefined
    },
    xAxis: {
      categories: dates,
      labels: {
        style: {
          color: textColor
        }
      },
      gridLineColor: gridColor,
      lineColor: gridColor
    },
    yAxis: [
      {
        title: {
          text: 'Revenue',
          style: {
            color: textColor
          }
        },
        labels: {
          format: '₹{value}',
          style: {
            color: textColor
          }
        },
        gridLineColor: gridColor
      },
      {
        title: {
          text: 'Orders',
          style: {
            color: textColor
          }
        },
        labels: {
          style: {
            color: textColor
          }
        },
        opposite: true
      }
    ],
    tooltip: {
      shared: true,
      useHTML: true,
      headerFormat: '<small>{point.key}</small><table>',
      pointFormat: '<tr><td style="color: {series.color}">{series.name}: </td>' +
                    '<td style="text-align: right"><b>{point.y}</b></td></tr>',
      footerFormat: '</table>',
      backgroundColor: isDarkMode ? '#334155' : '#ffffff',
      borderColor: gridColor,
      style: {
        color: textColor
      }
    },
    legend: {
      itemStyle: {
        color: textColor
      }
    },
    credits: {
      enabled: false
    },
    plotOptions: {
      series: {
        animation: {
          duration: 1000
        },
        marker: {
          enabled: false
        }
      }
    },
    series: [
      {
        name: 'Revenue',
        type: chartType,
        yAxis: 0,
        data: revenues,
        color: '#8b5cf6',
        tooltip: {
          valuePrefix: '₹'
        }
      } as SeriesLineOptions | SeriesColumnOptions,
      {
        name: 'Orders',
        type: chartType,
        yAxis: 1,
        data: orders,
        color: '#22c55e'
      } as SeriesLineOptions | SeriesColumnOptions,
      {
        name: 'Avg Order Value',
        type: chartType,
        yAxis: 0,
        data: averages,
        color: '#f59e0b',
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
