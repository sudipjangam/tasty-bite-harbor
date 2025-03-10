
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, DollarSign, ShoppingCart, TrendingUp } from "lucide-react";

interface ProductData {
  name: string;
  orders: number;
  revenue: number;
  profit_margin: number;
  in_stock: boolean;
  trend: 'up' | 'down' | 'stable';
}

interface TopProductsProps {
  data: ProductData[];
}

const TopProducts = ({ data }: TopProductsProps) => {
  const getTrendBadge = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">↑ Rising</Badge>;
      case 'down':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">↓ Falling</Badge>;
      case 'stable':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">→ Stable</Badge>;
    }
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Top Selling Menu Items</CardTitle>
          <ShoppingCart className="h-5 w-5 text-indigo-500" />
        </div>
        <CardDescription>Items generating the most revenue</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Profit %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index} className={index < 3 ? "bg-indigo-50/40 dark:bg-indigo-900/10" : ""}>
                <TableCell className="font-medium">
                  {item.name}
                  {index < 3 && (
                    <Badge variant="outline" className="ml-2 border-indigo-200 text-indigo-800">
                      #{index+1}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">{item.orders}</TableCell>
                <TableCell className="text-right font-semibold">₹{item.revenue.toFixed(2)}</TableCell>
                <TableCell className="text-right">{item.profit_margin}%</TableCell>
                <TableCell>
                  {item.in_stock ? (
                    <div className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm">In Stock</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-amber-500 mr-1" />
                      <span className="text-sm">Low Stock</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>{getTrendBadge(item.trend)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TopProducts;
