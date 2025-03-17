
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TableCard from "@/components/Tables/TableCard";
import TableDialog from "@/components/Tables/TableDialog";
import { useState } from "react";
import { Plus } from "lucide-react";

const Tables = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTable, setSelectedTable] = useState(null);

  // Sample tables data
  const tables = [
    { id: 1, name: "Table 1", seats: 2, status: "available", location: "Window" },
    { id: 2, name: "Table 2", seats: 4, status: "occupied", location: "Center" },
    { id: 3, name: "Table 3", seats: 6, status: "reserved", location: "Bar" },
    { id: 4, name: "Table 4", seats: 2, status: "available", location: "Window" },
    { id: 5, name: "Table 5", seats: 8, status: "occupied", location: "Center" },
    { id: 6, name: "Table 6", seats: 4, status: "reserved", location: "Bar" },
  ];

  const filteredTables = tables.filter(table => 
    table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    table.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tables</h1>
          <p className="text-muted-foreground">Manage your restaurant tables</p>
        </div>
        <Button onClick={() => {
          setSelectedTable(null);
          setIsDialogOpen(true);
        }} className="mt-4 sm:mt-0">
          <Plus className="mr-2 h-4 w-4" /> Add Table
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search tables..."
          className="max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Tables</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="occupied">Occupied</TabsTrigger>
          <TabsTrigger value="reserved">Reserved</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTables.map(table => (
              <TableCard 
                key={table.id}
                table={table}
                onEdit={() => {
                  setSelectedTable(table);
                  setIsDialogOpen(true);
                }}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="available" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTables
              .filter(table => table.status === "available")
              .map(table => (
                <TableCard 
                  key={table.id}
                  table={table}
                  onEdit={() => {
                    setSelectedTable(table);
                    setIsDialogOpen(true);
                  }}
                />
              ))}
          </div>
        </TabsContent>
        <TabsContent value="occupied" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTables
              .filter(table => table.status === "occupied")
              .map(table => (
                <TableCard 
                  key={table.id}
                  table={table}
                  onEdit={() => {
                    setSelectedTable(table);
                    setIsDialogOpen(true);
                  }}
                />
              ))}
          </div>
        </TabsContent>
        <TabsContent value="reserved" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTables
              .filter(table => table.status === "reserved")
              .map(table => (
                <TableCard 
                  key={table.id}
                  table={table}
                  onEdit={() => {
                    setSelectedTable(table);
                    setIsDialogOpen(true);
                  }}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>
      
      <TableDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        table={selectedTable}
      />
    </div>
  );
};

export default Tables;
