
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HighchartComponent } from "@/components/ui/highcharts";
import { Options } from "highcharts";
import { Calendar, TrendingUp, BarChart3, PieChart } from "lucide-react";

interface ChartData {
  name: string;
  data: number[];
  categories?: string[];
}

interface InteractiveChartProps {
  title: string;
  data: ChartData[];
  chartType?: 'line' | 'bar' | 'area' | 'pie';
  timeRanges?: { label: string; value: string }[];
  onTimeRangeChange?: (range: string) => void;
  height?: number;
  showControls?: boolean;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  title,
  data,
  chartType = 'line',
  timeRanges = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
    { label: '1 Year', value: '1y' }
  ],
  onTimeRangeChange,
  height = 400,
  showControls = true
}) => {
  const [currentChartType, setCurrentChartType] = useState(chartType);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRanges[1]?.value || '30d');

  const handleTimeRangeChange = (value: string) => {
    setSelectedTimeRange(value);
    onTimeRangeChange?.(value);
  };

  const getChartOptions = (): Options => {
    const baseOptions: Options = {
      chart: {
        type: currentChartType as any,
        height: height,
        backgroundColor: 'transparent',
      },
      title: {
        text: null
      },
      xAxis: {
        categories: data[0]?.categories || [],
        labels: {
          style: {
            color: '#64748b'
          }
        }
      },
      yAxis: {
        title: {
          text: null
        },
        labels: {
          style: {
            color: '#64748b'
          }
        },
        gridLineColor: '#e2e8f0'
      },
      legend: {
        enabled: data.length > 1,
        itemStyle: {
          color: '#64748b'
        }
      },
      credits: {
        enabled: false
      },
      tooltip: {
        shared: true,
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        style: {
          color: '#1e293b'
        }
      },
      plotOptions: {
        series: {
          animation: {
            duration: 1000
          }
        },
        line: {
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: true
              }
            }
          }
        },
        area: {
          fillOpacity: 0.3
        }
      },
      series: data.map((series, index) => ({
        name: series.name,
        data: series.data,
        type: currentChartType as any,
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
      }))
    };

    if (currentChartType === 'pie') {
      baseOptions.series = [{
        type: 'pie',
        name: data[0]?.name || 'Data',
        data: data[0]?.data.map((value, index) => ({
          name: data[0]?.categories?.[index] || `Item ${index + 1}`,
          y: value
        })) || []
      }];
    }

    return baseOptions;
  };

  const chartTypeOptions = [
    { value: 'line', label: 'Line', icon: TrendingUp },
    { value: 'bar', label: 'Bar', icon: BarChart3 },
    { value: 'area', label: 'Area', icon: TrendingUp },
    { value: 'pie', label: 'Pie', icon: PieChart }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {showControls && (
            <div className="flex items-center space-x-2">
              {/* Chart Type Selector */}
              <div className="flex border rounded-lg overflow-hidden">
                {chartTypeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={currentChartType === option.value ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCurrentChartType(option.value as any)}
                    className="rounded-none border-0"
                  >
                    <option.icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
              
              {/* Time Range Selector */}
              <Select value={selectedTimeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-32">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <HighchartComponent options={getChartOptions()} />
      </CardContent>
    </Card>
  );
};
