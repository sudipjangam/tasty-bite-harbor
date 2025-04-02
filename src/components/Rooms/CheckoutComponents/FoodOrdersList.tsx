
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';

interface FoodOrdersListProps {
  foodOrders: {
    id: string;
    customer_name: string;
    items: any;
    total: number;
    created_at: string;
  }[];
}

const FoodOrdersList: React.FC<FoodOrdersListProps> = ({ foodOrders }) => {
  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Food Orders</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Amount (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {foodOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
              <TableCell>
                <div className="text-sm">
                  {Array.isArray(order.items) ? (
                    <ul className="list-disc list-inside">
                      {order.items.map((item: any, index: number) => (
                        <li key={index}>
                          {item.name} x {item.quantity} (₹{item.price.toFixed(2)})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span>No items information</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                ₹{order.total.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={2} className="text-right font-bold">
              Total:
            </TableCell>
            <TableCell className="text-right font-bold">
              ₹{foodOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default FoodOrdersList;
