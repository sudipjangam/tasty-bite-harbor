
import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "@/hooks/useTheme";
import { PieChart as PieChartIcon } from "lucide-react";

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

interface RevenueByCategoryChartProps {
  data: CategoryData[];
}

type TimePeriod = '7d' | '30d' | '90d' | '1y';

const COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#f43f5e', '#6366f1'];

const RevenueByCategoryChart = ({ data }: RevenueByCategoryChartProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  
  // In a real app, we would filter data by time period here
  // For this demo, we'll just use the provided data
  
  // Sort data by value (revenue) in descending order
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Revenue by Menu Category</CardTitle>
          <div className="flex items-center">
            <div className="flex items-center mr-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '7d' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('7d')}
              >
                7D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '30d' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('30d')}
              >
                30D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '90d' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('90d')}
              >
                90D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '1y' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('1y')}
              >
                1Y
              </button>
            </div>
            <PieChartIcon className="h-5 w-5 text-purple-500" />
          </div>
        </div>
        <CardDescription>Distribution of revenue across menu categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center">
          <div className="w-full md:w-2/3 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sortedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  labelLine={false}
                >
                  {sortedData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke={isDarkMode ? '#334155' : '#ffffff'}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                <Tooltip 
                  formatter={(value) => [`₹${value}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                    border: isDarkMode ? '1px solid #4B5563' : '1px solid #E5E7EB',
                    borderRadius: '0.375rem',
                    color: isDarkMode ? '#F9FAFB' : '#1F2937'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/3">
            <div className="mt-4 md:mt-0 space-y-2">
              {sortedData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">₹{item.value.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 ml-1">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueByCategoryChart;
