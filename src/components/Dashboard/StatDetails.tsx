
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "@/hooks/useTheme";

interface StatDetailsProps {
  title: string | null;
  data: any;
  type: "sales" | "orders" | "customers" | "revenue";
  onClose: () => void;
}

const StatDetails = ({ title, data, type, onClose }: StatDetailsProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

  // Theme-aware colors
  const textColor = isDarkMode ? '#F7FAFC' : '#2D3748';
  const gridColor = isDarkMode ? '#4A5568' : '#E2E8F0';
  const tooltipBg = isDarkMode ? '#2D3748' : 'white';
  const tooltipBorder = isDarkMode ? '#4A5568' : '#E2E8F0';
  
  // Line colors based on stat type
  const getLineColor = () => {
    if (type === "sales") return "#2D3748";
    if (type === "revenue") return "#F6AD55";
    return "#48BB78";
  };

  const renderContent = () => {
    switch (type) {
      case "sales":
      case "revenue":
        return (
          <div className="h-[400px] w-full chart-container rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey={type === "sales" ? "date" : "time"} 
                  tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: gridColor }}
                />
                <YAxis 
                  tickFormatter={formatCurrency} 
                  tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: gridColor }}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value as number), "Amount"]} 
                  contentStyle={{ 
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    color: isDarkMode ? '#F7FAFC' : '#2D3748',
                    fontWeight: 500
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke={getLineColor()}
                  strokeWidth={2}
                  dot={{ strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case "orders":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold">Items</TableHead>
                <TableHead className="font-semibold">Total</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((order: any) => (
                <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{order.customer_name}</TableCell>
                  <TableCell>{order.items.join(", ")}</TableCell>
                  <TableCell>{formatCurrency(order.total)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300' 
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300'
                    }`}>
                      {order.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case "customers":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Customer Name</TableHead>
                <TableHead className="font-semibold">Orders</TableHead>
                <TableHead className="font-semibold">Total Spent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((customer: any, index: number) => (
                <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.orders}</TableCell>
                  <TableCell>{formatCurrency(customer.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={!!title} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white dark:bg-brand-deep-blue/90 border border-border/30 shadow-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-brand-dark-grey dark:text-brand-light-grey">{title}</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default StatDetails;
