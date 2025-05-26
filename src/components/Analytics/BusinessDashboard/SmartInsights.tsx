
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBusinessDashboardData } from "@/hooks/useBusinessDashboardData";
import { Brain, TrendingUp, AlertTriangle, DollarSign, Users, Clock, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SmartInsights = () => {
  const { data: businessData, isLoading, error } = useBusinessDashboardData();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load business insights. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  const insights = businessData?.insights || [];
  const promotionalData = businessData?.promotionalData || [];
  const lowStockItems = businessData?.lowStockItems || [];
  const revenueTrend = businessData?.revenueTrend || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "suggested":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "paused":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getActionButton = (promotion: any) => {
    if (promotion.status === "suggested") {
      return (
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          Activate
        </Button>
      );
    } else if (promotion.status === "active") {
      return (
        <Button size="sm" variant="destructive">
          Deactivate
        </Button>
      );
    } else {
      return (
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          Activate
        </Button>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* AI-Generated Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI-Generated Business Insights
          </CardTitle>
          <CardDescription>
            Smart recommendations based on your restaurant's performance data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.length > 0 ? (
            insights.map((insight, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    {insight.type === "revenue" && <TrendingUp className="h-4 w-4 text-blue-600" />}
                    {insight.type === "inventory" && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                    {insight.type === "seasonal" && <Lightbulb className="h-4 w-4 text-purple-600" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{insight.message}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No insights available yet. More data is needed for AI analysis.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promotional Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Promotional Opportunities
          </CardTitle>
          <CardDescription>
            Optimize revenue with targeted promotions during peak periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          {promotionalData.length > 0 ? (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 py-2 border-b font-medium text-sm text-gray-600">
                <div className="col-span-3">Promotion Name</div>
                <div className="col-span-2">Time Period</div>
                <div className="col-span-2">Potential Increase</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3">Actions</div>
              </div>
              
              {/* Table Rows */}
              {promotionalData.map((promotion) => (
                <div key={promotion.id} className="grid grid-cols-12 gap-4 py-3 border-b hover:bg-gray-50 transition-colors">
                  <div className="col-span-3">
                    <span className="font-medium text-blue-600">{promotion.name}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">{promotion.timePeriod}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm font-medium text-blue-600">{promotion.potentialIncrease}</span>
                  </div>
                  <div className="col-span-2">
                    <Badge variant="outline" className={getStatusColor(promotion.status)}>
                      {promotion.status}
                    </Badge>
                  </div>
                  <div className="col-span-3 flex gap-2">
                    {getActionButton(promotion)}
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No promotional opportunities identified yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Revenue Performance Overview
          </CardTitle>
          <CardDescription>
            Weekly revenue trend and key performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Revenue Trend</p>
                  <p className="text-2xl font-bold text-green-900">
                    {revenueTrend > 0 ? '+' : ''}{revenueTrend.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-green-700 mt-1">vs. previous week</p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Active Promotions</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {promotionalData.filter(p => p.status === "active").length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs text-blue-700 mt-1">currently running</p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-800">Low Stock Items</p>
                  <p className="text-2xl font-bold text-amber-900">{lowStockItems.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
              <p className="text-xs text-amber-700 mt-1">need attention</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartInsights;
