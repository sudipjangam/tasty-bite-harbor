import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download, ArrowUpCircle } from 'lucide-react';
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
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950 font-sans">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Main Card (Skeuomorphic/Glassmorphic blend) */}
        <div className="relative z-10 w-full max-w-sm mx-4">
          <div className="relative bg-slate-800/60 backdrop-blur-2xl border border-slate-600/50 p-8 pt-10 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)]">
            
            {/* Top decorative pill */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-b from-rose-500 to-red-600 px-5 py-1.5 rounded-full shadow-[0_4px_15px_rgba(225,29,72,0.5),inset_0_2px_4px_rgba(255,255,255,0.4)] flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <span className="text-[11px] font-black text-white tracking-widest uppercase">Mandatory Update</span>
            </div>

            {/* Icon Container with 3D inset effect */}
            <div className="mx-auto w-28 h-28 mb-8 mt-2 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 p-1.5 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8),0_10px_25px_rgba(0,0,0,0.4)] relative">
               <div className="w-full h-full rounded-[1.6rem] bg-gradient-to-b from-slate-700 to-slate-800 flex items-center justify-center relative overflow-hidden shadow-[inset_0_2px_2px_rgba(255,255,255,0.15)] border border-slate-600/50">
                  <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/10 to-transparent"></div>
                  <Download className="w-12 h-12 text-blue-400 drop-shadow-[0_2px_8px_rgba(59,130,246,0.6)]" />
               </div>
            </div>

            <h1 className="text-2xl font-black text-center mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300 drop-shadow-sm">
              App Update Required
            </h1>
            
            <p className="text-slate-300 text-center text-sm leading-relaxed mb-8 font-medium">
              We've crafted a beautiful new experience for you! Your current version is outdated and no longer supported.
            </p>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => window.open(updateInfo.download_url, '_system')}
                className="group relative w-full h-14 rounded-2xl p-[2px] focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all active:scale-[0.97]"
              >
                {/* 3D border gradient */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-blue-300 via-blue-600 to-blue-900"></div>
                
                {/* Inner button face */}
                <div className="relative w-full h-full rounded-[14px] bg-gradient-to-b from-blue-500 to-blue-700 shadow-[inset_0_2px_1px_rgba(255,255,255,0.3),inset_0_-3px_6px_rgba(0,0,0,0.3)] flex items-center justify-center gap-3 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent"></div>
                  <ArrowUpCircle className="w-6 h-6 text-white drop-shadow-md relative z-10" />
                  <span className="text-white font-black text-lg tracking-wide drop-shadow-md relative z-10">
                    Install Update
                  </span>
                </div>
              </button>

              <p className="text-xs text-center text-slate-500 font-bold uppercase tracking-wider mt-2">
                Version {updateInfo.latest_version} <span className="mx-1">•</span> OTA Release
              </p>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
