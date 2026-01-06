import { useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Options, SeriesLineOptions } from "highcharts";
import { fetchSalesForecasts } from "@/utils/aiAnalytics";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { format } from "date-fns";

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
  const { restaurantId } = useRestaurantId();

  // State for on-demand forecast loading
  const [forecastData, setForecastData] = useState<SalesPredictionData[]>([]);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [hasForecast, setHasForecast] = useState(false);

  // Combine historical data with forecast data
  const combinedData = hasForecast ? [...data, ...forecastData] : data;

  // Calculate trend
  const calculateTrend = () => {
    const lastActual =
      [...combinedData].reverse().find((d) => d.actual !== null)?.actual || 0;
    const lastPredicted =
      [...combinedData].reverse().find((d) => d.predicted !== null)
        ?.predicted || 0;

    if (lastActual > 0 && lastPredicted > 0) {
      const diff = lastPredicted - lastActual;
      const percent = (diff / lastActual) * 100;
      return percent;
    }
    return 0;
  };

  const trend = calculateTrend();

  // Handler to generate AI forecast on-demand
  const handleGenerateForecast = async () => {
    if (!restaurantId || isLoadingForecast) return;

    setIsLoadingForecast(true);
    try {
      const aiForecasts = await fetchSalesForecasts(restaurantId, 7);
      const predictions = aiForecasts.map((forecast) => ({
        date: format(new Date(forecast.date), "dd MMM"),
        actual: null as number | null,
        predicted: forecast.predicted_revenue,
      }));
      setForecastData(predictions);
      setHasForecast(true);
    } catch (error) {
      console.error("Failed to fetch AI forecasts:", error);
    } finally {
      setIsLoadingForecast(false);
    }
  };

  // Filter data based on selected time period
  const filterDataByTimePeriod = (
    data: SalesPredictionData[],
    period: TimePeriod
  ) => {
    const days = parseInt(period);
    if (days >= data.length) return data;
    return data.slice(Math.max(0, data.length - days));
  };

  const filteredData = filterDataByTimePeriod(combinedData, timePeriod);

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
      enabled: true,
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
        connectNulls: true,
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
        color: "#8b5cf6", // Purple for actual
        zIndex: 2,
        marker: {
          symbol: "circle",
        },
      } as SeriesLineOptions,
      ...(hasForecast
        ? [
            {
              name: "AI Predicted Sales",
              type: "line" as const,
              data: filteredData.map((item) => item.predicted),
              color: "#22c55e", // Green for predicted
              dashStyle: "ShortDash" as const,
              zIndex: 1,
              marker: {
                symbol: "diamond",
              },
            } as SeriesLineOptions,
          ]
        : []),
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
          <div className="flex items-center gap-2">
            {/* Time period selector */}
            <div className="flex items-center mr-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(["7d", "14d", "30d"] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    timePeriod === period
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                  onClick={() => setTimePeriod(period)}
                >
                  {period.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Predict Forecast Button - Top Right */}
            {!hasForecast ? (
              <Button
                onClick={handleGenerateForecast}
                disabled={isLoadingForecast}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md"
              >
                {isLoadingForecast ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Predicting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Predict Forecast
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <TrendingUp
                  className={`h-5 w-5 ${
                    trend >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    trend >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trend >= 0 ? "+" : ""}
                  {trend.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
        <CardDescription>
          {hasForecast
            ? "Actual sales (purple) vs AI-predicted revenue (green dotted)"
            : "Actual sales data - Click 'Predict Forecast' to see AI predictions"}
        </CardDescription>
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
