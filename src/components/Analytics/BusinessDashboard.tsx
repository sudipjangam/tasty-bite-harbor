
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart3, 
  FileUp, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Tag, 
  Users, 
  Package, 
  Clock, 
  Lightbulb,
  List
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

// Mock data for expense breakdown
const expenseData = [
  { name: 'Ingredients', value: 35000, percentage: 42 },
  { name: 'Utilities', value: 12000, percentage: 14 },
  { name: 'Staff', value: 25000, percentage: 30 },
  { name: 'Rent', value: 8000, percentage: 10 },
  { name: 'Other', value: 3500, percentage: 4 }
];

// Mock data for peak hours
const peakHoursData = [
  { hour: '9 AM', customers: 10 },
  { hour: '10 AM', customers: 15 },
  { hour: '11 AM', customers: 25 },
  { hour: '12 PM', customers: 45 },
  { hour: '1 PM', customers: 55 },
  { hour: '2 PM', customers: 40 },
  { hour: '3 PM', customers: 28 },
  { hour: '4 PM', customers: 20 },
  { hour: '5 PM', customers: 30 },
  { hour: '6 PM', customers: 50 },
  { hour: '7 PM', customers: 62 },
  { hour: '8 PM', customers: 48 },
  { hour: '9 PM', customers: 30 },
  { hour: '10 PM', customers: 15 }
];

// Mock data for promotional opportunities
const promotionalData = [
  { id: 1, name: 'Happy Hour', timePeriod: '5 PM - 7 PM', potentialIncrease: '25%', status: 'active' },
  { id: 2, name: 'Weekend Brunch', timePeriod: 'Sat-Sun, 9 AM - 2 PM', potentialIncrease: '35%', status: 'active' },
  { id: 3, name: 'Monday Special', timePeriod: 'Every Monday', potentialIncrease: '20%', status: 'inactive' },
  { id: 4, name: 'Corporate Lunch', timePeriod: 'Weekdays, 12 PM - 2 PM', potentialIncrease: '30%', status: 'suggested' },
  { id: 5, name: 'Seasonal Menu', timePeriod: 'Oct - Dec', potentialIncrease: '40%', status: 'suggested' }
];

// Colors for charts
const COLORS = ['#4299E1', '#48BB78', '#F6AD55', '#F56565', '#805AD5'];

