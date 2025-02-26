
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Customer Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Visits</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Avg Order</TableHead>
              <TableHead>First Visit</TableHead>
              <TableHead>Last Visit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((customer, index) => (
              <TableRow key={index}>
                <TableCell>{customer.customer_name}</TableCell>
                <TableCell>{customer.visit_count}</TableCell>
                <TableCell>${Number(customer.total_spent).toFixed(2)}</TableCell>
                <TableCell>${Number(customer.average_order_value).toFixed(2)}</TableCell>
                <TableCell>{new Date(customer.first_visit).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(customer.last_visit).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CustomerInsights;
