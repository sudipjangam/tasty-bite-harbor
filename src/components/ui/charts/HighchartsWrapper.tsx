import React, { useRef, useEffect } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

// Default theme colors matching your design system
const defaultColors = [
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#ec4899", // pink
  "#6366f1", // indigo
  "#84cc16", // lime
];

// Base chart options with dark mode support
const getBaseOptions = (isDark: boolean): Highcharts.Options => ({
  chart: {
    backgroundColor: "transparent",
    style: {
      fontFamily: "inherit",
    },
  },
  title: {
    text: undefined,
  },
  credits: {
    enabled: false,
  },
  colors: defaultColors,
  xAxis: {
    labels: {
      style: {
        color: isDark ? "#9ca3af" : "#6b7280",
      },
    },
    lineColor: isDark ? "#374151" : "#e5e7eb",
    tickColor: isDark ? "#374151" : "#e5e7eb",
  },
  yAxis: {
    labels: {
      style: {
        color: isDark ? "#9ca3af" : "#6b7280",
      },
    },
    gridLineColor: isDark ? "#374151" : "#e5e7eb",
    title: {
      text: undefined,
    },
  },
  legend: {
    itemStyle: {
      color: isDark ? "#d1d5db" : "#374151",
    },
    itemHoverStyle: {
      color: isDark ? "#f3f4f6" : "#111827",
    },
  },
  tooltip: {
    backgroundColor: isDark
      ? "rgba(31, 41, 55, 0.95)"
      : "rgba(255, 255, 255, 0.95)",
    borderWidth: 0,
    borderRadius: 12,
    shadow: true,
    style: {
      color: isDark ? "#f3f4f6" : "#1f2937",
    },
  },
  plotOptions: {
    series: {
      animation: {
        duration: 500,
      },
    },
  },
});

interface HighchartsWrapperProps {
  options: Highcharts.Options;
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * Base Highcharts wrapper component with dark mode support
 */
export const HighchartsWrapper: React.FC<HighchartsWrapperProps> = ({
  options,
  containerProps,
}) => {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const isDark = document.documentElement.classList.contains("dark");

  // Merge base options with provided options
  const mergedOptions: Highcharts.Options = {
    ...getBaseOptions(isDark),
    ...options,
    chart: {
      ...getBaseOptions(isDark).chart,
      ...options.chart,
    },
    xAxis: {
      ...getBaseOptions(isDark).xAxis,
      ...(options.xAxis as Highcharts.XAxisOptions),
    },
    yAxis: {
      ...getBaseOptions(isDark).yAxis,
      ...(options.yAxis as Highcharts.YAxisOptions),
    },
    tooltip: {
      ...getBaseOptions(isDark).tooltip,
      ...options.tooltip,
    },
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      chartRef.current?.chart?.reflow();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div {...containerProps}>
      <HighchartsReact
        highcharts={Highcharts}
        options={mergedOptions}
        ref={chartRef}
      />
    </div>
  );
};

// ============================================================================
// Specialized Chart Components
// ============================================================================

interface AreaChartData {
  name: string;
  value: number;
}

interface AreaChartProps {
  data: AreaChartData[];
  height?: number;
  color?: string;
  gradientColor?: string;
  xAxisFormatter?: (value: string) => string;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (point: Highcharts.Point) => string;
}

/**
 * Area Chart component - replacement for Recharts AreaChart
 */
export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  height = 280,
  color = "#8b5cf6",
  gradientColor,
  xAxisFormatter,
  yAxisFormatter,
  tooltipFormatter,
}) => {
  const options: Highcharts.Options = {
    chart: {
      type: "area",
      height,
    },
    xAxis: {
      categories: data.map((d) => d.name),
      labels: {
        formatter: function () {
          return xAxisFormatter
            ? xAxisFormatter(String(this.value))
            : String(this.value);
        },
      },
    },
    yAxis: {
      labels: {
        formatter: function () {
          return yAxisFormatter
            ? yAxisFormatter(Number(this.value))
            : String(this.value);
        },
      },
    },
    tooltip: {
      formatter: function () {
        if (tooltipFormatter && this.point) {
          return tooltipFormatter(this.point);
        }
        return `<b>${this.x}</b><br/>${this.y}`;
      },
    },
    series: [
      {
        type: "area",
        name: "Value",
        data: data.map((d) => d.value),
        color: color,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [
              0,
              Highcharts.color(gradientColor || color)
                .setOpacity(0.4)
                .get("rgba") as string,
            ],
            [
              1,
              Highcharts.color(gradientColor || color)
                .setOpacity(0)
                .get("rgba") as string,
            ],
          ],
        },
        lineWidth: 3,
        marker: {
          enabled: false,
          states: {
            hover: {
              enabled: true,
              radius: 5,
            },
          },
        },
      },
    ],
  };

  return <HighchartsWrapper options={options} />;
};

