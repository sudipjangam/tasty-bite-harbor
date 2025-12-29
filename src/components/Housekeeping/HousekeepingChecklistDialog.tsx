import React, { useState, useEffect, useRef } from "react";
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
  AlertTriangle,
  Zap,
  Wrench,
  MinusCircle,
  Timer,
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

interface HousekeepingChecklistDialogProps {
  open: boolean;
  onClose: () => void;
  schedule: CleaningSchedule | null;
}

// Streamlined Post-Checkout Checklist - 10 essential items
const DEFAULT_CHECKLIST: ChecklistPhase[] = [
  {
    name: "STRIP & CLEAR",
    emoji: "🗑️",
    items: [
      "Empty all trash bins & collect dirty linens",
      "Check for lost items (under bed, drawers, closet)",
    ],
  },
  {
    name: "BEDROOM CLEAN",
    emoji: "🛏️",
    items: [
      "Make bed with fresh linens",
      "Dust & sanitize all surfaces (remote, switches, handles)",
      "Restock amenities & check closet/safe",
    ],
  },
  {
    name: "BATHROOM CLEAN",
    emoji: "🚿",
    items: [
      "Deep clean toilet, shower & sink",
      "Polish mirrors & chrome (streak-free)",
      "Stock fresh towels & toiletries",
    ],
  },
  {
    name: "FINAL TOUCHES",
    emoji: "✅",
    items: [
      "Vacuum/mop floors & set AC to 22°C",
      "Final visual inspection from doorway",
    ],
  },
];

// Item status type: checked, skipped (N/A), or unchecked
type ItemStatus = "checked" | "skipped" | "unchecked";

const HousekeepingChecklistDialog: React.FC<
  HousekeepingChecklistDialogProps
