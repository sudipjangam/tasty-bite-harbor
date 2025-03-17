
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import MenuGrid from "@/components/Menu/MenuGrid";
import AddMenuItemForm from "@/components/Menu/AddMenuItemForm";

const Menu = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">Create and manage your restaurant's offerings</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="mt-4 sm:mt-0">
          <Plus className="mr-2 h-4 w-4" /> Add Menu Item
        </Button>
      </div>
      
      {showAddForm ? (
        <AddMenuItemForm onCancel={() => setShowAddForm(false)} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Tabs 
              defaultValue="all" 
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              className="w-full sm:w-auto"
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="appetizers">Appetizers</TabsTrigger>
                <TabsTrigger value="mains">Mains</TabsTrigger>
                <TabsTrigger value="desserts">Desserts</TabsTrigger>
                <TabsTrigger value="beverages">Beverages</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Input
              placeholder="Search menu items..."
              className="max-w-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <MenuGrid 
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            onEdit={() => {}}
          />
        </>
      )}
    </div>
  );
};

export default Menu;
