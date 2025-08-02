import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Lock, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PermissionDeniedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  requiredPermission?: string;
  onNavigateToHome?: () => void;
}

export const PermissionDeniedDialog: React.FC<PermissionDeniedDialogProps> = ({
  open,
  onOpenChange,
  featureName,
  requiredPermission,
  onNavigateToHome
}) => {
  const { user } = useAuth();

  const handleGoHome = () => {
    onOpenChange(false);
    if (onNavigateToHome) {
      onNavigateToHome();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <Lock className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Access Restricted
            </DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p>
                  You don't have permission to access <strong>{featureName}</strong>.
                </p>
                {requiredPermission && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Required permission: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">{requiredPermission}</code>
                  </p>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 dark:text-blue-400">
                  <svg className="h-4 w-4 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Current Role: <span className="capitalize">{user?.role || 'Unknown'}</span>
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Contact your administrator to request access to this feature.
                  </p>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
          {onNavigateToHome && (
            <Button 
              onClick={handleGoHome}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};