const BusinessDashboard = () => {
  const [activeTab, setActiveTab] = useState('expenses');
  const [documents, setDocuments] = useState<{name: string, type: string, date: string, insights: string}[]>([
    { name: 'Q3_Revenue_Report.xlsx', type: 'Excel', date: '2023-10-12', insights: 'Revenue increased by 12% compared to Q2' },
    { name: 'Staff_Performance_2023.pdf', type: 'PDF', date: '2023-09-28', insights: 'New hiring needs identified for weekend shifts' },
    { name: 'Inventory_Analysis.xlsx', type: 'Excel', date: '2023-10-05', insights: 'Potential savings of 8% on bulk ordering' }
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).map(file => ({
        name: file.name,
        type: file.type.includes('sheet') ? 'Excel' : file.type.includes('pdf') ? 'PDF' : 'Other',
        date: new Date().toISOString().split('T')[0],
        insights: 'Processing... Analysis will be available soon'
      }));
      
      setDocuments([...newFiles, ...documents]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-dark-grey dark:text-brand-light-grey">
            Business Intelligence Dashboard
          </h2>
          <p className="text-muted-foreground">
            Comprehensive analytics to optimize your restaurant operations
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button className="flex items-center gap-2" variant="outline">
            <List className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.pdf,.jpg,.png"
            />
            <label htmlFor="file-upload">
              <Button className="flex items-center gap-2" variant="default">
                <FileUp className="h-4 w-4" />
                <span>Upload Data</span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                Operational Costs
              </CardTitle>
            </div>
            <CardDescription>Monthly expense breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹83,500</div>
            <div className="text-xs text-muted-foreground mb-4">
              <span className="text-green-600 dark:text-green-400">↓ 3.2%</span> from last month
            </div>
            <div className="space-y-2">
              {expenseData.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="text-sm font-medium">
                    ₹{item.value.toLocaleString()}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                Peak Hours
              </CardTitle>
            </div>
            <CardDescription>Customer traffic by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHoursData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="customers" fill="#48BB78" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                Smart Insights
              </CardTitle>
            </div>
            <CardDescription>Key business opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Revenue Opportunity</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Monday lunch hours (12-2 PM) are underperforming by 40% compared to other weekdays. Consider a lunch special promotion.
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Inventory Alert</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Seafood costs increased by 15% this month. Consider menu price adjustments or alternative suppliers.
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">Seasonal Opportunity</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Festival season approaching. Prepare for 30% increase in weekend traffic based on previous year's data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full md:w-auto border dark:border-gray-700 p-0">
          <TabsTrigger value="expenses" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Financial Analytics
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Document Repository
          </TabsTrigger>
          <TabsTrigger value="promotions" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Promotional Strategy
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Expense Breakdown</CardTitle>
              <CardDescription>
                Detailed analysis of operational costs by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenseData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" />
                        <Tooltip 
                          formatter={(value) => [`₹${value}`, 'Expense']}
                        />
                        <Legend />
                        <Bar dataKey="value" fill="#4299E1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          labelLine={false}
                        >
                          {expenseData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`₹${value}`, 'Expense']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-base font-medium mb-3">Monthly Trend Analysis</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Current Month</TableHead>
                        <TableHead>Previous Month</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>YTD Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseData.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>₹{item.value.toLocaleString()}</TableCell>
                          <TableCell>₹{Math.round(item.value * (1 + (Math.random() * 0.2 - 0.1))).toLocaleString()}</TableCell>
                          <TableCell className={Math.random() > 0.5 ? "text-green-600" : "text-red-600"}>
                            {Math.random() > 0.5 ? "↓" : "↑"} {Math.round(Math.random() * 10)}%
                          </TableCell>
                          <TableCell>₹{Math.round(item.value * 9).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="font-bold">₹83,500</TableCell>
                        <TableCell className="font-bold">₹86,200</TableCell>
                        <TableCell className="font-bold text-green-600">↓ 3.2%</TableCell>
                        <TableCell className="font-bold">₹752,000</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-600" />
                  Inventory Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Produce</span>
                      <span className="text-sm font-medium">75%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Seafood</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Meat</span>
                      <span className="text-sm font-medium">60%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Beverages</span>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-600" />
                  Staff Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Chefs</span>
                    <span className="text-sm font-medium">₹12,500</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Wait Staff</span>
                    <span className="text-sm font-medium">₹8,200</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cleaning</span>
                    <span className="text-sm font-medium">₹2,500</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Management</span>
                    <span className="text-sm font-medium">₹1,800</span>
                  </div>
                  <div className="pt-2 mt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total</span>
                      <span className="text-sm font-bold">₹25,000</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="text-green-600">↓ 2.5%</span> from last month
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  Peak Hours Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">Lunch (12PM-2PM)</span>
                      <span className="text-sm font-medium">₹15,200</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      +12% from last month
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">Dinner (7PM-9PM)</span>
                      <span className="text-sm font-medium">₹28,500</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      +8% from last month
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">Weekend</span>
                      <span className="text-sm font-medium">₹42,000</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      +15% from last month
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">Weekday</span>
                      <span className="text-sm font-medium">₹28,000</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      +5% from last month
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Management</CardTitle>
              <CardDescription>
                Upload and analyze business data from various sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium">Recent Documents</h3>
                  <input
                    type="file"
                    id="file-upload-inline"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".xlsx,.xls,.pdf,.jpg,.png"
                  />
                  <label htmlFor="file-upload-inline">
                    <Button size="sm" variant="outline" className="flex items-center gap-2">
                      <FileUp className="h-4 w-4" />
                      <span>Upload Files</span>
                    </Button>
                  </label>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Insights</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              doc.type === 'Excel' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                : doc.type === 'PDF'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {doc.type}
                            </span>
                          </TableCell>
                          <TableCell>{doc.date}</TableCell>
                          <TableCell>{doc.insights}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">View</Button>
                              <Button variant="ghost" size="sm">Analyze</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Document Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Quarterly Revenue</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Based on your Q3 report, your revenue has increased by 12% compared to the same period last year.
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">Inventory Optimization</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Your inventory analysis shows potential for 8% cost reduction through bulk ordering.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Document Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { month: 'Jan', documents: 5 },
                          { month: 'Feb', documents: 8 },
                          { month: 'Mar', documents: 12 },
                          { month: 'Apr', documents: 7 },
                          { month: 'May', documents: 10 },
                          { month: 'Jun', documents: 15 },
                          { month: 'Jul', documents: 8 },
                          { month: 'Aug', documents: 12 },
                          { month: 'Sep', documents: 18 },
                          { month: 'Oct', documents: 14 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="documents" fill="#4299E1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-sm text-muted-foreground mt-4 text-center">
                      Document uploads by month in 2023
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="promotions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Promotional Opportunities</CardTitle>
              <CardDescription>
                Optimize revenue with targeted promotions during peak periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Promotion Name</TableHead>
                      <TableHead>Time Period</TableHead>
                      <TableHead>Potential Increase</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotionalData.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell className="font-medium">{promo.name}</TableCell>
                        <TableCell>{promo.timePeriod}</TableCell>
                        <TableCell>{promo.potentialIncrease}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            promo.status === 'active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                              : promo.status === 'inactive'
                              ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}>
                            {promo.status.charAt(0).toUpperCase() + promo.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant={promo.status === 'active' ? 'destructive' : 'default'} 
                              size="sm"
                            >
                              {promo.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button variant="outline" size="sm">Edit</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-8">
                <h3 className="text-base font-medium mb-4">Create New Promotion</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" htmlFor="promo-name">
                        Promotion Name
                      </label>
                      <input
                        id="promo-name"
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="Enter promotion name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" htmlFor="time-period">
                        Time Period
                      </label>
                      <input
                        id="time-period"
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Mon-Fri, 3 PM - 6 PM"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" htmlFor="discount">
                        Discount Offered
                      </label>
                      <input
                        id="discount"
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="e.g., 15% off, Buy One Get One"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="description">
                      Description
                    </label>
                    <textarea
                      id="description"
                      className="w-full p-2 border border-gray-300 rounded-md h-[113px]"
                      placeholder="Describe the promotion details"
                    ></textarea>
                    <div className="mt-4">
                      <Button className="w-full">Create Promotion</Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4 text-purple-600" />
                      Promotion Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Happy Hour</span>
                        <span className="text-sm font-medium text-green-600">+28% Revenue</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Weekend Brunch</span>
                        <span className="text-sm font-medium text-green-600">+35% Revenue</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Corporate Lunch (Potential)</span>
                        <span className="text-sm font-medium text-gray-600">Est. +30% Revenue</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gray-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      Upcoming Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Festival Season (Oct-Nov)</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Prepare special menu and promotions for the upcoming festival season
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">Corporate Events (Dec)</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Target corporate holiday parties with special group packages
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">New Year's Eve</p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          Create an exclusive fixed-price menu for New Year's celebration
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessDashboard;
