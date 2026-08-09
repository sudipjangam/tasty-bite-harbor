import React, { useEffect, useState } from 'react';
import { ReplayController, PlaybackSpeed, ReplayState } from './ReplayController';
import { ReplayTimeline as TimelineData } from './useReplayData';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ReplayTimelineUIProps {
  controller: ReplayController;
  timeline: TimelineData | null;
  isLoading: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onExitReplay: () => void;
}

export const ReplayTimeline: React.FC<ReplayTimelineUIProps> = ({
  controller,
  timeline,
  isLoading,
  selectedDate,
  onDateChange,
  onExitReplay,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playState, setPlayState] = useState<ReplayState>('idle');
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

  // Sync with controller state
  useEffect(() => {
    const handleUpdate = (snap: any, idx: number, state: ReplayState) => {
      setCurrentIndex(idx);
      setPlayState(state);
    };
    controller.addListener(handleUpdate);
    return () => controller.removeListener(handleUpdate);
  }, [controller]);

  // Sync initial timeline
  useEffect(() => {
    if (timeline) {
      controller.setTimeline(timeline);
    }
  }, [timeline, controller]);

  const maxIndex = timeline ? timeline.snapshots.length - 1 : 0;
  const currentSnap = timeline?.snapshots[currentIndex];
  
  const formattedTime = currentSnap 
    ? format(currentSnap.timestamp, 'h:mm a')
    : '--:--';

  const handleSpeedChange = (val: string) => {
    const s = parseInt(val) as PlaybackSpeed;
    setSpeed(s);
    controller.setSpeed(s);
  };

  const handleSliderChange = (val: number[]) => {
    controller.seek(val[0]);
  };

  return (
    <div className="bg-white dark:bg-[#131F35] border border-slate-200 dark:border-slate-800 rounded-xl p-4 mt-3 shadow-sm flex flex-col gap-4">
      {/* Top Row: Date, Time, Stats, Exit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none text-slate-800 dark:text-slate-200"
            disabled={isLoading}
          />
          
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-slate-800 dark:text-slate-100 min-w-[80px]">
              {formattedTime}
            </span>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>

          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-3">
            <span>Orders: <strong className="text-slate-700 dark:text-slate-300">{currentSnap?.orderCount || 0}</strong></span>
            <span>Tables: <strong className="text-slate-700 dark:text-slate-300">{currentSnap ? Object.values(currentSnap.tableStatuses).filter(s => s !== 'available').length : 0}</strong></span>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onExitReplay} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
          ↩ Back to Live
        </Button>
      </div>

      {/* Bottom Row: Controls, Scrubber, Speed */}
      <div className="flex items-center gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => controller.rewindToStart()} disabled={isLoading || !timeline}>
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => controller.stepBack()} disabled={isLoading || !timeline || currentIndex === 0}>
            <Rewind className="w-4 h-4" />
          </Button>
          
          <Button 
            variant={playState === 'playing' ? "secondary" : "default"} 
            size="icon" 
            className="h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white" 
            onClick={() => playState === 'playing' ? controller.pause() : controller.play()}
            disabled={isLoading || !timeline}
          >
            {playState === 'playing' ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => controller.stepForward()} disabled={isLoading || !timeline || currentIndex === maxIndex}>
            <FastForward className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => controller.seek(maxIndex)} disabled={isLoading || !timeline}>
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrubber */}
        <div className="flex-1 px-4">
          <Slider 
            value={[currentIndex]} 
            min={0} 
            max={maxIndex > 0 ? maxIndex : 100} 
            step={1}
            onValueChange={handleSliderChange}
            disabled={isLoading || !timeline || maxIndex === 0}
            className="cursor-pointer"
          />
        </div>

        {/* Speed Selector */}
        <div className="w-[100px]">
          <Select value={speed.toString()} onValueChange={handleSpeedChange} disabled={isLoading || !timeline}>
            <SelectTrigger className="h-8 text-xs font-medium">
              <SelectValue placeholder="Speed" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1x (Real)</SelectItem>
              <SelectItem value="2">2x</SelectItem>
              <SelectItem value="5">5x</SelectItem>
              <SelectItem value="10">10x</SelectItem>
              <SelectItem value="60">60x (Fast)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
