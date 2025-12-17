import { useRef, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";
import { CHART_COLORS } from "@/utils/chartUtils";
import { Options } from "highcharts";

interface UniversalChartProps {
  options: Options;
  isLoading?: boolean;
  height?: number;
  type?: 'line' | 'column' | 'area' | 'spline' | 'areaspline' | 'pie';
}

export const UniversalChart = ({ 
  options, 
  isLoading = false,
  height = 400,
  type
}: UniversalChartProps) => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isDarkMode = theme === 'dark';
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);

  // Merge default theme configuration with provided options
  const mergedOptions: Options = useMemo(() => {
    const baseConfig: Options = {
      chart: {
        type: type || options.chart?.type || 'line',
        backgroundColor: 'transparent', // Let parent container handle bg
        style: { fontFamily: 'Inter, sans-serif' },
        height: isMobile ? Math.max(280, height * 0.7) : height,
        animation: { duration: 800 }
      },
      title: { text: undefined }, // Clean default
      credits: { enabled: false }, // Clean default
      
      // Theme-aware X-Axis
      xAxis: {
        lineColor: isDarkMode ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light,
        tickColor: isDarkMode ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light,
        labels: {
          style: {
            color: isDarkMode ? CHART_COLORS.text.dark : CHART_COLORS.text.light,
            fontSize: '11px'
          }
        },
        ...options.xAxis
      },

      // Theme-aware Y-Axis
      yAxis: Array.isArray(options.yAxis) 
        ? options.yAxis.map(axis => ({
            gridLineColor: isDarkMode ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light,
            labels: {
              style: { color: isDarkMode ? CHART_COLORS.text.dark : CHART_COLORS.text.light }
            },
            ...axis
          }))
        : {
            gridLineColor: isDarkMode ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light,
            labels: {
              style: { color: isDarkMode ? CHART_COLORS.text.dark : CHART_COLORS.text.light }
            },
            ...options.yAxis
          },

      // Theme-aware Tooltip
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
        borderRadius: 8,
        shadow: true,
        style: { color: isDarkMode ? CHART_COLORS.text.dark : CHART_COLORS.text.light },
        ...options.tooltip
      },

      // Theme-aware Legend
      legend: {
        itemStyle: {
          color: isDarkMode ? CHART_COLORS.text.dark : CHART_COLORS.text.light,
          fontWeight: '500'
        },
        itemHoverStyle: { color: isDarkMode ? CHART_COLORS.primary.dark : CHART_COLORS.primary.light },
        ...options.legend
      },

      // Responsive Rules
      responsive: {
        rules: [{
          condition: { maxWidth: 500 },
          chartOptions: {
            legend: {
              align: 'center',
              verticalAlign: 'bottom',
              layout: 'horizontal'
            },
            yAxis: [{ title: { text: null } }]
          }
        }]
      },
      
      ...options, // Override with specific props
      
      // Deep merge series to inject colors if needed (simplified here)
      series: options.series
    };
    
    return baseConfig;
  }, [options, isDarkMode, isMobile, height, type]);

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50/50 dark:bg-gray-800/50 rounded-lg animate-pulse"
        style={{ height: isMobile ? Math.max(280, height * 0.7) : height }}
      >
        <span className="text-sm text-gray-400">Loading chart data...</span>
      </div>
    );
  }

  return (
    <div className="w-full transition-opacity duration-300 ease-in-out">
      <HighchartsReact
        highcharts={Highcharts}
        options={mergedOptions}
        ref={chartComponentRef}
      />
    </div>
  );
};
