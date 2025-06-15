
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HelpCircle, 
  ShoppingCart, 
  Plus, 
  Clock, 
  CheckCircle, 
  Users, 
  CreditCard,
  Search,
  Filter,
  Edit,
  Trash2
} from "lucide-react";

const OrdersGuide = () => {
  const features = [
    {
      title: "Create New Orders",
      icon: <Plus className="w-5 h-5" />,
      description: "Add new orders for dine-in, takeaway, or delivery",
      steps: [
        "Click 'Add New Order' button",
        "Select table or customer type",
        "Choose menu items from categories",
        "Add quantities and special instructions",
        "Review order summary",
        "Submit order to kitchen"
      ]
    },
    {
      title: "Order Management",
      icon: <ShoppingCart className="w-5 h-5" />,
      description: "Track and manage order status",
      steps: [
        "View all active orders in real-time",
        "Update order status (Pending → Preparing → Ready → Served)",
        "Edit orders before kitchen confirmation",
        "Cancel orders if needed",
        "Process payments and billing"
      ]
    },
    {
      title: "Payment Processing",
      icon: <CreditCard className="w-5 h-5" />,
      description: "Handle various payment methods",
      steps: [
        "Select completed order",
        "Choose payment method (Cash/Card/UPI)",
        "Apply discounts if applicable",
        "Generate receipt",
        "Process payment confirmation"
      ]
    }
  ];

  const orderStatuses = [
    { status: "Pending", color: "bg-yellow-500", description: "Order received, waiting for kitchen" },
    { status: "Preparing", color: "bg-blue-500", description: "Kitchen is preparing the order" },
    { status: "Ready", color: "bg-green-500", description: "Order ready for pickup/serving" },
    { status: "Served", color: "bg-gray-500", description: "Order delivered to customer" },
    { status: "Cancelled", color: "bg-red-500", description: "Order cancelled" }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="w-4 h-4 mr-2" />
          Orders Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Orders Management Guide
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Orders Management System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <img 
                    src="photo-1519389950473-47ba0277781c" 
                    alt="Restaurant order management system" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <p>The Orders Management system helps you efficiently handle customer orders from creation to completion. Track order status, manage payments, and coordinate with kitchen operations seamlessly.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Key Benefits</h3>
                    <ul className="text-sm space-y-1">
                      <li>• Real-time order tracking</li>
                      <li>• Streamlined kitchen workflow</li>
                      <li>• Multiple payment options</li>
                      <li>• Customer satisfaction monitoring</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Order Types</h3>
                    <div className="space-y-2">
                      <Badge variant="secondary">Dine-in</Badge>
                      <Badge variant="outline">Takeaway</Badge>
                      <Badge variant="outline">Delivery</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                      <div className="space-y-1">
                        {feature.steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="flex items-start gap-2 text-sm">
                            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                              {stepIndex + 1}
                            </span>
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Status Workflow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {orderStatuses.map((status, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`w-4 h-4 rounded-full ${status.color}`}></div>
                      <div>
                        <span className="font-medium">{status.status}</span>
                        <p className="text-sm text-muted-foreground">{status.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Order Lifecycle</h4>
                  <p className="text-sm">Orders flow through these statuses automatically as they progress through your restaurant operations. Staff can manually update status when needed.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search & Filter Tips
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• Use order number for quick lookup</li>
                    <li>• Filter by status to focus on specific orders</li>
                    <li>• Sort by time to prioritize urgent orders</li>
                    <li>• Use customer name search for repeat customers</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Management
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• Monitor preparation times for efficiency</li>
                    <li>• Set up notifications for delayed orders</li>
                    <li>• Track peak hours for better staffing</li>
                    <li>• Use rush hour indicators</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Customer Service
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• Keep customers informed about order status</li>
                    <li>• Handle special dietary requirements carefully</li>
                    <li>• Maintain order accuracy for customer satisfaction</li>
                    <li>• Use order notes for special instructions</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default OrdersGuide;
