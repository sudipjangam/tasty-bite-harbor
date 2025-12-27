import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Play, X } from "lucide-react";

interface AutoClockInPromptProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
  staffName: string;
  restaurantId: string;
  onSuccess: () => void;
}

const AutoClockInPrompt: React.FC<AutoClockInPromptProps> = ({
  isOpen,
  onClose,
  staffId,
  staffName,
  restaurantId,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update clock every second
  useEffect(() => {
    if (isOpen) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  const handleClockIn = async () => {
    setIsSubmitting(true);
    try {
      // Check if already clocked in
      const { data: activeSessions } = await supabase
        .from("staff_time_clock")
        .select("*")
        .eq("staff_id", staffId)
        .is("clock_out", null)
        .limit(1);

      if (activeSessions && activeSessions.length > 0) {
        toast({
          title: "Already clocked in",
          description: "You already have an active shift.",
        });
        onClose();
        return;
      }

      // Create clock-in record
      const { error } = await supabase.from("staff_time_clock").insert([
        {
          staff_id: staffId,
          restaurant_id: restaurantId,
          clock_in: new Date().toISOString(),
          notes: "Auto clock-in on login",
          clock_in_status: "no_shift",
        },
      ]);

      if (error) throw error;

      // Update staff status
      await supabase
        .from("staff")
        .update({ status: "working" })
        .eq("id", staffId);

      toast({
        title: "✓ Shift Started",
        description: `Clocked in at ${format(
          new Date(),
          "h:mm a"
        )}. Have a great shift!`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Clock in failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    // Store dismissal in sessionStorage so we don't prompt again today
    const today = format(new Date(), "yyyy-MM-dd");
    sessionStorage.setItem(`auto-clock-dismissed-${today}`, "true");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDismiss}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600">
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 inline-flex items-center justify-center w-16 h-16 mb-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
            <Clock className="w-8 h-8 text-white" />
          </div>

          <DialogTitle className="relative z-10 text-xl font-bold text-white">
            Ready to start your shift?
          </DialogTitle>
          <DialogDescription className="relative z-10 text-white/80 mt-1">
            Hi {staffName.split(" ")[0]}! It's {format(currentTime, "h:mm a")}
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="p-5 bg-white dark:bg-gray-900 space-y-4">
          {/* Current time display */}
          <div className="py-4 rounded-xl text-center bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800">
            <div className="text-3xl font-black tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {format(currentTime, "h:mm:ss")}
              <span className="text-sm font-semibold ml-1 opacity-70">
                {format(currentTime, "a")}
              </span>
            </div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
              {format(currentTime, "EEEE, MMMM d")}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1 h-12 rounded-xl border-2 font-semibold"
            >
              <X className="w-4 h-4 mr-1.5" />
              Not Now
            </Button>
            <Button
              onClick={handleClockIn}
              disabled={isSubmitting}
              className="flex-[1.5] h-12 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </span>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1.5 fill-current" />
                  Yes, Clock In
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutoClockInPrompt;
