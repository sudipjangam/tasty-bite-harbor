import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useGuestPreferences,
  PREFERENCE_OPTIONS,
  PreferenceType,
  GuestPreference,
} from "@/hooks/useGuestPreferences";
import { Loader2, Settings, Sparkles } from "lucide-react";

interface GuestPreferencesEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestPhone: string;
  guestName?: string;
  onSave?: () => void;
}

const GuestPreferencesEditor: React.FC<GuestPreferencesEditorProps> = ({
  open,
  onOpenChange,
  guestPhone,
  guestName,
  onSave,
}) => {
  const { getGuestPreferences, setPreferences } = useGuestPreferences();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPreferences, setSelectedPreferences] = useState<Set<string>>(
    new Set()
  );

  // Load existing preferences
  useEffect(() => {
    if (open && guestPhone) {
      loadPreferences();
    }
  }, [open, guestPhone]);

  const loadPreferences = async () => {
    setLoading(true);
    const prefs = await getGuestPreferences(guestPhone);
    const prefSet = new Set(
      prefs.map((p) => `${p.preference_type}:${p.preference_value}`)
    );
    setSelectedPreferences(prefSet);
    setLoading(false);
  };

  const togglePreference = (type: PreferenceType, value: string) => {
    const key = `${type}:${value}`;
    const newSet = new Set(selectedPreferences);

    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }

    setSelectedPreferences(newSet);
  };

  const handleSave = async () => {
    setSaving(true);

    const prefsArray = Array.from(selectedPreferences).map((key) => {
      const [type, value] = key.split(":");
      return { type: type as PreferenceType, value };
    });

    await setPreferences(guestPhone, prefsArray);
    setSaving(false);
    onSave?.();
    onOpenChange(false);
  };

  const isSelected = (type: PreferenceType, value: string) => {
    return selectedPreferences.has(`${type}:${value}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl">
        <div className="bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-purple-500/20 p-5 -m-6 mb-4 border-b border-white/20">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl shadow-lg">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                  Guest Preferences
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400 mt-0.5">
                  {guestName ? `Preferences for ${guestName}` : guestPhone}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {(
                Object.entries(PREFERENCE_OPTIONS) as [
                  PreferenceType,
                  (typeof PREFERENCE_OPTIONS)[PreferenceType]
                ][]
              ).map(([type, config]) => (
                <div key={type} className="space-y-3">
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-pink-500" />
                    {config.label}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {config.options.map((option) => (
                      <label
                        key={option.value}
                        className={`
                            flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                            ${
                              isSelected(type, option.value)
                                ? "bg-pink-50 border-pink-300 dark:bg-pink-950/30 dark:border-pink-700"
                                : "bg-gray-50 border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700"
                            }
                          `}
                      >
                        <Checkbox
                          checked={isSelected(type, option.value)}
                          onCheckedChange={() =>
                            togglePreference(type, option.value)
                          }
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GuestPreferencesEditor;
