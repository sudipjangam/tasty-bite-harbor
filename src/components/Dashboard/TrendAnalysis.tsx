
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HighchartComponent } from "@/components/ui/highcharts";
import { Options } from "highcharts";
import { TrendingUp, TrendingDown, Activity, Target } from "lucide-react";

interface TrendData {
  historical: number[];
  forecast: number[];
  categories: string[];
}

interface TrendInsight {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  description: string;
}

interface TrendAnalysisProps {
  title: string;
  data: TrendData;
  insights: TrendInsight[];
  loading?: boolean;
}

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  title,
  data,
  insights,
  loading = false
}) => {
  const getChartOptions = (): Options => {
    return {
      chart: {
        type: 'line',
        height: 300,
        backgroundColor: 'transparent',
      },
      title: {
        text: null
      },
      xAxis: {
        categories: data.categories,
        labels: {
          style: {
            color: '#64748b'
          }
        },
        plotLines: [{
          color: '#e2e8f0',
          dashStyle: 'Dash',
          width: 2,
          value: data.historical.length - 1,
          label: {
            text: 'Forecast',
            style: {
              color: '#64748b'
            }
          }
        }]
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
        enabled: true,
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
        borderColor: '#e2e8f0'
      },
      plotOptions: {
        line: {
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: true
              }
            }
          }
        }
      },
      series: [
        {
          name: 'Historical',
          data: data.historical,
          type: 'line',
          color: '#3b82f6',
          zIndex: 2
        },
        {
          name: 'Forecast',
          data: [...Array(data.historical.length - 1).fill(null), ...data.forecast],
          type: 'line',
          color: '#10b981',
          dashStyle: 'Dash',
          zIndex: 1
        }
      ]
    };
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'bg-green-100 text-green-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <HighchartComponent options={getChartOptions()} />
        
        {/* Insights */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Key Insights</h4>
          <div className="grid gap-3">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {getTrendIcon(insight.trend)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium text-sm">{insight.title}</h5>
                    <Badge variant="outline" className={getTrendColor(insight.trend)}>
                      {insight.value}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {insight.confidence}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
