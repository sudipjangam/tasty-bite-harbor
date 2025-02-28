
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, CreditCard, TrendingUp } from "lucide-react";

interface CustomerInsight {
  customer_name: string;
  visit_count: number;
  total_spent: number;
  average_order_value: number;
  first_visit: string;
  last_visit: string;
}

interface CustomerInsightsProps {
  data: CustomerInsight[];
}

const CustomerInsights = ({ data }: CustomerInsightsProps) => {
  const sortedData = [...data].sort((a, b) => b.total_spent - a.total_spent);
  const topSpenders = sortedData.slice(0, 10);
  
  const frequentVisitors = [...data]
    .sort((a, b) => b.visit_count - a.visit_count)
    .slice(0, 10);
  
  const loyalCustomers = [...data]
    .filter(customer => {
      const firstVisit = new Date(customer.first_visit);
      const lastVisit = new Date(customer.last_visit);
      const durationInDays = (lastVisit.getTime() - firstVisit.getTime()) / (1000 * 3600 * 24);
      return durationInDays > 30 && customer.visit_count > 2;
    })
    .sort((a, b) => b.visit_count - a.visit_count)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Top Spenders</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <CardDescription>Customers with highest total spend</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSpenders.map((customer, index) => (
                  <TableRow key={index} className={index < 3 ? "bg-purple-50 dark:bg-purple-900/10" : ""}>
                    <TableCell className="font-medium">
                      {customer.customer_name}
                      {index < 3 && (
                        <Badge className="ml-2 bg-purple-100 text-purple-800 hover:bg-purple-200">
                          Top {index + 1}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">₹{Number(customer.total_spent).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{customer.visit_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Frequent Visitors</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <CardDescription>Customers who visit most often</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead className="text-right">Avg Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {frequentVisitors.map((customer, index) => (
                  <TableRow key={index} className={index < 3 ? "bg-blue-50 dark:bg-blue-900/10" : ""}>
                    <TableCell className="font-medium">
                      {customer.customer_name}
                      {index < 3 && (
                        <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-200">
                          Top {index + 1}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{customer.visit_count}</TableCell>
                    <TableCell className="text-right">₹{Number(customer.average_order_value).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">Customer Details</CardTitle>
            <CreditCard className="h-5 w-5 text-indigo-500" />
          </div>
          <CardDescription>Complete spending history and visit information</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Avg Order</TableHead>
                <TableHead>First Visit</TableHead>
                <TableHead>Last Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.slice(0, 20).map((customer, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{customer.customer_name}</TableCell>
                  <TableCell className="text-right">{customer.visit_count}</TableCell>
                  <TableCell className="text-right font-semibold">₹{Number(customer.total_spent).toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{Number(customer.average_order_value).toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(customer.first_visit), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{format(new Date(customer.last_visit), 'dd MMM yyyy')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerInsights;
