
import { useState, useRef, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "@/hooks/useTheme";
import { Calendar, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format, subDays, subMonths, subYears, isAfter } from 'date-fns';

interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

interface TimeSeriesAnalysisProps {
  data: TimeSeriesDataPoint[];
  title: string;
  description?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  color?: string;
  height?: number;
}

type TimePeriod = '1d' | '7d' | '30d' | '90d' | '1y' | 'all';

const TimeSeriesAnalysis = ({ 
  data, 
  title, 
  description = '', 
  valuePrefix = '₹', 
  valueSuffix = '',
  color = '#8b5cf6',
  height
}: TimeSeriesAnalysisProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [trend, setTrend] = useState<{ percentage: number; isPositive: boolean }>({ percentage: 0, isPositive: true });

  // Function to filter data based on time period
  const filterDataByTimePeriod = (data: TimeSeriesDataPoint[], period: TimePeriod): TimeSeriesDataPoint[] => {
    if (period === 'all' || !data.length) return data;
    
    const today = new Date();
    let cutoffDate: Date;
    
    switch (period) {
      case '1d':
        cutoffDate = subDays(today, 1);
        break;
      case '7d':
        cutoffDate = subDays(today, 7);
        break;
      case '30d':
        cutoffDate = subDays(today, 30);
        break;
      case '90d':
        cutoffDate = subDays(today, 90);
        break;
      case '1y':
        cutoffDate = subYears(today, 1);
        break;
      default:
        cutoffDate = subDays(today, 30);
    }
    
    return data.filter(item => isAfter(new Date(item.date), cutoffDate));
  };

  // Calculate trend between first and last points
  useEffect(() => {
    const filteredData = filterDataByTimePeriod(data, timePeriod);
    if (filteredData.length >= 2) {
      const firstValue = filteredData[0].value;
      const lastValue = filteredData[filteredData.length - 1].value;
      const difference = lastValue - firstValue;
      const percentageChange = firstValue !== 0 
        ? (difference / firstValue) * 100 
        : 0;
      
      setTrend({
        percentage: Math.abs(parseFloat(percentageChange.toFixed(1))),
        isPositive: difference >= 0
      });
    }
  }, [data, timePeriod]);

  const filteredData = filterDataByTimePeriod(data, timePeriod);

  // Theme-aware colors
  const backgroundColor = isDarkMode ? '#1e293b' : '#ffffff';
  const textColor = isDarkMode ? '#e2e8f0' : '#334155';
  const gridColor = isDarkMode ? '#334155' : '#e2e8f0';
  
  const options: Highcharts.Options = {
    chart: {
      type: 'area',
      backgroundColor: backgroundColor,
      style: {
        fontFamily: 'Inter, sans-serif'
      },
      zooming: {
        type: 'x'
      },
      height: height // Apply the height property if provided
    },
    title: {
      text: undefined
    },
    xAxis: {
      type: 'category',
      categories: filteredData.map(item => {
        const date = new Date(item.date);
        return timePeriod === '1d' 
          ? format(date, 'HH:mm') 
          : timePeriod === '7d' 
            ? format(date, 'EEE') 
            : format(date, 'MMM dd');
      }),
      labels: {
        style: {
          color: textColor,
          fontSize: '10px'
        },
        rotation: timePeriod === '30d' || timePeriod === '90d' || timePeriod === '1y' ? -45 : 0
      },
      tickmarkPlacement: 'on',
      gridLineColor: gridColor,
      lineColor: gridColor
    },
    yAxis: {
      title: {
        text: undefined
      },
      labels: {
        style: {
          color: textColor
        },
        formatter: function() {
          return `${valuePrefix}${this.value.toLocaleString()}${valueSuffix}`;
        }
      },
      gridLineColor: gridColor,
      min: 0
    },
    tooltip: {
      shared: true,
      useHTML: true,
      headerFormat: '<small>{point.key}</small><table>',
      pointFormat: `<tr><td style="color: ${color}"><b>{point.y}</b> ${valueSuffix}</td></tr>`,
      valuePrefix: valuePrefix,
      footerFormat: '</table>',
      backgroundColor: isDarkMode ? '#334155' : '#ffffff',
      borderColor: gridColor,
      style: {
        color: textColor
      }
    },
    plotOptions: {
      area: {
        fillColor: {
          linearGradient: {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 1
          },
          stops: [
            [0, Highcharts.color(color).setOpacity(0.7).get('rgba') as string],
            [1, Highcharts.color(color).setOpacity(0.1).get('rgba') as string]
          ]
        },
        marker: {
          enabled: filteredData.length < 20,
          radius: 3
        },
        lineWidth: 2,
        states: {
          hover: {
            lineWidth: 3
          }
        },
        threshold: null
      }
    },
    legend: {
      enabled: false
    },
    credits: {
      enabled: false
    },
    series: [{
      type: 'area',
      name: title,
      data: filteredData.map(item => item.value),
      color: color
    }]
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            <div className={`flex items-center text-xs font-medium px-2 py-1 rounded ${
              trend.isPositive 
                ? 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300' 
                : 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {trend.isPositive 
                ? <ArrowUpRight className="h-3 w-3 mr-1" /> 
                : <ArrowDownRight className="h-3 w-3 mr-1" />
              }
              {trend.percentage}%
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center mr-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '1d' ? 'bg-primary text-white' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('1d')}
              >
                1D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '7d' ? 'bg-primary text-white' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('7d')}
              >
                7D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '30d' ? 'bg-primary text-white' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('30d')}
              >
                30D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '90d' ? 'bg-primary text-white' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('90d')}
              >
                90D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '1y' ? 'bg-primary text-white' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('1y')}
              >
                1Y
              </button>
            </div>
            <Calendar className="h-5 w-5 text-gray-500" />
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <HighchartsReact
          highcharts={Highcharts}
          options={options}
          ref={chartComponentRef}
        />
        {filteredData.length === 0 && (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No data available for selected time period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeSeriesAnalysis;
