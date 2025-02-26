
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueChartProps {
  data: {
    date: string;
    total_revenue: number;
    order_count: number;
    average_order_value: number;
  }[];
}

const RevenueChart = ({ data }: RevenueChartProps) => {
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    revenue: Number(item.total_revenue),
    orders: item.order_count,
    average: Number(item.average_order_value),
  }));

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Revenue Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
              <Line type="monotone" dataKey="orders" stroke="#82ca9d" name="Orders" />
              <Line type="monotone" dataKey="average" stroke="#ffc658" name="Avg Order Value" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
