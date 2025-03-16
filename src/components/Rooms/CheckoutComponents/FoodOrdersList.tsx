
import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FoodOrder {
  id: string;
  items: OrderItem[];
  total: number;
  created_at: string;
  status: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface FoodOrdersListProps {
  foodOrders: FoodOrder[];
  foodOrdersTotal: number;
}

const FoodOrdersList: React.FC<FoodOrdersListProps> = ({ foodOrders, foodOrdersTotal }) => {
  if (foodOrders.length === 0) return null;
  
  return (
    <div>
      <h3 className="text-lg font-medium mb-2 flex items-center">
        <UtensilsCrossed className="mr-2 h-4 w-4" />
        Food Orders
      </h3>
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
              <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                {order.items?.map((item, index) => (
                  <div key={index} className="text-sm">
                    {item.name} x{item.quantity} (₹{item.price})
                  </div>
                ))}
              </TableCell>
              <TableCell className="text-right">₹{order.total}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={2} className="font-medium text-right">
              Total Food Orders:
            </TableCell>
            <TableCell className="text-right font-bold">
              ₹{foodOrdersTotal}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default FoodOrdersList;
