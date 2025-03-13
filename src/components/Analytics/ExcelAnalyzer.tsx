
import React, { useState } from 'react';
import { read, utils } from 'xlsx';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, BarChart3, PieChart, TrendingUp } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface AnalysisInsight {
  type: 'info' | 'success' | 'warning';
  title: string;
  message: string;
}

interface AnalysisResult {
  fileName: string;
  totalRows: number;
  columnCount: number;
  uniqueProducts?: number;
  totalSales?: number;
  avgValue?: number;
  topProduct?: string;
  dateRange?: string;
  insights: AnalysisInsight[];
  chartData?: any[];
}

const ExcelAnalyzer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  fileData?: File;
}> = ({ isOpen, onClose, fileData }) => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (fileData && isOpen) {
      analyzeFile(fileData);
    }
  }, [fileData, isOpen]);

  const analyzeFile = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = utils.sheet_to_json(sheet);
          
          console.log("=== EXCEL FILE ANALYSIS DATA ===");
          console.log("File name:", file.name);
          console.log("Sheet names:", workbook.SheetNames);
          console.log("Raw JSON data sample:", jsonData.slice(0, 5));
          
          if (jsonData.length === 0) {
            toast({
              title: "Analysis Error",
              description: "The spreadsheet appears to be empty.",
              variant: "destructive",
            });
            setIsAnalyzing(false);
            return;
          }

          // Basic analysis
          const totalRows = jsonData.length;
          const columnCount = Object.keys(jsonData[0]).length;
          
          // Attempt to determine if this is sales data
          const isSalesData = detectSalesData(jsonData);
          
          let insights: AnalysisInsight[] = [];
          let chartData: any[] = [];
          let uniqueProducts: number | undefined;
          let totalSales: number | undefined;
          let avgValue: number | undefined;
          let topProduct: string | undefined;
          let dateRange: string | undefined;
          
          if (isSalesData) {
            const salesAnalysis = analyzeSalesData(jsonData);
            uniqueProducts = salesAnalysis.uniqueProducts;
            totalSales = salesAnalysis.totalSales;
            avgValue = salesAnalysis.avgOrderValue;
            topProduct = salesAnalysis.topProduct;
            dateRange = salesAnalysis.dateRange;
            insights = salesAnalysis.insights;
            chartData = salesAnalysis.chartData;
            
            console.log("Sales data detected:", {
              uniqueProducts,
              totalSales,
              avgValue,
              topProduct,
              dateRange
            });
          } else {
            // Generic data analysis
            insights = [
              {
                type: 'info',
                title: 'General Data Analysis',
                message: `This spreadsheet contains ${totalRows} rows of data with ${columnCount} columns.`
              },
              {
                type: 'info',
                title: 'Data Type',
                message: 'This doesn\'t appear to be sales data. Consider uploading sales, inventory, or customer data for more detailed analysis.'
              }
            ];
            
            // Generate generic chart data
            chartData = generateGenericChartData(jsonData);
            console.log("Generic data analysis:", {
              totalRows,
              columnCount,
              chartData: chartData.slice(0, 3)
            });
          }
          
          const resultData = {
            fileName: file.name,
            totalRows,
            columnCount,
            uniqueProducts,
            totalSales,
            avgValue,
            topProduct,
            dateRange,
            insights,
            chartData
          };
          
          console.log("Final analysis result:", resultData);
          setAnalysisResult(resultData);
          
          toast({
            title: "Analysis Complete",
            description: `Successfully analyzed ${file.name}`,
          });
        } catch (error) {
          console.error("Analysis error:", error);
          toast({
            title: "Analysis Error",
            description: "Failed to analyze the Excel file. Please check the file format.",
            variant: "destructive",
          });
        }
        setIsAnalyzing(false);
      };
      
      reader.onerror = () => {
        toast({
          title: "File Error",
          description: "Failed to read the Excel file.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("File processing error:", error);
      toast({
        title: "Processing Error",
        description: "An error occurred while processing the file.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };

  // Helper function to detect if the data looks like sales data
  const detectSalesData = (data: any[]): boolean => {
    if (data.length === 0) return false;
    
    const firstRow = data[0];
    const keys = Object.keys(firstRow).map(k => k.toLowerCase());
    
    // Check if keys contain common sales data column names
    const salesKeywords = ['sale', 'order', 'product', 'price', 'quantity', 'amount', 'total', 'revenue', 'customer'];
    return salesKeywords.some(keyword => 
      keys.some(k => k.includes(keyword))
    );
  };

  // Analyze sales data
  const analyzeSalesData = (data: any[]) => {
    // Identify potential column names (case insensitive)
    const findColumn = (keywords: string[]): string | null => {
      if (data.length === 0) return null;
      
      const columns = Object.keys(data[0]);
      for (const keyword of keywords) {
        const match = columns.find(col => 
          col.toLowerCase().includes(keyword.toLowerCase())
        );
        if (match) return match;
      }
      return null;
    };
    
    const productColumn = findColumn(['product', 'item', 'name', 'description']) || Object.keys(data[0])[0];
    const priceColumn = findColumn(['price', 'amount', 'total', 'revenue', 'value']) || Object.keys(data[0])[1];
    const quantityColumn = findColumn(['quantity', 'qty', 'count', 'units']) || null;
    const dateColumn = findColumn(['date', 'time', 'created', 'ordered']) || null;
    
    console.log("Detected columns:", {
      productColumn,
      priceColumn,
      quantityColumn,
      dateColumn
    });
    
    // Product analysis
    const productCounts: Record<string, number> = {};
    const productRevenue: Record<string, number> = {};
    let totalRevenue = 0;
    
    data.forEach(row => {
      const product = String(row[productColumn] || 'Unknown');
      const price = parseFloat(row[priceColumn]) || 0;
      const quantity = quantityColumn ? (parseFloat(row[quantityColumn]) || 1) : 1;
      
      if (!productCounts[product]) productCounts[product] = 0;
      productCounts[product] += quantity;
      
      if (!productRevenue[product]) productRevenue[product] = 0;
      productRevenue[product] += price * quantity;
      
      totalRevenue += price * quantity;
    });
    
    // Get unique products
    const uniqueProducts = Object.keys(productCounts).length;
    
    // Get top product by quantity
    const topProductByQuantity = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    // Get top product by revenue
    const topProductByRevenue = Object.entries(productRevenue)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    // Get date range if available
    let dateRange = undefined;
    if (dateColumn) {
      try {
        const dates = data.map(row => new Date(row[dateColumn]));
        const validDates = dates.filter(d => !isNaN(d.getTime()));
        
        if (validDates.length > 0) {
          const minDate = new Date(Math.min(...validDates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...validDates.map(d => d.getTime())));
          dateRange = `${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`;
        }
      } catch (e) {
        console.error("Date parsing error:", e);
      }
    }
    
    // Generate insights
    const insights: AnalysisInsight[] = [
      {
        type: 'success',
        title: 'Sales Overview',
        message: `Total sales: ₹${totalRevenue.toFixed(2)} across ${uniqueProducts} unique products.`
      },
      {
        type: 'info',
        title: 'Top Products',
        message: `Best seller: ${topProductByQuantity} (by quantity), ${topProductByRevenue} (by revenue)`
      }
    ];
    
    // Add date range insight if available
    if (dateRange) {
      insights.push({
        type: 'info',
        title: 'Time Period',
        message: `This data covers the period: ${dateRange}`
      });
    }
    
    // Add recommendations
    const avgOrderValue = totalRevenue / data.length;
    insights.push({
      type: 'warning',
      title: 'Opportunity',
      message: avgOrderValue < 500 
        ? 'Average order value is low. Consider bundling products or offering premium options.'
        : 'Good average order value. Focus on increasing purchase frequency with loyalty programs.'
    });
    
    // Generate chart data
    const topProducts = Object.entries(productRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([product, revenue]) => ({
        name: product.length > 15 ? product.substring(0, 15) + '...' : product,
        revenue: parseFloat(revenue.toFixed(2))
      }));
    
    return {
      uniqueProducts,
      totalSales: totalRevenue,
      avgOrderValue: avgOrderValue,
      topProduct: topProductByRevenue,
      dateRange,
      insights,
      chartData: topProducts
    };
  };

  // Generate generic chart data for non-sales data
  const generateGenericChartData = (data: any[]): any[] => {
    if (data.length === 0) return [];
    
    // Use the first column as labels and second as values
    const keys = Object.keys(data[0]);
    if (keys.length < 2) return [];
    
    const labelColumn = keys[0];
    const valueColumn = keys[1];
    
    // Get value counts for the first 5-10 rows
    return data.slice(0, 8).map(row => ({
      name: String(row[labelColumn]).length > 15 
        ? String(row[labelColumn]).substring(0, 15) + '...' 
        : String(row[labelColumn]),
      value: parseFloat(row[valueColumn]) || 0
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Excel File Analysis</DialogTitle>
          <DialogDescription>
            Automated analysis of your uploaded data
          </DialogDescription>
        </DialogHeader>
        
        {isAnalyzing ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
            <Skeleton className="h-[200px] w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="h-[100px] w-full" />
            </div>
          </div>
        ) : analysisResult ? (
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Data Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">File:</span>
                      <span className="text-sm font-medium">{analysisResult.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Rows:</span>
                      <span className="text-sm font-medium">{analysisResult.totalRows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Columns:</span>
                      <span className="text-sm font-medium">{analysisResult.columnCount}</span>
                    </div>
                    {analysisResult.dateRange && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Period:</span>
                        <span className="text-sm font-medium">{analysisResult.dateRange}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {analysisResult.uniqueProducts !== undefined && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Sales Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Unique Products:</span>
                        <span className="text-sm font-medium">{analysisResult.uniqueProducts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Sales:</span>
                        <span className="text-sm font-medium">₹{analysisResult.totalSales?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg Value:</span>
                        <span className="text-sm font-medium">₹{analysisResult.avgValue?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Top Product:</span>
                        <span className="text-sm font-medium truncate max-w-[120px]" title={analysisResult.topProduct}>
                          {analysisResult.topProduct}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysisResult.insights.slice(0, 2).map((insight, index) => (
                      <div 
                        key={index}
                        className={`p-2 rounded-lg text-xs ${
                          insight.type === 'success' 
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' 
                            : insight.type === 'warning'
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
                            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        <p className="font-medium">{insight.title}</p>
                        <p>{insight.message}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysisResult.chartData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey={analysisResult.chartData?.[0]?.revenue !== undefined ? 'revenue' : 'value'} 
                        fill="#4299E1" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Insights & Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisResult.insights.map((insight, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg ${
                        insight.type === 'success' 
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                          : insight.type === 'warning'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                          : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          insight.type === 'success' 
                            ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300' 
                            : insight.type === 'warning'
                            ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300'
                            : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                        }`}>
                          {insight.type === 'success' ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : insight.type === 'warning' ? (
                            <AlertCircle className="h-5 w-5" />
                          ) : (
                            <BarChart3 className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h3 className={`font-medium ${
                            insight.type === 'success' 
                              ? 'text-green-800 dark:text-green-300' 
                              : insight.type === 'warning'
                              ? 'text-yellow-800 dark:text-yellow-300'
                              : 'text-blue-800 dark:text-blue-300'
                          }`}>
                            {insight.title}
                          </h3>
                          <p className={`mt-1 ${
                            insight.type === 'success' 
                              ? 'text-green-700 dark:text-green-400' 
                              : insight.type === 'warning'
                              ? 'text-yellow-700 dark:text-yellow-400'
                              : 'text-blue-700 dark:text-blue-400'
                          }`}>
                            {insight.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end">
              <Button onClick={onClose}>Close Analysis</Button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-muted-foreground">No file data available for analysis.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExcelAnalyzer;
