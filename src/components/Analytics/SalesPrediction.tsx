
import { useRef, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "@/hooks/useTheme";
import { TrendingUp } from "lucide-react";

interface SalesPredictionData {
  date: string;
  actual: number | null;
  predicted: number | null;
}

interface SalesPredictionProps {
  data: SalesPredictionData[];
}

type TimePeriod = '7d' | '14d' | '30d' | '90d';

const SalesPrediction = ({ data }: SalesPredictionProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('14d');

  // Filter data based on selected time period
  const filterDataByTimePeriod = (data: SalesPredictionData[], period: TimePeriod) => {
    const days = parseInt(period);
    if (days >= data.length) return data;
    return data.slice(data.length - days);
  };

  const filteredData = filterDataByTimePeriod(data, timePeriod);

  // Theme-aware colors
  const backgroundColor = isDarkMode ? '#1e293b' : '#ffffff';
  const textColor = isDarkMode ? '#e2e8f0' : '#334155';
  const gridColor = isDarkMode ? '#334155' : '#e2e8f0';
  
  const options: Highcharts.Options = {
    chart: {
      type: 'line',
      backgroundColor: backgroundColor,
      style: {
        fontFamily: 'Inter, sans-serif'
      }
    },
    title: {
      text: undefined
    },
    xAxis: {
      categories: filteredData.map(item => item.date),
      labels: {
        style: {
          color: textColor
        }
      },
      gridLineColor: gridColor,
      lineColor: gridColor
    },
    yAxis: {
      title: {
        text: 'Revenue (₹)',
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
    tooltip: {
      shared: true,
      useHTML: true,
      headerFormat: '<small>{point.key}</small><table>',
      pointFormat: '<tr><td style="color: {series.color}">{series.name}: </td>' +
                    '<td style="text-align: right"><b>₹{point.y}</b></td></tr>',
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
        }
      },
      line: {
        marker: {
          enabled: false
        }
      }
    },
    series: [
      {
        name: 'Actual Sales',
        type: 'line',
        data: filteredData.map(item => item.actual),
        color: '#8b5cf6',
        zIndex: 2
      },
      {
        name: 'Predicted Sales',
        type: 'line',
        data: filteredData.map(item => item.predicted),
        color: '#22c55e',
        dashStyle: 'ShortDash',
        zIndex: 1
      }
    ]
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Sales Forecast</CardTitle>
          <div className="flex items-center">
            <div className="flex items-center mr-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '7d' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('7d')}
              >
                7D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '14d' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('14d')}
              >
                14D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '30d' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('30d')}
              >
                30D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '90d' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('90d')}
              >
                90D
              </button>
            </div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
        </div>
        <CardDescription>Projected sales for the next period</CardDescription>
      </CardHeader>
      <CardContent>
        <HighchartsReact
          highcharts={Highcharts}
          options={options}
          ref={chartComponentRef}
        />
      </CardContent>
    </Card>
  );
};

export default SalesPrediction;
