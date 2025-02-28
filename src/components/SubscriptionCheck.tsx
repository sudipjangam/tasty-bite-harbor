
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SubscriptionCheckProps {
  isOpen: boolean;
  onClose: () => void;
}

const SubscriptionCheck = ({ isOpen, onClose }: SubscriptionCheckProps) => {
  const navigate = useNavigate();

  const handleViewPlans = () => {
    navigate("/");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center text-xl">Subscription Required</DialogTitle>
          <DialogDescription className="text-center pt-2">
            You need an active subscription to access this feature
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100 my-4">
          <div className="flex items-start">
            <CreditCard className="h-5 w-5 mr-2 text-purple-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-purple-900">
                Subscription Benefits
              </h3>
              <ul className="mt-2 list-disc pl-5 text-xs text-gray-600 space-y-1">
                <li>Access to all features</li>
                <li>Priority customer support</li>
                <li>Regular updates and improvements</li>
                <li>Data backup and security</li>
              </ul>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="sm:flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleViewPlans}
            className="bg-purple-600 hover:bg-purple-700 sm:flex-1"
          >
            View Subscription Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionCheck;
