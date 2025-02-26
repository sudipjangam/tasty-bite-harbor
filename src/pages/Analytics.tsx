
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import RevenueChart from "@/components/Analytics/RevenueChart";
import CustomerInsights from "@/components/Analytics/CustomerInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Analytics = () => {
  const { data, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Analytics & Reports</h1>
        <p>No data available.</p>
      </div>
    );
  }

  const totalRevenue = data.revenueStats.reduce((sum, stat) => sum + Number(stat.total_revenue), 0);
  const totalOrders = data.revenueStats.reduce((sum, stat) => sum + stat.order_count, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Analytics & Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Revenue (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageOrderValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <RevenueChart data={data.revenueStats} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CustomerInsights data={data.customerInsights} />
      </div>
    </div>
  );
};

export default Analytics;
