
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Edit, Trash2 } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  isAvailable: boolean;
  image?: string;
  tags: string[];
}

const ModernMenuGrid = () => {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sample menu items
  const menuItems: MenuItem[] = [
    {
      id: "1",
      name: "Classic Cheeseburger",
      price: 12.99,
      description: "Juicy beef patty with melted cheddar, lettuce, tomato, and special sauce on a brioche bun",
      category: "mains",
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGNoZWVzZWJ1cmdlcnxlbnwwfHwwfHx8MA%3D%3D",
      tags: ["beef", "popular", "lunch"]
    },
    {
      id: "2",
      name: "Caesar Salad",
      price: 9.99,
      description: "Crisp romaine lettuce with parmesan, croutons, and Caesar dressing",
      category: "starters",
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y2Flc2FyJTIwc2FsYWR8ZW58MHx8MHx8fDA%3D",
      tags: ["vegetarian", "healthy"]
    },
    {
      id: "3",
      name: "Truffle Fries",
      price: 7.99,
      description: "Golden fries tossed with truffle oil, parmesan, and herbs",
      category: "sides",
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1639024471283-15c2594dcdad?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fHRydWZmbGUlMjBmcmllc3xlbnwwfHwwfHx8MA%3D%3D",
      tags: ["vegetarian", "popular"]
    },
    {
      id: "4",
      name: "Chocolate Lava Cake",
      price: 8.99,
      description: "Warm chocolate cake with a molten center, served with vanilla ice cream",
      category: "desserts",
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1617305855558-867531586211?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y2hvY29sYXRlJTIwbGF2YSUyMGNha2V8ZW58MHx8MHx8fDA%3D",
      tags: ["sweet", "popular"]
    },
    {
      id: "5",
      name: "Fresh Mojito",
      price: 10.99,
      description: "Refreshing mix of lime, mint, sugar, and rum",
      category: "drinks",
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bW9qaXRvfGVufDB8fDB8fHww",
      tags: ["alcoholic", "refreshing"]
    },
    {
      id: "6",
      name: "Margherita Pizza",
      price: 14.99,
      description: "Classic pizza with tomato sauce, fresh mozzarella, and basil",
      category: "mains",
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bWFyZ2hlcml0YSUyMHBpenphfGVufDB8fDB8fHww",
      tags: ["vegetarian", "popular"]
    }
  ];

  // Filter menu items based on category and search query
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = filter === "all" || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs defaultValue="all" value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="starters">Starters</TabsTrigger>
            <TabsTrigger value="mains">Mains</TabsTrigger>
            <TabsTrigger value="sides">Sides</TabsTrigger>
            <TabsTrigger value="desserts">Desserts</TabsTrigger>
            <TabsTrigger value="drinks">Drinks</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search menu items..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button className="whitespace-nowrap">
            <Plus className="mr-1 h-4 w-4" /> Add Menu Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

interface MenuItemCardProps {
  item: MenuItem;
}

const MenuItemCard = ({ item }: MenuItemCardProps) => {
  return (
    <Card className="overflow-hidden border border-gray-200 group">
      <div className="relative h-48 overflow-hidden">
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">No image</span>
          </div>
        )}
        
        <div className="absolute top-3 right-3">
          <Badge className={`${item.isAvailable ? 'bg-green-500' : 'bg-gray-500'}`}>
            {item.isAvailable ? 'Available' : 'Unavailable'}
          </Badge>
        </div>
      </div>

      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-lg">{item.name}</h3>
          <span className="text-blue-600 font-medium">${item.price.toFixed(2)}</span>
        </div>
        
        <p className="text-gray-500 text-sm mt-2 line-clamp-2">{item.description}</p>
        
        <div className="flex gap-1 mt-3 flex-wrap">
          {item.tags.map((tag, index) => (
            <span 
              key={index} 
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex mt-4 justify-between">
          <Button variant="outline" size="sm" className="text-blue-600">
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button variant="outline" size="sm" className={item.isAvailable ? "text-amber-600" : "text-green-600"}>
            {item.isAvailable ? "Mark Unavailable" : "Mark Available"}
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModernMenuGrid;
