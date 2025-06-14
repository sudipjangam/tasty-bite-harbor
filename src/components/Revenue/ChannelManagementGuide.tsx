
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  HelpCircle, 
  Wifi, 
  Database, 
  Calendar, 
  Bell, 
  Settings, 
  TrendingUp, 
  Shield, 
  Zap,
  Globe,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  Layers
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ChannelManagementGuide = () => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const features = [
    {
      id: "connections",
      title: "OTA Channel Connections",
      icon: <Wifi className="w-6 h-6" />,
      color: "bg-blue-500",
      description: "Connect and manage your Online Travel Agency partnerships",
      benefits: [
        "Direct API integration with major OTAs",
        "Real-time connection status monitoring",
        "Secure credential management",
        "Automated connection testing"
      ],
      steps: [
        "Navigate to Connections tab",
        "Select your OTA channel",
        "Click Configure button",
        "Enter API credentials provided by OTA",
        "Test connection and save"
      ]
    },
    {
      id: "rates",
      title: "Rate Synchronization",
      icon: <Database className="w-6 h-6" />,
      color: "bg-green-500",
      description: "Automatically sync room rates across all channels",
      benefits: [
        "Consistent pricing across platforms",
        "Dynamic rate adjustments",
        "Competitor price monitoring",
        "Revenue optimization"
      ],
      steps: [
        "Go to Rate Sync tab",
        "Choose your pricing strategy",
        "Set update frequency",
        "Configure rate plans",
        "Enable auto-sync"
      ]
    },
    {
      id: "availability",
      title: "Availability Management",
      icon: <Calendar className="w-6 h-6" />,
      color: "bg-purple-500",
      description: "Manage room inventory and prevent overbooking",
      benefits: [
        "Real-time inventory updates",
        "Overbooking prevention",
        "Channel-specific availability",
        "Automated stop-sell management"
      ],
      steps: [
        "Access Availability tab",
        "Set inventory buffers",
        "Configure room allocations",
        "Enable automatic updates",
        "Monitor occupancy levels"
      ]
    },
    {
      id: "automation",
      title: "Smart Automation",
      icon: <Bell className="w-6 h-6" />,
      color: "bg-orange-500",
      description: "Automate routine tasks and optimize performance",
      benefits: [
        "Reduced manual work",
        "24/7 monitoring",
        "Intelligent alerts",
        "Performance optimization"
      ],
      steps: [
        "Open Automation tab",
        "Enable auto-sync features",
        "Set sync intervals",
        "Configure pricing strategy",
        "Review automation rules"
      ]
    }
  ];

  const troubleshooting = [
    {
      issue: "Connection Failed",
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      solutions: [
        "Verify API credentials are correct",
        "Check if API endpoint is accessible",
        "Ensure your IP is whitelisted",
        "Contact OTA support for assistance"
      ]
    },
    {
      issue: "Rates Not Syncing",
      icon: <Clock className="w-5 h-5 text-yellow-500" />,
      solutions: [
        "Check if auto-sync is enabled",
        "Verify rate plan configurations",
        "Review sync frequency settings",
        "Manual sync to test connection"
      ]
    },
    {
      issue: "Inventory Mismatch",
      icon: <Shield className="w-5 h-5 text-blue-500" />,
      solutions: [
        "Check inventory buffer settings",
        "Verify room allocations",
        "Review booking confirmations",
        "Contact channel manager support"
      ]
    }
  ];

  const bestPractices = [
    {
      title: "Setup Best Practices",
      icon: <Target className="w-5 h-5" />,
      practices: [
        "Test connections in staging environment first",
        "Set appropriate inventory buffers (2-5 rooms)",
        "Use competitive pricing strategies",
        "Enable monitoring and alerts"
      ]
    },
    {
      title: "Daily Operations",
      icon: <BarChart3 className="w-5 h-5" />,
      practices: [
        "Monitor connection status daily",
        "Review rate competitiveness",
        "Check for booking discrepancies",
        "Update inventory as needed"
      ]
    },
    {
      title: "Performance Optimization",
      icon: <TrendingUp className="w-5 h-5" />,
      practices: [
        "Analyze channel performance regularly",
        "Adjust commission rates strategically",
        "Optimize rate plans for demand",
        "Use dynamic pricing during peak seasons"
      ]
    }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          Help & Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Channel Management Guide
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="troubleshooting">Help</TabsTrigger>
            <TabsTrigger value="best-practices">Best Practices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Channel Management Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">What is Channel Management?</h3>
                    <p className="text-sm text-muted-foreground">
                      Channel management allows you to connect with Online Travel Agencies (OTAs) 
                      like Booking.com, Expedia, and Agoda to distribute your rooms and manage 
                      bookings from a single platform.
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Key Benefits</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Increased online visibility</li>
                      <li>• Automated rate and inventory sync</li>
                      <li>• Reduced manual work</li>
                      <li>• Better revenue management</li>
                    </ul>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Channel Types</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Badge variant="secondary" className="justify-center p-2">
                      <Globe className="w-4 h-4 mr-1" />
                      OTA Channels
                    </Badge>
                    <Badge variant="outline" className="justify-center p-2">
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Direct Bookings
                    </Badge>
                    <Badge variant="outline" className="justify-center p-2">
                      <Settings className="w-4 h-4 mr-1" />
                      GDS Systems
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="grid gap-4">
              {features.map((feature) => (
                <Card key={feature.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${feature.color} text-white`}>
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2">Benefits:</h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {feature.benefits.map((benefit, index) => (
                                <li key={index} className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-2">How to use:</h4>
                            <ol className="text-xs text-muted-foreground space-y-1">
                              {feature.steps.map((step, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs">
                                    {index + 1}
                                  </span>
                                  {step}
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="troubleshooting" className="space-y-4">
            <div className="space-y-4">
              {troubleshooting.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {item.icon}
                      <div>
                        <h3 className="font-semibold mb-2">{item.issue}</h3>
                        <div className="space-y-1">
                          {item.solutions.map((solution, sIndex) => (
                            <div key={sIndex} className="flex items-center gap-2 text-sm">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                              {solution}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="best-practices" className="space-y-4">
            <div className="space-y-4">
              {bestPractices.map((category, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {category.icon}
                      <div>
                        <h3 className="font-semibold mb-2">{category.title}</h3>
                        <div className="space-y-1">
                          {category.practices.map((practice, pIndex) => (
                            <div key={pIndex} className="flex items-center gap-2 text-sm">
                              <Zap className="w-3 h-3 text-yellow-500" />
                              {practice}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ChannelManagementGuide;
