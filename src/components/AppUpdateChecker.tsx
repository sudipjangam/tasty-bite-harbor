import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { isNativeApp } from '@/utils/platform';

declare const __APP_VERSION__: string;

interface UpdateInfo {
  latest_version: string;
  required_version: string;
  download_url: string;
}

const isVersionOlder = (current: string, target: string) => {
  const c = current.split('.').map(Number);
  const t = target.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((c[i] || 0) < (t[i] || 0)) return true;
    if ((c[i] || 0) > (t[i] || 0)) return false;
  }
  return false;
};

export const AppUpdateChecker = ({ children }: { children: React.ReactNode }) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [mustUpdate, setMustUpdate] = useState(false);

  useEffect(() => {
    // Only check for native app OTA updates
    if (!isNativeApp()) return;

    const checkUpdate = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_config')
          .select('value')
          .eq('key', 'app_update_info')
          .maybeSingle();

        if (error || !data) return;

        const info = data.value as unknown as UpdateInfo;
        setUpdateInfo(info);
        
        const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

        if (isVersionOlder(currentVersion, info.required_version)) {
          setMustUpdate(true);
        } else if (isVersionOlder(currentVersion, info.latest_version)) {
          toast('Update Available', {
            description: `Version ${info.latest_version} is available.`,
            action: {
              label: 'Download',
              onClick: () => window.open(info.download_url, '_system')
            },
            duration: 10000,
          });
        }
      } catch (err) {
        console.error('Failed to check for updates:', err);
      }
    };

    checkUpdate();
  }, []);

  if (mustUpdate && updateInfo) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-6 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Update Required</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Your app version is too old and is no longer supported. Please install the latest update to continue using the system.
        </p>
        <Button 
          size="lg" 
          onClick={() => window.open(updateInfo.download_url, '_system')}
          className="w-full max-w-xs"
        >
          <Download className="mr-2 h-5 w-5" />
          Download Update
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};
