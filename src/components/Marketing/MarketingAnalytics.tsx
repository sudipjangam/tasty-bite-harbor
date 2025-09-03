
import React from 'react';
import { StandardizedCard } from '@/components/ui/standardized-card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown,
  MessageSquare, 
  DollarSign, 
  Users,
  Calendar,
  BarChart3
} from 'lucide-react';

interface MarketingAnalyticsProps {
  analytics: {
    messagesSent: number;
    revenueImpact: number;
    specialOccasions: number;
    campaignPerformance: Array<{
      id: string;
      name: string;
      sent: number;
      revenue: number;
    }>;
    messageGrowth?: number;
    revenueGrowth?: number;
    avgOrderValue?: number;
    repeatCustomerRate?: number;
    customerLifetimeValue?: number;
    churnRate?: number;
  };
}

const MarketingAnalytics: React.FC<MarketingAnalyticsProps> = ({ analytics }) => {
  const {
    messagesSent = 0,
    revenueImpact = 0,
    specialOccasions = 0,
    campaignPerformance = [],
    messageGrowth = 0,
    revenueGrowth = 0,
    avgOrderValue = 0,
    repeatCustomerRate = 0,
    customerLifetimeValue = 0,
    churnRate = 0
  } = analytics;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StandardizedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Messages Sent</p>
              <p className="text-2xl font-bold text-blue-600">{messagesSent}</p>
              <p className={`text-xs mt-1 ${messageGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {messageGrowth >= 0 ? (
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="inline h-3 w-3 mr-1" />
                )}
                {messageGrowth >= 0 ? '+' : ''}{messageGrowth.toFixed(1)}% from last month
              </p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-500" />
          </div>
        </StandardizedCard>
        
        <StandardizedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Revenue Impact</p>
              <p className="text-2xl font-bold text-green-600">₹{revenueImpact}</p>
              <p className={`text-xs mt-1 ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueGrowth >= 0 ? (
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="inline h-3 w-3 mr-1" />
                )}
                {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% from last month
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </StandardizedCard>
        
        <StandardizedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Special Occasions</p>
              <p className="text-2xl font-bold text-purple-600">{specialOccasions}</p>
              <p className="text-xs text-green-600 mt-1">
                <Calendar className="inline h-3 w-3 mr-1" />
                Upcoming opportunities
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500" />
          </div>
        </StandardizedCard>
      </div>

      {/* Campaign Performance */}
      <StandardizedCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Campaign Performance
          </h3>
        </div>
        
        {campaignPerformance.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No campaign data available yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaignPerformance.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {campaign.name}
                  </h4>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600">{campaign.sent} sent</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">₹{campaign.revenue} revenue</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">
                    {campaign.sent > 0 ? ((campaign.revenue / campaign.sent) * 100).toFixed(1) : 0}% ROI
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </StandardizedCard>

      {/* Marketing Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StandardizedCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Performing Channels
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="font-medium">WhatsApp</span>
              <div className="text-right">
                <Badge className="bg-green-100 text-green-800">92% open rate</Badge>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="font-medium">Email</span>
              <div className="text-right">
                <Badge className="bg-blue-100 text-blue-800">68% open rate</Badge>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <span className="font-medium">SMS</span>
              <div className="text-right">
                <Badge className="bg-yellow-100 text-yellow-800">85% open rate</Badge>
              </div>
            </div>
          </div>
        </StandardizedCard>

        <StandardizedCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Customer Engagement
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average Order Value</span>
              <span className="font-semibold">₹{avgOrderValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Repeat Customer Rate</span>
              <span className="font-semibold">{repeatCustomerRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Customer Lifetime Value</span>
              <span className="font-semibold">₹{customerLifetimeValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Churn Rate</span>
              <span className={`font-semibold ${churnRate > 15 ? 'text-red-600' : 'text-yellow-600'}`}>
                {churnRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </StandardizedCard>
      </div>
    </div>
  );
};

export default MarketingAnalytics;
