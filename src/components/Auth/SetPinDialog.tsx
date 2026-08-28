import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { saveQuickPin } from "@/utils/pinAuth";
import { KeyRound, Sparkles, ShieldCheck } from "lucide-react";

interface SetPinDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetPinDialog: React.FC<SetPinDialogProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 4-digit numeric PIN.",
        variant: "destructive",
      });
      return;
    }

    if (pin !== confirmPin) {
      toast({
        title: "PINs do not match",
        description: "Please ensure both PIN fields are identical.",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      await saveQuickPin(user.id, user.email || "", pin, {
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role_name_text || user.role,
        avatarUrl: user.avatar_url,
        restaurantId: user.restaurantId || user.restaurant_id,
      });

      // Mark that user has responded so we don't ask again
      localStorage.setItem("swadeshi_pin_prompt_done", "true");

      toast({
        title: "Quick PIN Enabled! 🚀",
        description: "You can now log into Swadeshi Solutions in 1 second using this 4-digit PIN.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
      });

      onClose();
    } catch (err) {
      console.error("Error setting PIN:", err);
      toast({
        title: "Error",
        description: "Failed to save Quick PIN. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("swadeshi_pin_prompt_done", "true");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#2E3192] to-[#F26722] text-white shadow-md">
            <KeyRound className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Set 4-Digit Quick PIN
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Log into your restaurant POS instantly without typing your full email & password each time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-pin" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Create 4-Digit PIN
            </Label>
            <Input
              id="new-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="text-center tracking-[1em] text-xl font-bold h-12 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-pin" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Confirm 4-Digit PIN
            </Label>
            <Input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="text-center tracking-[1em] text-xl font-bold h-12 rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            className="w-full sm:w-auto text-gray-500 rounded-xl"
          >
            Maybe Later
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || pin.length !== 4 || confirmPin.length !== 4}
            className="w-full sm:w-auto bg-gradient-to-r from-[#2E3192] to-[#1a1f6e] hover:from-[#1a1f6e] hover:to-[#0d1045] text-white font-semibold rounded-xl shadow-md"
          >
            {saving ? "Saving..." : "Save Quick PIN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