interface PieChartData {
  name: string;
  value: number;
  percentage?: number;
}

interface PieChartProps {
  data: PieChartData[];
  height?: number;
  innerRadius?: number;
  colors?: string[];
  tooltipFormatter?: (point: Highcharts.Point) => string;
}

/**
 * Pie/Donut Chart component - replacement for Recharts PieChart
 */
export const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 220,
  innerRadius = 50,
  colors = defaultColors,
  tooltipFormatter,
}) => {
  const options: Highcharts.Options = {
    chart: {
      type: "pie",
      height,
    },
    tooltip: {
      formatter: function () {
        if (tooltipFormatter && this.point) {
          return tooltipFormatter(this.point);
        }
        return `<b>${this.point.name}</b><br/>${this.y}`;
      },
    },
    plotOptions: {
      pie: {
        innerSize: innerRadius ? `${innerRadius}%` : 0,
        borderWidth: 0,
        dataLabels: {
          enabled: false,
        },
        showInLegend: false,
      },
    },
    series: [
      {
        type: "pie",
        name: "Value",
        data: data.map((d, i) => ({
          name: d.name,
          y: d.value,
          color: colors[i % colors.length],
        })),
      },
    ],
  };

  return <HighchartsWrapper options={options} />;
};

interface BarChartData {
  name: string;
  value: number;
}

interface BarChartProps {
  data: BarChartData[];
  height?: number;
  color?: string;
  horizontal?: boolean;
  xAxisFormatter?: (value: string) => string;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (point: Highcharts.Point) => string;
}

/**
 * Bar Chart component - replacement for Recharts BarChart
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 280,
  color = "#8b5cf6",
  horizontal = false,
  xAxisFormatter,
  yAxisFormatter,
  tooltipFormatter,
}) => {
  const options: Highcharts.Options = {
    chart: {
      type: horizontal ? "bar" : "column",
      height,
    },
    xAxis: {
      categories: data.map((d) => d.name),
      labels: {
        formatter: function () {
          return xAxisFormatter
            ? xAxisFormatter(String(this.value))
            : String(this.value);
        },
      },
    },
    yAxis: {
      labels: {
        formatter: function () {
          return yAxisFormatter
            ? yAxisFormatter(Number(this.value))
            : String(this.value);
        },
      },
    },
    tooltip: {
      formatter: function () {
        if (tooltipFormatter && this.point) {
          return tooltipFormatter(this.point);
        }
        return `<b>${this.x}</b><br/>${this.y}`;
      },
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      column: {
        borderRadius: 6,
        borderWidth: 0,
      },
      bar: {
        borderRadius: 6,
        borderWidth: 0,
      },
    },
    series: [
      {
        type: horizontal ? "bar" : "column",
        name: "Value",
        data: data.map((d) => d.value),
        color: color,
      },
    ],
  };

  return <HighchartsWrapper options={options} />;
};

interface LineChartData {
  name: string;
  value: number;
}

interface LineChartProps {
  data: LineChartData[];
  height?: number;
  color?: string;
  xAxisFormatter?: (value: string) => string;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (point: Highcharts.Point) => string;
}

/**
 * Line Chart component - replacement for Recharts LineChart
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 280,
  color = "#8b5cf6",
  xAxisFormatter,
  yAxisFormatter,
  tooltipFormatter,
}) => {
  const options: Highcharts.Options = {
    chart: {
      type: "line",
      height,
    },
    xAxis: {
      categories: data.map((d) => d.name),
      labels: {
        formatter: function () {
          return xAxisFormatter
            ? xAxisFormatter(String(this.value))
            : String(this.value);
        },
      },
    },
    yAxis: {
      labels: {
        formatter: function () {
          return yAxisFormatter
            ? yAxisFormatter(Number(this.value))
            : String(this.value);
        },
      },
    },
    tooltip: {
      formatter: function () {
        if (tooltipFormatter && this.point) {
          return tooltipFormatter(this.point);
        }
        return `<b>${this.x}</b><br/>${this.y}`;
      },
    },
    legend: {
      enabled: false,
    },
    series: [
      {
        type: "line",
        name: "Value",
        data: data.map((d) => d.value),
        color: color,
        lineWidth: 3,
        marker: {
          enabled: false,
          states: {
            hover: {
              enabled: true,
              radius: 5,
            },
          },
        },
      },
    ],
  };

  return <HighchartsWrapper options={options} />;
};

export { defaultColors };
export default HighchartsWrapper;
