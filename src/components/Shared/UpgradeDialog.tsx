import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, ArrowRight, Crown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription?: string;
  requiredPlan: string;
  currentPlan: string;
}

const PLAN_COLORS: Record<string, string> = {
  'Starter': 'from-gray-500 to-gray-600',
  'Growth': 'from-blue-500 to-indigo-600',
  'Professional': 'from-purple-500 to-pink-600',
  'Enterprise': 'from-amber-500 to-orange-600',
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  'Starter': <Zap className="w-5 h-5" />,
  'Growth': <Sparkles className="w-5 h-5" />,
  'Professional': <Crown className="w-5 h-5" />,
  'Enterprise': <Crown className="w-5 h-5" />,
};

export const UpgradeDialog: React.FC<UpgradeDialogProps> = ({
  isOpen,
  onClose,
  featureName,
  featureDescription,
  requiredPlan,
  currentPlan,
}) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    // Navigate to settings page with subscription tab
    navigate('/settings?tab=subscription');
  };

  const gradientClass = PLAN_COLORS[requiredPlan] || PLAN_COLORS['Professional'];
  const PlanIcon = PLAN_ICONS[requiredPlan] || PLAN_ICONS['Professional'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className={`p-4 rounded-full bg-gradient-to-r ${gradientClass} shadow-lg`}>
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Upgrade to Unlock {featureName}
          </DialogTitle>
          <DialogDescription className="text-center">
            {featureDescription || `This feature requires the ${requiredPlan} plan or higher.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Plan */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-sm text-muted-foreground">Your current plan</span>
            <Badge variant="secondary" className="font-medium">
              {currentPlan}
            </Badge>
          </div>

          {/* Required Plan */}
          <div className={`flex items-center justify-between p-3 bg-gradient-to-r ${gradientClass} rounded-lg text-white`}>
            <span className="text-sm font-medium">Required plan</span>
            <div className="flex items-center gap-2">
              {PlanIcon}
              <span className="font-bold">{requiredPlan}</span>
            </div>
          </div>

          {/* Benefits Preview */}
          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">What you'll get with {requiredPlan}:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {requiredPlan === 'Growth' && (
                <>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    Revenue Management
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    Cash Flow Tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    Up to 10 users
                  </li>
                </>
              )}
              {requiredPlan === 'Professional' && (
                <>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-500" />
                    Invoice Management
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-500" />
                    Budget Planning
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-500" />
                    Advanced Reports & Tax Filing
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-500" />
                    Unlimited users
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Maybe Later
          </Button>
          <Button 
            onClick={handleUpgrade} 
            className={`flex-1 bg-gradient-to-r ${gradientClass} hover:opacity-90 text-white`}
          >
            Upgrade Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeDialog;
