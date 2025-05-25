
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  onRefresh: () => void;
  timeRange: string;
  setTimeRange: (range: string) => void;
  isRefreshing: boolean;
}

const DashboardHeader = ({ 
  onRefresh, 
  timeRange, 
  setTimeRange, 
  isRefreshing 
}: DashboardHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Dashboard Overview
      </h1>
      
      <div className="flex items-center gap-3">
        <Tabs 
          value={timeRange} 
          onValueChange={setTimeRange} 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border/30"
        >
          <TabsList className="h-9 bg-transparent">
            <TabsTrigger 
              value="today" 
              className={cn(
                "text-xs px-3 rounded-md transition-colors", 
                timeRange === "today" ? "bg-primary text-white" : "text-muted-foreground"
              )}
            >
              Today
            </TabsTrigger>
            <TabsTrigger 
              value="week" 
              className={cn(
                "text-xs px-3 rounded-md transition-colors", 
                timeRange === "week" ? "bg-primary text-white" : "text-muted-foreground"
              )}
            >
              This Week
            </TabsTrigger>
            <TabsTrigger 
              value="month" 
              className={cn(
                "text-xs px-3 rounded-md transition-colors", 
                timeRange === "month" ? "bg-primary text-white" : "text-muted-foreground"
              )}
            >
              This Month
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button 
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10 h-9"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
