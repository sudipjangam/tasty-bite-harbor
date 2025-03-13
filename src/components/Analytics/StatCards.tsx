
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, Users, Calendar } from "lucide-react";

interface StatCardsProps {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  ordersToday: number;
}

const StatCards = ({ totalRevenue, totalOrders, averageOrderValue, ordersToday }: StatCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-card/50 backdrop-blur-xl border border-border/5 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <div className="p-2 rounded-full bg-purple-100">
              <BarChart3 className="h-4 w-4 text-purple-700" />
            </div>
            Total Revenue (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">Based on all sales in the last 30 days</p>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-xl border border-border/5 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <div className="p-2 rounded-full bg-blue-100">
              <FileText className="h-4 w-4 text-blue-700" />
            </div>
            Total Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalOrders}</div>
          <p className="text-xs text-muted-foreground mt-1">Number of orders placed in the last 30 days</p>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-xl border border-border/5 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <div className="p-2 rounded-full bg-green-100">
              <Users className="h-4 w-4 text-green-700" />
            </div>
            Average Order Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{averageOrderValue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">Average spend per order</p>
        </CardContent>
      </Card>
      
      <Card className="bg-card/50 backdrop-blur-xl border border-border/5 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-100">
              <Calendar className="h-4 w-4 text-orange-700" />
            </div>
            Today's Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{ordersToday}</div>
          <p className="text-xs text-muted-foreground mt-1">Orders received today</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatCards;
