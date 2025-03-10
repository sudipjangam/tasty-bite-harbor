
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { useTheme } from "@/hooks/useTheme";

interface RevenueChartProps {
  data: {
    date: string;
    total_revenue: number;
    order_count: number;
    average_order_value: number;
  }[];
}

const RevenueChart = ({ data }: RevenueChartProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const chartData = data
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(item => ({
      date: format(new Date(item.date), 'dd MMM'),
      revenue: Number(item.total_revenue),
      orders: item.order_count,
      average: Number(item.average_order_value),
    }));

  // Theme-aware colors
  const textColor = isDarkMode ? '#F7FAFC' : '#2D3748';
  const gridColor = isDarkMode ? '#4A5568' : '#E2E8F0';
  const backgroundColor = isDarkMode ? 'rgba(45, 55, 72, 0.8)' : 'rgba(255, 255, 255, 0.9)';
  const tooltipBackgroundColor = isDarkMode ? '#2D3748' : '#ffffff';
  const tooltipBorderColor = isDarkMode ? '#4A5568' : '#E2E8F0';

  return (
    <Card className="col-span-4 shadow-card hover:shadow-card-hover transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Revenue Trends Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" stroke={gridColor} />
              <XAxis 
                dataKey="date"
                tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: gridColor }}
              />
              <YAxis 
                tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: gridColor }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip 
                formatter={(value) => [`₹${value}`, '']}
                labelFormatter={(value) => `Date: ${value}`}
                contentStyle={{ 
                  backgroundColor: tooltipBackgroundColor,
                  border: `1px solid ${tooltipBorderColor}`,
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  color: textColor,
                  fontWeight: 500
                }}
                cursor={{ stroke: '#48BB78', strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => <span style={{ color: textColor, fontWeight: 500 }}>{value}</span>}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                name="Revenue" 
                stroke="#2D3748" 
                strokeWidth={3}
                dot={{ r: 3, strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: '#2C5282', strokeWidth: 2, fill: '#2D3748' }}
              />
              <Line 
                type="monotone" 
                dataKey="orders" 
                name="Orders" 
                stroke="#48BB78" 
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: '#276749', strokeWidth: 2, fill: '#48BB78' }}
              />
              <Line 
                type="monotone" 
                dataKey="average" 
                name="Avg Order Value" 
                stroke="#F6AD55" 
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: '#C05621', strokeWidth: 2, fill: '#F6AD55' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
