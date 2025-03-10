
import { useRef, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useTheme } from "@/hooks/useTheme";

interface RevenueHighchartProps {
  data: {
    date: string;
    total_revenue: number;
    order_count: number;
    average_order_value: number;
  }[];
}

const RevenueHighchart = ({ data }: RevenueHighchartProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);
  const [chartType, setChartType] = useState<'line' | 'column'>('line');
  
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const dates = sortedData.map(item => format(new Date(item.date), 'dd MMM'));
  const revenues = sortedData.map(item => Number(item.total_revenue));
  const orders = sortedData.map(item => item.order_count);
  const averages = sortedData.map(item => Number(item.average_order_value));

  // Theme-aware colors
  const backgroundColor = isDarkMode ? '#1e293b' : '#ffffff';
  const textColor = isDarkMode ? '#e2e8f0' : '#334155';
  const gridColor = isDarkMode ? '#334155' : '#e2e8f0';
  
  const options: Highcharts.Options = {
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
      valuePrefix: '{series.name}' === 'Revenue' ? '₹' : '',
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
      },
      {
        name: 'Orders',
        type: chartType,
        yAxis: 1,
        data: orders,
        color: '#22c55e'
      },
      {
        name: 'Avg Order Value',
        type: chartType,
        yAxis: 0,
        data: averages,
        color: '#f59e0b',
        tooltip: {
          valuePrefix: '₹'
        }
      }
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
          <button 
            className={`px-3 py-1 rounded text-xs font-medium ${chartType === 'line' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
            onClick={() => setChartType('line')}
          >
            Line
          </button>
          <button 
            className={`px-3 py-1 rounded text-xs font-medium ${chartType === 'column' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
            onClick={() => setChartType('column')}
          >
            Column
          </button>
        </div>
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

export default RevenueHighchart;
