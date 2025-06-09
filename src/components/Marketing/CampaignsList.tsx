
import React from 'react';
import { StandardizedCard } from '@/components/ui/standardized-card';
import { StandardizedButton } from '@/components/ui/standardized-button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Users, 
  MessageSquare, 
  DollarSign,
  Edit,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  discount_percentage: number;
  discount_amount: number;
  created_at: string;
}

interface CampaignsListProps {
  campaigns: Campaign[];
}

const CampaignsList: React.FC<CampaignsListProps> = ({ campaigns }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (campaigns.length === 0) {
    return (
      <StandardizedCard className="p-8 text-center">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No campaigns yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Create your first marketing campaign to start engaging with customers.
        </p>
      </StandardizedCard>
    );
  }

  return (
    <div className="grid gap-4">
      {campaigns.map((campaign) => (
        <StandardizedCard key={campaign.id} className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {campaign.name}
                </h3>
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </Badge>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                {campaign.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StandardizedButton variant="secondary" size="sm">
                <Edit className="h-4 w-4" />
              </StandardizedButton>
              <StandardizedButton variant="secondary" size="sm">
                {campaign.status === 'active' ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </StandardizedButton>
              <StandardizedButton variant="danger" size="sm">
                <Trash2 className="h-4 w-4" />
              </StandardizedButton>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm font-medium">
                  {format(new Date(campaign.start_date), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">End Date</p>
                <p className="text-sm font-medium">
                  {format(new Date(campaign.end_date), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Discount</p>
                <p className="text-sm font-medium">
                  {campaign.discount_percentage > 0 
                    ? `${campaign.discount_percentage}%` 
                    : `₹${campaign.discount_amount}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Reach</p>
                <p className="text-sm font-medium">0 customers</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Created {format(new Date(campaign.created_at), 'MMM dd, yyyy')}</span>
            </div>
            <StandardizedButton size="sm">
              View Details
            </StandardizedButton>
          </div>
        </StandardizedCard>
      ))}
    </div>
  );
};

export default CampaignsList;
