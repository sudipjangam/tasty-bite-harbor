import { useRef, useState, useEffect } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useTheme } from "@/hooks/useTheme";
import { TrendingUp, Sparkles } from "lucide-react";
import { Options, SeriesLineOptions } from "highcharts";

interface SalesPredictionData {
  date: string;
  actual: number | null;
  predicted: number | null;
}

interface SalesPredictionProps {
  data: SalesPredictionData[];
}

type TimePeriod = "7d" | "14d" | "30d" | "90d";

const SalesPrediction = ({ data }: SalesPredictionProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("14d");

  // Calculate trend
  const calculateTrend = () => {
    // Find last actual and last predicted
    const lastActual =
      [...data].reverse().find((d) => d.actual !== null)?.actual || 0;
    const lastPredicted =
      [...data].reverse().find((d) => d.predicted !== null)?.predicted || 0;

    if (lastActual > 0 && lastPredicted > 0) {
      const diff = lastPredicted - lastActual;
      const percent = (diff / lastActual) * 100;
      return percent;
    }
    return 0;
  };

  const trend = calculateTrend();

  // Filter data based on selected time period
  const filterDataByTimePeriod = (
    data: SalesPredictionData[],
    period: TimePeriod
  ) => {
    const days = parseInt(period);
    // If we have enough data, slice it. Otherwise show what we have.
    // Note: The logic in useAnalyticsData specifically returns 14+7 days roughly.
    // We should show the relevant window.
    if (days >= data.length) return data;
    return data.slice(Math.max(0, data.length - days));
  };

  const filteredData = filterDataByTimePeriod(data, timePeriod);

  // Theme-aware colors
  const backgroundColor = isDarkMode ? "#1e293b" : "#ffffff";
  const textColor = isDarkMode ? "#e2e8f0" : "#334155";
  const gridColor = isDarkMode ? "#334155" : "#e2e8f0";

  const options: Options = {
    chart: {
      type: "line",
      backgroundColor: backgroundColor,
      style: {
        fontFamily: "Inter, sans-serif",
      },
    },
    title: {
      text: undefined,
    },
    xAxis: {
      categories: filteredData.map((item) => item.date),
      labels: {
        style: {
          color: textColor,
          fontSize: "11px",
        },
      },
      gridLineColor: gridColor,
      lineColor: gridColor,
    },
    yAxis: {
      title: {
        text: "Revenue (₹)",
        style: {
          color: textColor,
        },
      },
      labels: {
        format: "₹{value}",
        style: {
          color: textColor,
        },
      },
      gridLineColor: gridColor,
    },
    tooltip: {
      shared: true,
      useHTML: true,
      headerFormat: "<small>{point.key}</small><table>",
      pointFormat:
        '<tr><td style="color: {series.color}">{series.name}: </td>' +
        '<td style="text-align: right"><b>₹{point.y}</b></td></tr>',
      footerFormat: "</table>",
      backgroundColor: isDarkMode ? "#334155" : "#ffffff",
      borderColor: gridColor,
      style: {
        color: textColor,
      },
    },
    legend: {
      itemStyle: {
        color: textColor,
      },
    },
    credits: {
      enabled: false,
    },
    plotOptions: {
      series: {
        animation: {
          duration: 1000,
        },
        connectNulls: true, // Connect lines if there are gaps, though we structure data to avoid gaps
      },
      line: {
        marker: {
          enabled: true,
          radius: 3,
        },
      },
    },
    series: [
      {
        name: "Actual Sales",
        type: "line",
        data: filteredData.map((item) => item.actual),
        color: "#8b5cf6",
        zIndex: 2,
        marker: {
          symbol: "circle",
        },
      } as SeriesLineOptions,
      {
        name: "Predicted Sales",
        type: "line",
        data: filteredData.map((item) => item.predicted),
        color: "#22c55e",
        dashStyle: "ShortDash",
        zIndex: 1,
        marker: {
          symbol: "diamond",
        },
      } as SeriesLineOptions,
    ],
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-medium">
              Sales Forecast
            </CardTitle>
            <div className="hidden md:flex px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-md text-xs font-medium text-purple-700 dark:text-purple-300 items-center gap-1">
              <Sparkles className="h-3 w-3" /> AI Powered
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center mr-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                className={`px-2 py-1 rounded text-xs font-medium ${
                  timePeriod === "7d"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                onClick={() => setTimePeriod("7d")}
              >
                7D
              </button>
              <button
                className={`px-2 py-1 rounded text-xs font-medium ${
                  timePeriod === "14d"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                onClick={() => setTimePeriod("14d")}
              >
                14D
              </button>
              <button
                className={`px-2 py-1 rounded text-xs font-medium ${
                  timePeriod === "30d"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                onClick={() => setTimePeriod("30d")}
              >
                30D
              </button>
              <button
                className={`px-2 py-1 rounded text-xs font-medium ${
                  timePeriod === "90d"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                onClick={() => setTimePeriod("90d")}
              >
                90D
              </button>
            </div>
            <TrendingUp
              className={`h-5 w-5 ${
                trend >= 0 ? "text-green-500" : "text-red-500"
              }`}
            />
          </div>
        </div>
        <CardDescription>Actual sales vs AI-projected revenue</CardDescription>
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
