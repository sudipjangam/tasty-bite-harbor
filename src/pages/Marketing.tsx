
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/Layout/PageHeader";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { useMarketingData } from "@/hooks/useMarketingData";
import CampaignsList from "@/components/Marketing/CampaignsList";
import CreateCampaignDialog from "@/components/Marketing/CreateCampaignDialog";
import CustomerSegments from "@/components/Marketing/CustomerSegments";
import MarketingAnalytics from "@/components/Marketing/MarketingAnalytics";
import { 
  Plus, 
  Users, 
  Mail, 
  MessageSquare, 
  TrendingUp,
  Target,
  DollarSign,
  Calendar
} from "lucide-react";

const Marketing = () => {
  const { user } = useAuth();
  const { campaigns, customers, analytics, isLoading } = useMarketingData();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('campaigns');

  const tabs = [
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'segments', label: 'Customer Segments', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <PageHeader
        title="Marketing Center"
        description="Create campaigns, analyze customer data, and drive business growth"
      />

      {/* Marketing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StandardizedCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Campaigns</p>
              <p className="text-2xl font-bold text-blue-600">
                {campaigns.filter(c => c.status === 'active').length}
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </StandardizedCard>
        
        <StandardizedCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold text-green-600">{customers.length}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </StandardizedCard>
        
        <StandardizedCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Messages Sent</p>
              <p className="text-2xl font-bold text-purple-600">{analytics.messagesSent}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-purple-500" />
          </div>
        </StandardizedCard>
        
        <StandardizedCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Revenue Impact</p>
              <p className="text-2xl font-bold text-orange-600">₹{analytics.revenueImpact}</p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-500" />
          </div>
        </StandardizedCard>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white dark:bg-gray-800 p-1 rounded-lg border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Marketing Campaigns</h2>
            <StandardizedButton
              onClick={() => setOpenCreateDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Campaign
            </StandardizedButton>
          </div>
          <CampaignsList campaigns={campaigns} />
        </div>
      )}

      {activeTab === 'segments' && (
        <CustomerSegments customers={customers} />
      )}

      {activeTab === 'analytics' && (
        <MarketingAnalytics analytics={analytics} />
      )}

      <CreateCampaignDialog
        open={openCreateDialog}
        onOpenChange={setOpenCreateDialog}
      />
    </div>
  );
};

export default Marketing;
