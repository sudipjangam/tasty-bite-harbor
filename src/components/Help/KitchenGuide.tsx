
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HelpCircle, 
  ChefHat, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Monitor,
  Timer,
  Users,
  TrendingUp
} from "lucide-react";

const KitchenGuide = () => {
  const features = [
    {
      title: "Kitchen Display System",
      icon: <Monitor className="w-5 h-5" />,
      description: "Real-time order display for kitchen staff",
      steps: [
        "Orders appear automatically from POS",
        "View order details and special instructions",
        "Track preparation times",
        "Update order status as you cook",
        "Mark orders as ready when complete"
      ]
    },
    {
      title: "Order Prioritization",
      icon: <AlertTriangle className="w-5 h-5" />,
      description: "Smart order sequencing for efficiency",
      steps: [
        "Orders sorted by preparation time",
        "Rush orders highlighted in red",
        "Delivery time estimates shown",
        "Priority indicators for VIP customers",
        "Automatic reordering based on urgency"
      ]
    },
    {
      title: "Time Management",
      icon: <Timer className="w-5 h-5" />,
      description: "Track cooking times and efficiency",
      steps: [
        "Automatic timer starts when order begins",
        "Target completion times displayed",
        "Average preparation time tracking",
        "Delay alerts for late orders",
        "Performance analytics for improvement"
      ]
    }
  ];

  const orderColumns = [
    { title: "New Orders", color: "bg-blue-500", description: "Incoming orders waiting to start" },
    { title: "In Progress", color: "bg-yellow-500", description: "Currently being prepared" },
    { title: "Ready", color: "bg-green-500", description: "Completed and ready to serve" },
    { title: "Delayed", color: "bg-red-500", description: "Orders taking longer than expected" }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="w-4 h-4 mr-2" />
          Kitchen Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Kitchen Display System Guide
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="tips">Best Practices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Kitchen Display System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <img 
                    src="photo-1461749280684-dccba630e2f6" 
                    alt="Kitchen display system showing orders" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <p>The Kitchen Display System (KDS) streamlines your kitchen operations by showing real-time orders, tracking preparation times, and coordinating between front-of-house and kitchen staff.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Key Benefits</h3>
                    <ul className="text-sm space-y-1">
                      <li>• Paperless order management</li>
                      <li>• Real-time order tracking</li>
                      <li>• Improved kitchen efficiency</li>
                      <li>• Better communication with service staff</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Display Features</h3>
                    <ul className="text-sm space-y-1">
                      <li>• Color-coded order status</li>
                      <li>• Preparation time tracking</li>
                      <li>• Special instruction highlights</li>
                      <li>• Rush order indicators</li>
                    </ul>
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
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
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
                <CardTitle>Kitchen Workflow Columns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orderColumns.map((column, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-4 h-4 rounded-full ${column.color}`}></div>
                        <h3 className="font-semibold">{column.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{column.description}</p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Order Flow Process</h4>
                  <p className="text-sm">Orders move from left to right across columns. Drag and drop orders between columns or use the status buttons to update progress.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Management Tips
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• Start with orders that take longest to prepare</li>
                    <li>• Batch similar items together for efficiency</li>
                    <li>• Keep an eye on preparation time targets</li>
                    <li>• Use prep time data to improve processes</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team Coordination
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• Assign orders to specific stations/chefs</li>
                    <li>• Communicate special requirements clearly</li>
                    <li>• Update status promptly for service team</li>
                    <li>• Use color coding for different meal types</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Performance Optimization
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• Monitor average preparation times</li>
                    <li>• Identify bottlenecks in the process</li>
                    <li>• Track peak hours for better planning</li>
                    <li>• Review daily performance reports</li>
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

export default KitchenGuide;
