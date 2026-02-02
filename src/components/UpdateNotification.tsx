import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { skipWaitingAndReload } from "@/utils/serviceWorkerUtils";

interface UpdateNotificationProps {
  onDismiss?: () => void;
}

export function UpdateNotification({ onDismiss }: UpdateNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-show notification with animation
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = () => {
    skipWaitingAndReload();
    // Reload page to get new version
    window.location.reload();
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-2xl p-4 flex items-center gap-4 max-w-md mx-auto border border-blue-400">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Update Available! 🎉</h3>
          <p className="text-xs text-blue-100">
            A new version of the app is ready. Reload to get the latest features
            and improvements.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleUpdate}
            size="sm"
            className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Reload
          </Button>

          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-blue-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
