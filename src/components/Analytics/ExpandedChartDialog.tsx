import React from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minimize, Table, BarChart3 } from "lucide-react";
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
  topProducts: any[];
  salesPrediction: any[];
  orders?: any[];
  menuItems?: any[];
}

const ExpandedChartDialog = ({
  expandedChart,
  setExpandedChart,
  showDataTable,
  setShowDataTable,
  filteredData,
  categoryData,
  customerTimeData,
  topProducts,
  salesPrediction,
  orders = [],
  menuItems = [],
}: ExpandedChartDialogProps) => {
  return (
    <Dialog
      open={!!expandedChart}
      onOpenChange={(open) => !open && setExpandedChart(null)}
    >
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex justify-between items-center">
            <span>
              {expandedChart === "revenue" && "Revenue Analysis"}
              {expandedChart === "category" && "Category Revenue"}
              {expandedChart === "customer" && "Customer Growth"}
              {expandedChart === "products" && "Top Selling Products"}
              {expandedChart === "forecast" && "Sales Forecast"}
            </span>
            <div className="flex gap-2 items-center">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button
                  className={`p-1.5 rounded transition-all ${
                    !showDataTable
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                  onClick={() => setShowDataTable(false)}
                  title="Chart View"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  className={`p-1.5 rounded transition-all ${
                    showDataTable
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                  onClick={() => setShowDataTable(true)}
                  title="Table View"
                >
                  <Table className="h-4 w-4" />
                </button>
              </div>
              <DialogClose asChild>
                <Button variant="ghost" size="icon">
                  <Minimize className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {!showDataTable ? (
            <div className="min-h-[400px]">
              {expandedChart === "revenue" && (
                <RevenueHighchart data={filteredData} />
              )}
              {expandedChart === "category" && (
                <RevenueByCategoryChart
                  data={categoryData}
                  orders={orders}
                  menuItems={menuItems}
                />
              )}
              {expandedChart === "customer" && (
                <TimeSeriesAnalysis
                  data={customerTimeData}
                  title="Customer Growth"
                  description="Daily unique customers over time"
                  valuePrefix=""
                  valueSuffix=" customers"
                  color="#6366f1"
                  height={400}
                />
              )}
              {expandedChart === "products" && (
                <TopProducts data={topProducts} />
              )}
              {expandedChart === "forecast" && (
                <SalesPrediction data={salesPrediction} />
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]">
                <thead className="sticky top-0 bg-muted z-10">
                  <tr>
                    {expandedChart === "revenue" && (
                      <>
                        <th className="p-3 text-left font-medium">Date</th>
                        <th className="p-3 text-left font-medium">Revenue</th>
                        <th className="p-3 text-left font-medium">Orders</th>
                        <th className="p-3 text-left font-medium">
                          Avg Order Value
                        </th>
                      </>
                    )}
                    {expandedChart === "category" && (
                      <>
                        <th className="p-3 text-left font-medium">Category</th>
                        <th className="p-3 text-left font-medium">Revenue</th>
                        <th className="p-3 text-left font-medium">
                          Percentage
                        </th>
                      </>
                    )}
                    {expandedChart === "customer" && (
                      <>
                        <th className="p-3 text-left font-medium">Date</th>
                        <th className="p-3 text-left font-medium">Customers</th>
                      </>
                    )}
                    {expandedChart === "products" && (
                      <>
                        <th className="p-3 text-left font-medium">Product</th>
                        <th className="p-3 text-left font-medium">Orders</th>
                        <th className="p-3 text-left font-medium">Revenue</th>
                        <th className="p-3 text-left font-medium">
                          Profit Margin
                        </th>
                        <th className="p-3 text-left font-medium">In Stock</th>
                        <th className="p-3 text-left font-medium">Trend</th>
                      </>
                    )}
                    {expandedChart === "forecast" && (
                      <>
                        <th className="p-3 text-left font-medium">Date</th>
                        <th className="p-3 text-left font-medium">Actual</th>
                        <th className="p-3 text-left font-medium">Predicted</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {expandedChart === "revenue" &&
                    filteredData.map((item, i) => (
                      <tr
                        key={i}
                        className={
                          i % 2 === 0 ? "bg-background" : "bg-muted/30"
                        }
                      >
                        <td className="p-3">
                          {format(new Date(item.date), "MMM dd, yyyy")}
                        </td>
                        <td className="p-3">
                          ₹{Number(item.total_revenue).toLocaleString()}
                        </td>
                        <td className="p-3">{item.order_count}</td>
                        <td className="p-3">
                          ₹{Number(item.average_order_value).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  {expandedChart === "category" &&
                    categoryData.map((item, i) => (
                      <tr
                        key={i}
                        className={
                          i % 2 === 0 ? "bg-background" : "bg-muted/30"
                        }
                      >
                        <td className="p-3">{item.name}</td>
                        <td className="p-3">₹{item.value.toLocaleString()}</td>
                        <td className="p-3">{item.percentage}%</td>
                      </tr>
                    ))}
                  {expandedChart === "customer" &&
                    customerTimeData.slice(-30).map((item, i) => (
                      <tr
                        key={i}
                        className={
                          i % 2 === 0 ? "bg-background" : "bg-muted/30"
                        }
                      >
                        <td className="p-3">{item.date}</td>
                        <td className="p-3">{item.value}</td>
                      </tr>
                    ))}
                  {expandedChart === "products" &&
                    topProducts.map((item, i) => (
                      <tr
                        key={i}
                        className={
                          i % 2 === 0 ? "bg-background" : "bg-muted/30"
                        }
                      >
                        <td className="p-3">{item.name}</td>
                        <td className="p-3">{item.orders}</td>
                        <td className="p-3">
                          ₹{item.revenue.toLocaleString()}
                        </td>
                        <td className="p-3">{item.profit_margin}%</td>
                        <td className="p-3">{item.in_stock ? "Yes" : "No"}</td>
                        <td className="p-3 capitalize">{item.trend}</td>
                      </tr>
                    ))}
                  {expandedChart === "forecast" &&
                    salesPrediction.map((item, i) => (
                      <tr
                        key={i}
                        className={
                          i % 2 === 0 ? "bg-background" : "bg-muted/30"
                        }
                      >
                        <td className="p-3">{item.date}</td>
                        <td className="p-3">
                          {item.actual
                            ? `₹${item.actual.toLocaleString()}`
                            : "-"}
                        </td>
                        <td className="p-3">
                          {item.predicted
                            ? `₹${item.predicted.toLocaleString()}`
                            : "-"}
                        </td>
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
