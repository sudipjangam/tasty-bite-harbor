import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Camera,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CleaningSchedule {
  id: string;
  room_id: string;
  rooms?: { name: string };
  status: string;
  cleaning_type: string;
  notes?: string;
  checklist_completed?: any;
  actual_start_time?: string;
  actual_end_time?: string;
  restaurant_id: string;
}

interface ChecklistPhase {
  name: string;
  emoji: string;
  items: string[];
}

interface HousekeepingChecklistDialogProps{
  open: boolean;
  onClose: () => void;
  schedule: CleaningSchedule | null;
}

// Default 5-Phase Post-Checkout Checklist
const DEFAULT_CHECKLIST: ChecklistPhase[] = [
  {
   name: "PHASE 1: ENTRY & ASSESSMENT",
    emoji: "🚪",
    items: [
      "Knock and announce 'Housekeeping'",
      "Check Lost & Found (under bed, drawers, closet)",
      "Test all lights and TV - note any issues",
      "Open curtains/windows to air out the room"
    ]
  },
  {
    name: "PHASE 2: STRIPPING & TRASH",
    emoji: "🗑️",
    items: [
      "Empty all trash bins (bedroom and bathroom)",
      "Strip bed linens and check mattress protector for stains",
      "Remove all used towels, floor mats, and robes",
      "Pre-spray disinfectant on toilet, shower, and sink"
    ]
  },
  {
    name: "PHASE 3: BEDROOM CLEAN & SETUP",
    emoji: "🛏️",
    items: [
      "Make bed with fresh linens (hospital corners, no wrinkles)",
      "Dust all surfaces from top to bottom",
      "Sanitize high-touch points (remote, switches, phone, handles)",
      "Restock amenities (coffee/tea, water, stationery, laundry bags)",
      "Check safe is open/unlocked, correct hangers in closet"
    ]
  },
  {
    name: "PHASE 4: BATHROOM DEEP CLEAN",
    emoji: "🚿",
    items: [
      "Scrub toilet (inside and out), shower, tub, and sink",
      "Polish mirrors and chrome fixtures (streak-free)",
      "Clear drains and remove any hair from floor",
      "Stock fresh towels and toiletries (soap, shampoo, toilet paper)"
    ]
  },
  {
    name: "PHASE 5: FINAL INSPECTION",
    emoji: "✅",
    items: [
      "Vacuum carpet wall-to-wall (including under bed) or mop floors",
      "Set thermostat to guest-ready temperature (22°C / 72°F)",
      "Close sheers and align curtains to brand standard",
      "Final visual check from doorway - everything symmetrical",
      "Log room as 'Clean & Ready' in system"
    ]
  }
];

const HousekeepingChecklistDialog: React.FC<HousekeepingChecklistDialogProps> = ({
  open,
  onClose,
  schedule
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedPhases, setExpandedPhases] = useState<number[]>([0]);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [phaseNotes, setPhaseNotes] = useState<Record<number, string>>({});
  const [conditionNotes, setConditionNotes] = useState('');
  const [isStarted, setIsStarted] = useState(false);

  // Initialize checked items from schedule if exists
  useEffect(() => {
    if (schedule?.checklist_completed && Array.isArray(schedule.checklist_completed)) {
      const initialChecked: Record<string, boolean> = {};
      schedule.checklist_completed.forEach((item: any) => {
        if (item.key) {
          initialChecked[item.key] = item.checked;
        }
      });
      setCheckedItems(initialChecked);
    }
    
    if (schedule?.status === 'in_progress') {
      setIsStarted(true);
    }
  }, [schedule]);

  // Calculate total and checked items
  const totalItems = DEFAULT_CHECKLIST.reduce((acc, phase) => acc + phase.items.length, 0);
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const progressPercent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  const togglePhase = (index: number) => {
    setExpandedPhases(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleItem = (phaseIndex: number, itemIndex: number) => {
    const key = `${phaseIndex}-${itemIndex}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isPhaseComplete = (phaseIndex: number) => {
    const phase = DEFAULT_CHECKLIST[phaseIndex];
    return phase.items.every((_, itemIndex) => checkedItems[`${phaseIndex}-${itemIndex}`]);
  };

  // Start cleaning mutation
  const startCleaningMutation = useMutation({
    mutationFn: async () => {
      if (!schedule) return;
      
      const { error } = await supabase
        .from('room_cleaning_schedules')
        .update({
          status: 'in_progress',
          actual_start_time: new Date().toISOString()
        })
        .eq('id', schedule.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setIsStarted(true);
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      toast({
        title: "Cleaning Started",
        description: "Timer started. Complete the checklist to finish."
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start cleaning task."
      });
    }
  });

  // Complete cleaning mutation
  const completeCleaningMutation = useMutation({
    mutationFn: async () => {
      if (!schedule) return;
      
      // Build checklist data with timestamps
      const checklistData = DEFAULT_CHECKLIST.flatMap((phase, phaseIndex) =>
        phase.items.map((item, itemIndex) => ({
          key: `${phaseIndex}-${itemIndex}`,
          phase: phase.name,
          item: item,
          checked: checkedItems[`${phaseIndex}-${itemIndex}`] || false,
          checkedAt: checkedItems[`${phaseIndex}-${itemIndex}`] ? new Date().toISOString() : null
        }))
      );

      // Update cleaning schedule
      const { error: scheduleError } = await supabase
        .from('room_cleaning_schedules')
        .update({
          status: 'completed',
          actual_end_time: new Date().toISOString(),
          checklist_completed: checklistData,
          room_condition_notes: conditionNotes || null
        })
        .eq('id', schedule.id);
      
      if (scheduleError) throw scheduleError;

      // Update room status to available
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'available' })
        .eq('id', schedule.room_id);
      
      if (roomError) throw roomError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-status'] });
      toast({
        title: "🎉 Cleaning Complete!",
        description: "Room is now marked as available."
      });
      onClose();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete cleaning task."
      });
    }
  });

  const handleStartCleaning = () => {
    startCleaningMutation.mutate();
  };

  const handleCompleteCleaning = () => {
    if (progressPercent < 100) {
      toast({
        variant: "destructive",
        title: "Incomplete Checklist",
        description: "Please complete all checklist items before marking as done."
      });
      return;
    }
    completeCleaningMutation.mutate();
  };

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-2">
          <div className="flex items-center justify-between pr-10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Post-Checkout Checklist
            </DialogTitle>
            <Badge 
              className={`${
                schedule.status === 'completed' 
                  ? 'bg-green-500' 
                  : schedule.status === 'in_progress' 
                    ? 'bg-blue-500' 
                    : 'bg-orange-500'
              } text-white`}
            >
              {schedule.status}
            </Badge>
          </div>
          
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm font-medium">🏠 {schedule.rooms?.name}</p>
            <p className="text-xs text-gray-500">{schedule.notes}</p>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-gray-500">{checkedCount}/{totalItems} items ({Math.round(progressPercent)}%)</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-4 mt-2" style={{ maxHeight: 'calc(85vh - 260px)' }}>
          <div className="space-y-3">
            {DEFAULT_CHECKLIST.map((phase, phaseIndex) => {
              const isExpanded = expandedPhases.includes(phaseIndex);
              const phaseComplete = isPhaseComplete(phaseIndex);
              
              return (
                <div 
                  key={phaseIndex} 
                  className={`border rounded-xl overflow-hidden transition-all ${
                    phaseComplete 
                      ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {/* Phase Header */}
                  <button
                    onClick={() => togglePhase(phaseIndex)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    disabled={!isStarted && schedule.status !== 'in_progress'}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{phase.emoji}</span>
                      <span className="font-medium text-sm">{phase.name}</span>
                      {phaseComplete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {/* Phase Items */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2">
                      {phase.items.map((item, itemIndex) => {
                        const key = `${phaseIndex}-${itemIndex}`;
                        const isChecked = checkedItems[key] || false;
                        
                        return (
                          <label
                            key={itemIndex}
                            className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                              isChecked 
                                ? 'bg-green-100 dark:bg-green-900/30' 
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleItem(phaseIndex, itemIndex)}
                              disabled={!isStarted && schedule.status !== 'in_progress'}
                              className="mt-0.5"
                            />
                            <span className={`text-sm ${isChecked ? 'line-through text-gray-500' : ''}`}>
                              {item}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Condition Notes */}
          {isStarted && (
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Room Condition Notes (Optional)
              </label>
              <Textarea
                placeholder="Note any issues, damages, or items needing attention..."
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          )}
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex gap-3 pt-4 border-t mt-4">
          {!isStarted && schedule.status === 'pending' ? (
            <Button
              onClick={handleStartCleaning}
              disabled={startCleaningMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              <Clock className="h-4 w-4 mr-2" />
              {startCleaningMutation.isPending ? 'Starting...' : 'Start Cleaning'}
            </Button>
          ) : (
            <Button
              onClick={handleCompleteCleaning}
              disabled={progressPercent < 100 || completeCleaningMutation.isPending}
              className={`flex-1 ${
                progressPercent < 100 
                  ? 'bg-gray-400' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
              } text-white`}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {completeCleaningMutation.isPending ? 'Completing...' : 'Mark Room as Ready'}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HousekeepingChecklistDialog;
