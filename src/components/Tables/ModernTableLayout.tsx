
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Users, Circle, Square, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TableData {
  id: string;
  name: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "maintenance";
  shape: "circle" | "rectangle";
  location: "window" | "center" | "back";
  accessible: boolean;
  occupiedSince?: string;
}

const ModernTableLayout = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sample tables data
  const tables: TableData[] = [
    {
      id: "1",
      name: "Table #1",
      capacity: 2,
      status: "available",
      shape: "circle",
      location: "window",
      accessible: true
    },
    {
      id: "2",
      name: "Table #2",
      capacity: 2,
      status: "occupied",
      shape: "circle",
      location: "window",
      accessible: true,
      occupiedSince: "12:30 PM"
    },
    {
      id: "3",
      name: "Table #3",
      capacity: 4,
      status: "reserved",
      shape: "rectangle",
      location: "center",
      accessible: false
    },
    {
      id: "4",
      name: "Table #4",
      capacity: 4,
      status: "available",
      shape: "rectangle",
      location: "center",
      accessible: true
    },
    {
      id: "5",
      name: "Table #5",
      capacity: 6,
      status: "occupied",
      shape: "rectangle",
      location: "back",
      accessible: true,
      occupiedSince: "11:15 PM"
    },
    {
      id: "6",
      name: "Table #6",
      capacity: 8,
      status: "available",
      shape: "rectangle",
      location: "back",
      accessible: true
    },
    {
      id: "7",
      name: "Table #7",
      capacity: 4,
      status: "reserved",
      shape: "circle",
      location: "window",
      accessible: true
    },
    {
      id: "8",
      name: "Table #8",
      capacity: 6,
      status: "maintenance",
      shape: "rectangle",
      location: "back",
      accessible: true
    },
    {
      id: "9",
      name: "Table #9",
      capacity: 2,
      status: "available",
      shape: "circle",
      location: "window",
      accessible: true
    }
  ];

  // Filter tables based on status and search query
  const filteredTables = tables.filter(table => {
    const matchesStatus = statusFilter === "all" || table.status === statusFilter;
    const matchesSearch = table.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-200";
      case "occupied":
        return "bg-red-100 text-red-800 border-red-200";
      case "reserved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "maintenance":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-medium">Table Layout</CardTitle>
          <p className="text-sm text-gray-500">Visual representation of your restaurant</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="border border-dashed border-gray-300 rounded-md p-6 h-80 relative bg-gray-50">
            {/* This is a placeholder for an actual interactive layout */}
            <div className="absolute left-4 top-4 px-4 py-2 bg-gray-200 rounded text-sm">Entrance</div>
            <div className="absolute right-4 top-4 px-4 py-2 bg-gray-200 rounded text-sm">Bar</div>
            <div className="absolute left-4 bottom-4 px-4 py-2 bg-gray-200 rounded text-sm">Kitchen</div>
            
            {/* Sample tables on the layout */}
            {tables.map((table, index) => {
              // Just a simple layout algorithm for demonstration
              const row = Math.floor(index / 3);
              const col = index % 3;
              const top = 25 + row * 25 + "%";
              const left = 25 + col * 25 + "%";
              
              return (
                <div 
                  key={table.id}
                  className={`absolute w-12 h-12 flex items-center justify-center rounded-full ${
                    table.status === 'available' ? 'bg-green-200' : 
                    table.status === 'occupied' ? 'bg-red-200' : 
                    table.status === 'reserved' ? 'bg-blue-200' : 'bg-amber-200'
                  }`}
                  style={{ top, left }}
                >
                  {table.id.split('#')[1]}
                </div>
              );
            })}
            
            {/* Legend */}
            <div className="absolute right-4 bottom-4 bg-white p-2 border border-gray-200 rounded shadow-sm">
              <div className="text-xs font-medium mb-1">Status</div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-200 rounded-full"></div>
                  <span className="text-xs">Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-200 rounded-full"></div>
                  <span className="text-xs">Occupied</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-200 rounded-full"></div>
                  <span className="text-xs">Reserved</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-amber-200 rounded-full"></div>
                  <span className="text-xs">Maintenance</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="occupied">Occupied</TabsTrigger>
            <TabsTrigger value="reserved">Reserved</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search tables..."
            className="w-full sm:w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Add Table
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredTables.map((table) => (
          <Card key={table.id} className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{table.name}</h3>
                    {table.accessible && (
                      <Badge variant="outline" className="text-xs">Accessible</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{table.capacity} people</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {table.shape === "circle" ? (
                        <><Circle className="h-3 w-3 mr-1" /> Circle</>
                      ) : (
                        <><Square className="h-3 w-3 mr-1" /> Rectangle</>
                      )}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{table.location}</Badge>
                  </div>
                  {table.occupiedSince && (
                    <p className="text-xs text-gray-500 mt-2">Occupied since: {table.occupiedSince}</p>
                  )}
                </div>
                <Badge className={getStatusColor(table.status)}>
                  {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                </Badge>
              </div>
              <div className="flex justify-between mt-4">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm">
                  Status
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ModernTableLayout;