> = ({ open, onClose, schedule }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedPhases, setExpandedPhases] = useState<number[]>([0, 1, 2, 3]); // All expanded by default
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>(
    {}
  );
  const [conditionNotes, setConditionNotes] = useState("");
  const [maintenanceIssues, setMaintenanceIssues] = useState<string[]>([]);
  const [newIssue, setNewIssue] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [showIssueInput, setShowIssueInput] = useState(false);

  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize from schedule if exists
  useEffect(() => {
    if (
      schedule?.checklist_completed &&
      Array.isArray(schedule.checklist_completed)
    ) {
      const initialStatuses: Record<string, ItemStatus> = {};
      schedule.checklist_completed.forEach((item: any) => {
        if (item.key) {
          initialStatuses[item.key] = item.skipped
            ? "skipped"
            : item.checked
            ? "checked"
            : "unchecked";
        }
      });
      setItemStatuses(initialStatuses);
    }

    if (schedule?.status === "in_progress") {
      setIsStarted(true);
      // Calculate elapsed time from actual_start_time
      if (schedule.actual_start_time) {
        const startTime = new Date(schedule.actual_start_time).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }
    }
  }, [schedule]);

  // Timer effect
  useEffect(() => {
    if (isStarted && schedule?.status !== "completed") {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, schedule?.status]);

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Calculate progress (checked OR skipped items count as complete)
  const totalItems = DEFAULT_CHECKLIST.reduce(
    (acc, phase) => acc + phase.items.length,
    0
  );
  const completedCount = Object.values(itemStatuses).filter(
    (s) => s === "checked" || s === "skipped"
  ).length;
  const progressPercent =
    totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  const togglePhase = (index: number) => {
    setExpandedPhases((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const setItemStatus = async (
    phaseIndex: number,
    itemIndex: number,
    status: ItemStatus
  ) => {
    const key = `${phaseIndex}-${itemIndex}`;

    // Auto-start cleaning when first item is interacted with
    if (!isStarted && schedule?.status === "pending") {
      startCleaningMutation.mutate();
    }

    setItemStatuses((prev) => ({ ...prev, [key]: status }));
  };

  const toggleItem = (phaseIndex: number, itemIndex: number) => {
    const key = `${phaseIndex}-${itemIndex}`;
    const currentStatus = itemStatuses[key] || "unchecked";
    const newStatus = currentStatus === "checked" ? "unchecked" : "checked";
    setItemStatus(phaseIndex, itemIndex, newStatus);
  };

  const skipItem = (phaseIndex: number, itemIndex: number) => {
    const key = `${phaseIndex}-${itemIndex}`;
    const currentStatus = itemStatuses[key] || "unchecked";
    const newStatus = currentStatus === "skipped" ? "unchecked" : "skipped";
    setItemStatus(phaseIndex, itemIndex, newStatus);
  };

  const completePhase = (phaseIndex: number) => {
    const phase = DEFAULT_CHECKLIST[phaseIndex];
    const updates: Record<string, ItemStatus> = {};

    // Auto-start if not started
    if (!isStarted && schedule?.status === "pending") {
      startCleaningMutation.mutate();
    }

    phase.items.forEach((_, itemIndex) => {
      const key = `${phaseIndex}-${itemIndex}`;
      if (itemStatuses[key] !== "skipped") {
        updates[key] = "checked";
      }
    });

    setItemStatuses((prev) => ({ ...prev, ...updates }));

    toast({
      title: `✅ ${phase.name} Complete!`,
      description: "Moving to next phase...",
    });
  };

  const isPhaseComplete = (phaseIndex: number) => {
    const phase = DEFAULT_CHECKLIST[phaseIndex];
    return phase.items.every((_, itemIndex) => {
      const status = itemStatuses[`${phaseIndex}-${itemIndex}`];
      return status === "checked" || status === "skipped";
    });
  };

  const addMaintenanceIssue = () => {
    if (newIssue.trim()) {
      setMaintenanceIssues((prev) => [...prev, newIssue.trim()]);
      setNewIssue("");
      setShowIssueInput(false);
      toast({
        title: "🔧 Issue Reported",
        description: "Maintenance will be notified.",
      });
    }
  };

  // Start cleaning mutation
  const startCleaningMutation = useMutation({
    mutationFn: async () => {
      if (!schedule) return;

      const { error } = await supabase
        .from("room_cleaning_schedules")
        .update({
          status: "in_progress",
          actual_start_time: new Date().toISOString(),
        })
        .eq("id", schedule.id);

      if (error) throw error;
    },
    onSuccess: () => {
      setIsStarted(true);
      setElapsedTime(0);
      queryClient.invalidateQueries({ queryKey: ["cleaning-schedules"] });
      toast({
        title: "⏱️ Timer Started",
        description: "Good luck! Complete all tasks to finish.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start cleaning task.",
      });
    },
  });

  // Complete cleaning mutation
  const completeCleaningMutation = useMutation({
    mutationFn: async () => {
      if (!schedule) return;

      // Build checklist data with statuses
      const checklistData = DEFAULT_CHECKLIST.flatMap((phase, phaseIndex) =>
        phase.items.map((item, itemIndex) => {
          const key = `${phaseIndex}-${itemIndex}`;
          const status = itemStatuses[key] || "unchecked";
          return {
            key,
            phase: phase.name,
            item: item,
            checked: status === "checked",
            skipped: status === "skipped",
            completedAt:
              status !== "unchecked" ? new Date().toISOString() : null,
          };
        })
      );

      // Combine notes with maintenance issues
      const allNotes = [
        conditionNotes,
        maintenanceIssues.length > 0
          ? `\n🔧 MAINTENANCE ISSUES:\n${maintenanceIssues
              .map((i) => `• ${i}`)
              .join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      const { error: scheduleError } = await supabase
        .from("room_cleaning_schedules")
        .update({
          status: "completed",
          actual_end_time: new Date().toISOString(),
          checklist_completed: checklistData,
          room_condition_notes: allNotes || null,
        })
        .eq("id", schedule.id);

      if (scheduleError) throw scheduleError;

      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "available" })
        .eq("id", schedule.room_id);

      if (roomError) throw roomError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cleaning-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["rooms-status"] });
      toast({
        title: "🎉 Cleaning Complete!",
        description: `Room ready in ${formatTime(elapsedTime)}. Great job!`,
      });
      onClose();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete cleaning task.",
      });
    },
  });

  const handleCompleteCleaning = () => {
    if (progressPercent < 100) {
      toast({
        variant: "destructive",
        title: "Incomplete Checklist",
        description: "Complete or skip all items before marking as done.",
      });
      return;
    }
    completeCleaningMutation.mutate();
  };

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-2">
          {/* Header with Timer */}
          <div className="flex items-center justify-between pr-10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Post-Checkout Checklist
            </DialogTitle>
            <div className="flex items-center gap-2">
              {/* Live Timer */}
              {isStarted && (
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-mono text-lg px-3 py-1 animate-pulse">
                  <Timer className="h-4 w-4 mr-1" />
                  {formatTime(elapsedTime)}
                </Badge>
              )}
              <Badge
                className={`${
                  schedule.status === "completed"
                    ? "bg-green-500"
                    : schedule.status === "in_progress"
                    ? "bg-blue-500"
                    : "bg-orange-500"
                } text-white`}
              >
                {schedule.status === "in_progress"
                  ? "🔄 In Progress"
                  : schedule.status}
              </Badge>
            </div>
          </div>

          {/* Room Info */}
          <div className="mt-2 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg">
            <p className="text-sm font-medium">🏠 {schedule.rooms?.name}</p>
            <p className="text-xs text-gray-500">{schedule.notes}</p>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-gray-500">
                {completedCount}/{totalItems} items (
                {Math.round(progressPercent)}%)
              </span>
            </div>
            <Progress
              value={progressPercent}
              className={`h-3 ${progressPercent === 100 ? "bg-green-200" : ""}`}
            />
          </div>
        </DialogHeader>

        <ScrollArea
          className="flex-1 overflow-y-auto pr-4 mt-2"
          style={{ maxHeight: "calc(90vh - 300px)" }}
        >
          <div className="space-y-3">
            {DEFAULT_CHECKLIST.map((phase, phaseIndex) => {
              const isExpanded = expandedPhases.includes(phaseIndex);
              const phaseComplete = isPhaseComplete(phaseIndex);
              const phaseItemCount = phase.items.length;
              const phaseCompletedCount = phase.items.filter((_, i) => {
                const status = itemStatuses[`${phaseIndex}-${i}`];
                return status === "checked" || status === "skipped";
              }).length;

              return (
                <div
                  key={phaseIndex}
                  className={`border rounded-xl overflow-hidden transition-all ${
                    phaseComplete
                      ? "border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {/* Phase Header */}
                  <div className="flex items-center justify-between p-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <button
                      onClick={() => togglePhase(phaseIndex)}
                      className="flex items-center gap-2 flex-1"
                    >
                      <span className="text-xl">{phase.emoji}</span>
                      <span className="font-medium text-sm">{phase.name}</span>
                      <span className="text-xs text-gray-400">
                        ({phaseCompletedCount}/{phaseItemCount})
                      </span>
                      {phaseComplete && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Quick Complete Phase Button */}
                      {!phaseComplete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => completePhase(phaseIndex)}
                          className="h-7 px-2 text-xs bg-green-100 hover:bg-green-200 text-green-700"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Complete All
                        </Button>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {/* Phase Items */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2">
                      {phase.items.map((item, itemIndex) => {
                        const key = `${phaseIndex}-${itemIndex}`;
                        const status = itemStatuses[key] || "unchecked";
                        const isChecked = status === "checked";
                        const isSkipped = status === "skipped";

                        return (
                          <div
                            key={itemIndex}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                              isChecked
                                ? "bg-green-100 dark:bg-green-900/30"
                                : isSkipped
                                ? "bg-gray-100 dark:bg-gray-800"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            {/* Checkbox */}
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() =>
                                toggleItem(phaseIndex, itemIndex)
                              }
                              className="mt-0.5"
                              disabled={isSkipped}
                            />

                            {/* Item Text */}
                            <span
                              className={`text-sm flex-1 ${
                                isChecked ? "line-through text-gray-500" : ""
                              } ${
                                isSkipped
                                  ? "line-through text-gray-400 italic"
                                  : ""
                              }`}
                            >
                              {item}
                              {isSkipped && (
                                <span className="ml-2 text-xs">(N/A)</span>
                              )}
                            </span>

                            {/* N/A Skip Button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => skipItem(phaseIndex, itemIndex)}
                              className={`h-6 px-2 text-xs ${
                                isSkipped
                                  ? "bg-amber-100 text-amber-700"
                                  : "text-gray-400 hover:text-amber-600"
                              }`}
                              title="Mark as Not Applicable"
                            >
                              <MinusCircle className="h-3 w-3" />
                              <span className="ml-1">N/A</span>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Report Issue Section */}
          <div className="mt-4 p-3 border border-amber-200 rounded-xl bg-amber-50 dark:bg-amber-900/20">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-600" />
                Report Maintenance Issue
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowIssueInput(!showIssueInput)}
                className="h-7 px-2 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700"
              >
                + Add Issue
              </Button>
            </div>

            {showIssueInput && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., Leaking faucet, broken AC..."
                  value={newIssue}
                  onChange={(e) => setNewIssue(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  onKeyDown={(e) => e.key === "Enter" && addMaintenanceIssue()}
                />
                <Button
                  size="sm"
                  onClick={addMaintenanceIssue}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Report
                </Button>
              </div>
            )}

            {maintenanceIssues.length > 0 && (
              <div className="mt-2 space-y-1">
                {maintenanceIssues.map((issue, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-amber-700"
                  >
                    <span>🔧</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Condition Notes */}
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Additional Notes (Optional)
            </label>
            <Textarea
              placeholder="Note any issues, damages, or items needing attention..."
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex gap-3 pt-4 border-t mt-4">
          <Button
            onClick={handleCompleteCleaning}
            disabled={
              progressPercent < 100 || completeCleaningMutation.isPending
            }
            className={`flex-1 ${
              progressPercent < 100
                ? "bg-gray-400"
                : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            } text-white`}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {completeCleaningMutation.isPending
              ? "Completing..."
              : progressPercent < 100
              ? `Complete ${completedCount}/${totalItems} Tasks`
              : "✨ Mark Room as Ready"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HousekeepingChecklistDialog;
