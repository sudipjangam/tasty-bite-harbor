
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Award, Gift } from 'lucide-react';

type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'None';

interface LoyaltyBadgeProps {
  tier: LoyaltyTier;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const LoyaltyBadge: React.FC<LoyaltyBadgeProps> = ({ 
  tier, 
  size = 'md',
  showIcon = true 
}) => {
  if (tier === 'None') return null;
  
  const getTierIcon = () => {
    switch (tier) {
      case 'Bronze':
        return <Trophy className="h-3.5 w-3.5 mr-1" />;
      case 'Silver':
        return <Star className="h-3.5 w-3.5 mr-1" />;
      case 'Gold':
        return <Award className="h-3.5 w-3.5 mr-1" />;
      case 'Platinum':
      case 'Diamond':
        return <Gift className="h-3.5 w-3.5 mr-1" />;
      default:
        return null;
    }
  };
  
  const getTierColor = () => {
    switch (tier) {
      case 'Bronze':
        return "bg-amber-700 hover:bg-amber-800 text-amber-50";
      case 'Silver':
        return "bg-slate-400 hover:bg-slate-500 text-slate-50";
      case 'Gold':
        return "bg-amber-500 hover:bg-amber-600 text-amber-50";
      case 'Platinum':
        return "bg-sky-500 hover:bg-sky-600 text-sky-50";
      case 'Diamond':
        return "bg-violet-500 hover:bg-violet-600 text-violet-50";
      default:
        return "bg-gray-500 hover:bg-gray-600 text-gray-50";
    }
  };
  
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return "text-xs px-1.5 py-0.5";
      case 'lg':
        return "text-sm px-3 py-1";
      case 'md':
      default:
        return "text-xs px-2 py-0.5";
    }
  };
  
  return (
    <Badge 
      className={`${getTierColor()} ${getSizeClasses()} font-medium flex items-center`}
    >
      {showIcon && getTierIcon()}
      {tier}
    </Badge>
  );
};

export default LoyaltyBadge;
