import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSimulationData } from './useSimulationData';
import { SimulationEventBus } from './SimulationEventBus';
import { PixiSimulation } from './PixiSimulation';
import { SpriteSettingsDialog } from './SpriteSettingsDialog';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Play, Pause, Settings, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import type { CharacterRole } from './spriteDefinitions';
import { defaultSpriteConfigs } from './spriteDefinitions';

// Replay mode imports
import { useReplayData } from './useReplayData';
import { ReplayController } from './ReplayController';
import { ReplayTimeline } from './ReplayTimeline';

export const RestaurantSimulation: React.FC = () => {
  const { actualTheme } = useTheme();
  const { toast } = useToast();
  const isDark = actualTheme === 'dark';

  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [activeBranchName, setActiveBranchName] = useState<string>('Active Branch');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  const [volume, setVolume] = useState<number>(0.5);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [customSpriteUrls, setCustomSpriteUrls] = useState<Partial<Record<CharacterRole, string>>>({});
  
  // Replay Mode State
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
  
  const replayController = useMemo(() => new ReplayController(), []);

  // Auth & Branch Setup
  useEffect(() => {
    const detectMode = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsDemoMode(true); return; }

        const { data: profile } = await supabase
          .from('profiles')
          .select('restaurant_id')
          .eq('id', user.id)
          .single();

        if (profile?.restaurant_id) {
          setIsDemoMode(false);
          setActiveBranchId(profile.restaurant_id);
          const { data: rest } = await supabase
            .from('restaurants')
            .select('name')
            .eq('id', profile.restaurant_id)
            .single();
          if (rest?.name) setActiveBranchName(rest.name);

          // Load any custom sprites from storage
          loadCustomSprites(profile.restaurant_id);
        } else {
          setIsDemoMode(true);
        }
      } catch {
        setIsDemoMode(true);
      }
    };
    detectMode();
  }, []);

  const loadCustomSprites = async (restaurantId: string) => {
    const roles: CharacterRole[] = ['waiter', 'chef', 'customer'];
    const urls: Partial<Record<CharacterRole, string>> = {};
    await Promise.all(
      roles.map(async role => {
        const path = `${restaurantId}/${role}.png`;
        const { data } = supabase.storage.from('simulation-sprites').getPublicUrl(path);
        const res = await fetch(data.publicUrl, { method: 'HEAD' }).catch(() => null);
        if (res?.ok) urls[role] = data.publicUrl + `?t=${Date.now()}`;
      })
    );
    if (Object.keys(urls).length > 0) setCustomSpriteUrls(urls);
  };

  const { tables: liveTables, layoutObjects, orders: liveOrders, staff, loading: liveLoading } = useSimulationData(
    isReplayMode ? undefined : (activeBranchId ?? undefined), // Don't fetch live data if in replay mode
    isDemoMode
  );

  // Replay Data
  const { timeline, isLoading: replayLoading, selectedDate, setSelectedDate } = useReplayData(
    activeBranchId, 
    isDemoMode
  );

  // Initialize Event Bus once
  const eventBus = useMemo(() => new SimulationEventBus(), []);

  // Apply custom sprites to event bus characters
  useEffect(() => {
    if (!eventBus) return;
    eventBus.characters.forEach(char => {
      const url = customSpriteUrls[char.role as CharacterRole];
      if (url) {
        const img = new Image();
        img.onload = () => { char.config.customImage = img; };
        img.src = url;
      } else {
        // Reset to default
        char.config = { ...defaultSpriteConfigs[char.role as CharacterRole] };
      }
    });
  }, [customSpriteUrls, eventBus]);

  // Ensure characters are initialized
  useEffect(() => {
    // wait until layout objects and staff are loaded
    if (layoutObjects.length > 0 && eventBus.characters.length === 0) {
      eventBus.initCharacters(staff, layoutObjects);
    }
  }, [layoutObjects, staff, eventBus]);

  // Sync state to event bus (Live Mode)
  useEffect(() => {
    if (isReplayMode) return;
    if (!liveLoading && !isPaused && layoutObjects.length > 0) {
      eventBus.updateState(liveTables, liveOrders);
    }
  }, [liveTables, liveOrders, layoutObjects, staff, liveLoading, eventBus, isPaused, isReplayMode]);

  // Sync state to event bus (Replay Mode)
  useEffect(() => {
    if (!isReplayMode) return;
    const handleReplayUpdate = (snap: any) => {
      // Replay uses the base layout/tables structure, but overwrites the status based on snapshot
      eventBus.applySnapshot(snap, liveTables); // liveTables is just used for the layout coordinates
    };
    
    replayController.addListener(handleReplayUpdate);
    return () => replayController.removeListener(handleReplayUpdate);
  }, [isReplayMode, replayController, eventBus, liveTables]);

  const toggleReplayMode = () => {
    if (!isReplayMode) {
      eventBus.resetForReplay();
    } else {
      replayController.stop();
      // Reset position back to entrance before handing back to live mode
      eventBus.resetForReplay(); 
    }
    setIsReplayMode(!isReplayMode);
  };

  const currentLoading = isReplayMode ? replayLoading : liveLoading;

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col space-y-3">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white dark:bg-[#131F35] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            🎮 {isReplayMode ? 'Replay Simulation' : 'Live Simulation'}
          </h2>
          {!isReplayMode && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              isDemoMode
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
            }`}>
              {isDemoMode ? '🔶 Demo Mode' : '🟢 Live Data'}
            </span>
          )}
          {isReplayMode && (
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              ⏪ Replay Mode
            </span>
          )}
          {!isDemoMode && (
            <span className="text-xs text-muted-foreground">{activeBranchName}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isReplayMode && (
             <Button
               variant="outline"
               size="sm"
               onClick={toggleReplayMode}
               className="gap-2 text-indigo-600 dark:text-indigo-400"
             >
               <History className="w-4 h-4" />
               Replay Mode
             </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setVolume(v => v === 0 ? 0.5 : 0)}
            title={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0
              ? <VolumeX className="w-4 h-4 text-slate-500" />
              : <Volume2 className="w-4 h-4 text-orange-500" />
            }
          </Button>
          {!isReplayMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused
                ? <Play className="w-4 h-4 text-green-500" />
                : <Pause className="w-4 h-4 text-slate-500" />
              }
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            title="Character Sprite Settings"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 rounded-xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800 relative">
        {currentLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 z-10 gap-3">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            <p className="text-sm text-muted-foreground">Loading simulation…</p>
          </div>
        ) : (
          <PixiSimulation
            tables={liveTables}
            layoutObjects={layoutObjects}
            eventBus={eventBus}
            volume={volume}
            isDark={isDark}
            isReplayMode={isReplayMode}
          />
        )}
      </div>

      {/* Replay Timeline Controls */}
      {isReplayMode && (
        <ReplayTimeline
          controller={replayController}
          timeline={timeline}
          isLoading={replayLoading}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onExitReplay={toggleReplayMode}
        />
      )}

      {/* Sprite Settings Dialog */}
      <SpriteSettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        restaurantId={activeBranchId}
        onSpritesChanged={setCustomSpriteUrls}
      />
    </div>
  );
};
