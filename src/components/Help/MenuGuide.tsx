
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HelpCircle, 
  Menu, 
  Plus, 
  Edit, 
  Image,
  DollarSign,
  Tag,
  Star,
  Trash2,
  Search
} from "lucide-react";

const MenuGuide = () => {
  const features = [
    {
      title: "Add Menu Items",
      icon: <Plus className="w-5 h-5" />,
      description: "Create new dishes and beverages for your menu",
      steps: [
        "Click 'Add New Item' button",
        "Enter item name and description",
        "Set price and category",
        "Upload item image",
        "Add ingredients and allergen information",
        "Set availability status and save"
      ]
    },
    {
      title: "Menu Categories",
      icon: <Tag className="w-5 h-5" />,
      description: "Organize menu items into logical categories",
      steps: [
        "Create categories (Appetizers, Mains, Desserts, etc.)",
        "Assign items to appropriate categories",
        "Set category display order",
        "Enable/disable categories by time of day",
        "Create special menu sections"
      ]
    },
    {
      title: "Pricing Management",
      icon: <DollarSign className="w-5 h-5" />,
      description: "Manage item pricing and special offers",
      steps: [
        "Set base prices for all items",
        "Create size/portion variations",
        "Set up happy hour pricing",
        "Configure seasonal price changes",
        "Add promotional discounts"
      ]
    }
  ];

  const menuCategories = [
    { name: "Appetizers", color: "bg-orange-500", items: "Starters, Snacks, Small Plates" },
    { name: "Main Courses", color: "bg-red-500", items: "Entrees, Primary Dishes" },
    { name: "Desserts", color: "bg-pink-500", items: "Sweet Treats, After-dinner" },
    { name: "Beverages", color: "bg-blue-500", items: "Drinks, Cocktails, Coffee" },
    { name: "Specials", color: "bg-purple-500", items: "Chef's Specials, Daily Offers" }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="w-4 h-4 mr-2" />
          Menu Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Menu className="w-5 h-5" />
            Menu Management Guide
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="tips">Best Practices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Menu Management System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <img 
                    src="photo-1488590528505-98d2b5aba04b" 
                    alt="Digital menu management interface" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <p>The Menu Management system allows you to create, organize, and maintain your restaurant's digital menu. Manage items, categories, pricing, and availability all in one place.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Key Features</h3>
                    <ul className="text-sm space-y-1">
                      <li>• Digital menu creation</li>
                      <li>• Category organization</li>
                      <li>• Price management</li>
                      <li>• Image uploads</li>
                      <li>• Availability control</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Benefits</h3>
                    <ul className="text-sm space-y-1">
                      <li>• Easy menu updates</li>
                      <li>• Consistent pricing</li>
                      <li>• Better item presentation</li>
                      <li>• Real-time availability</li>
                      <li>• Analytics and insights</li>
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

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Menu Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Organize your menu items into logical categories for better customer navigation and order management.</p>
                
                <div className="space-y-3">
                  {menuCategories.map((category, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`w-4 h-4 rounded-full ${category.color}`}></div>
                      <div className="flex-1">
                        <span className="font-medium">{category.name}</span>
                        <p className="text-sm text-muted-foreground">{category.items}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Category Management Tips</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Keep categories simple and intuitive</li>
                    <li>• Use consistent naming conventions</li>
                    <li>• Order categories by popularity or flow</li>
                    <li>• Create seasonal or special event categories</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Photo Guidelines
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• Use high-quality, well-lit photos</li>
                    <li>• Maintain consistent image sizes</li>
                    <li>• Show actual portion sizes accurately</li>
                    <li>• Update photos when recipes change</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Description Writing
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• Write clear, appetizing descriptions</li>
                    <li>• Include key ingredients and cooking methods</li>
                    <li>• Mention allergens and dietary information</li>
                    <li>• Keep descriptions concise but informative</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Pricing Strategy
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• Research competitor pricing regularly</li>
                    <li>• Consider food cost percentages</li>
                    <li>• Use psychological pricing ($9.99 vs $10.00)</li>
                    <li>• Test price changes gradually</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Menu Optimization
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• Track item popularity and profitability</li>
                    <li>• Remove or revise poor-performing items</li>
                    <li>• Highlight signature dishes</li>
                    <li>• Seasonal menu updates</li>
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

export default MenuGuide;
