
import { useRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "@/hooks/useTheme";

interface SalesPredictionData {
  date: string;
  actual: number;
  predicted: number;
}

interface SalesPredictionProps {
  data: SalesPredictionData[];
}

const SalesPrediction = ({ data }: SalesPredictionProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);

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
      categories: data.map(item => item.date),
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
        data: data.map(item => item.actual),
        color: '#8b5cf6',
        zIndex: 2
      },
      {
        name: 'Predicted Sales',
        type: 'line',
        data: data.map(item => item.predicted),
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
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
        <CardDescription>Projected sales for the next 7 days</CardDescription>
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
