
import React from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minimize } from "lucide-react";
import RevenueHighchart from "@/components/Analytics/RevenueHighchart";
import RevenueByCategoryChart from "@/components/Analytics/RevenueByCategoryChart";
import TimeSeriesAnalysis from "@/components/Analytics/TimeSeriesAnalysis";
import TopProducts from "@/components/Analytics/TopProducts";
import SalesPrediction from "@/components/Analytics/SalesPrediction";

interface ExpandedChartDialogProps {
  expandedChart: string | null;
  setExpandedChart: (chart: string | null) => void;
  showDataTable: boolean;
  setShowDataTable: (show: boolean) => void;
  filteredData: any[];
  categoryData: any[];
  customerTimeData: any[];
  timeRange: string;
  topProducts: any[];
  salesPrediction: any[];
}

const ExpandedChartDialog = ({
  expandedChart,
  setExpandedChart,
  showDataTable,
  setShowDataTable,
  filteredData,
  categoryData,
  customerTimeData,
  timeRange,
  topProducts,
  salesPrediction,
}: ExpandedChartDialogProps) => {
  const filterTimeSeriesData = (data: any[], days: number) => {
    if (days === 365) return data;
    return data.slice(-days);
  };

  return (
    <Dialog open={!!expandedChart} onOpenChange={(open) => !open && setExpandedChart(null)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>
              {expandedChart === 'revenue' && 'Revenue Analysis'}
              {expandedChart === 'category' && 'Category Revenue'}
              {expandedChart === 'customer' && 'Customer Growth'}
              {expandedChart === 'products' && 'Top Selling Products'}
              {expandedChart === 'forecast' && 'Sales Forecast'}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDataTable(!showDataTable)}
              >
                {showDataTable ? 'Show Chart' : 'Show Data Table'}
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" size="icon">
                  <Minimize className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {!showDataTable ? (
            <>
              {expandedChart === 'revenue' && <RevenueHighchart data={filteredData} />}
              {expandedChart === 'category' && <RevenueByCategoryChart data={categoryData} />}
              {expandedChart === 'customer' && (
                <TimeSeriesAnalysis 
                  data={filterTimeSeriesData(customerTimeData, parseInt(timeRange))} 
                  title="Customer Growth" 
                  description="Daily unique customers over time" 
                  valuePrefix="" 
                  valueSuffix=" customers"
                  color="#6366f1"
                  height={400}
                />
              )}
              {expandedChart === 'products' && <TopProducts data={topProducts} />}
              {expandedChart === 'forecast' && <SalesPrediction data={salesPrediction} />}
            </>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    {expandedChart === 'revenue' && (
                      <>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Revenue</th>
                        <th className="p-2 text-left">Orders</th>
                        <th className="p-2 text-left">Avg Order Value</th>
                      </>
                    )}
                    {expandedChart === 'category' && (
                      <>
                        <th className="p-2 text-left">Category</th>
                        <th className="p-2 text-left">Revenue</th>
                        <th className="p-2 text-left">Percentage</th>
                      </>
                    )}
                    {expandedChart === 'customer' && (
                      <>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Customers</th>
                      </>
                    )}
                    {expandedChart === 'products' && (
                      <>
                        <th className="p-2 text-left">Product</th>
                        <th className="p-2 text-left">Orders</th>
                        <th className="p-2 text-left">Revenue</th>
                        <th className="p-2 text-left">Profit Margin</th>
                        <th className="p-2 text-left">In Stock</th>
                        <th className="p-2 text-left">Trend</th>
                      </>
                    )}
                    {expandedChart === 'forecast' && (
                      <>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Actual</th>
                        <th className="p-2 text-left">Predicted</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {expandedChart === 'revenue' && filteredData.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="p-2">{format(new Date(item.date), 'MMM dd, yyyy')}</td>
                      <td className="p-2">₹{Number(item.total_revenue).toFixed(2)}</td>
                      <td className="p-2">{item.order_count}</td>
                      <td className="p-2">₹{Number(item.average_order_value).toFixed(2)}</td>
                    </tr>
                  ))}
                  {expandedChart === 'category' && categoryData.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">₹{item.value.toFixed(2)}</td>
                      <td className="p-2">{item.percentage}%</td>
                    </tr>
                  ))}
                  {expandedChart === 'customer' && filterTimeSeriesData(customerTimeData, parseInt(timeRange)).map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="p-2">{item.date}</td>
                      <td className="p-2">{item.value}</td>
                    </tr>
                  ))}
                  {expandedChart === 'products' && topProducts.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.orders}</td>
                      <td className="p-2">₹{item.revenue.toFixed(2)}</td>
                      <td className="p-2">{item.profit_margin}%</td>
                      <td className="p-2">{item.in_stock ? 'Yes' : 'No'}</td>
                      <td className="p-2">{item.trend}</td>
                    </tr>
                  ))}
                  {expandedChart === 'forecast' && salesPrediction.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="p-2">{item.date}</td>
                      <td className="p-2">{item.actual ? `₹${item.actual}` : '-'}</td>
                      <td className="p-2">{item.predicted ? `₹${item.predicted}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpandedChartDialog;
