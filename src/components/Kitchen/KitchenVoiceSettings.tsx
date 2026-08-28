import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Volume2,
  VolumeX,
  Mic,
  Languages,
  Play,
  Gauge,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useKitchenSounds, SUPPORTED_LANGUAGES } from "@/hooks/useKitchenSounds";

interface KitchenVoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KitchenVoiceSettings: React.FC<KitchenVoiceSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    isAudioEnabled,
    isVoiceEnabled,
    selectedLanguage,
    voiceRate,
    detectedVoiceName,
    enableAudio,
    disableAudio,
    setLanguage,
    setVoiceEnabled,
    setVoiceRate,
    testVoice,
  } = useKitchenSounds();

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border-2 border-indigo-200 dark:border-indigo-900 shadow-2xl">
        {/* Top Gradient Banner */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-md">
              <Mic className="h-6 w-6 text-yellow-300 fill-yellow-300" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Kitchen Voice Calls
              </DialogTitle>
              <DialogDescription className="text-xs text-purple-100 font-medium">
                Vernacular audio expediter for kitchen orders
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Master Sound & Voice Toggles */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    isAudioEnabled
                      ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                  }`}
                >
                  {isAudioEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                    Master KDS Sound
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    Audio chimes and alert sounds
                  </p>
                </div>
              </div>
              <Switch
                checked={isAudioEnabled}
                onCheckedChange={(checked) =>
                  checked ? enableAudio() : disableAudio()
                }
              />
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-700" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    isVoiceEnabled
                      ? "bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                    Spoken Voice Calls
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    Speaks ticket items aloud in regional language
                  </p>
                </div>
              </div>
              <Switch
                checked={isVoiceEnabled}
                onCheckedChange={(checked) => setVoiceEnabled(checked)}
                disabled={!isAudioEnabled}
              />
            </div>
          </div>

          {/* Regional Language Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-indigo-500" />
              <span>Vernacular Spoken Language (10+ Indian Languages)</span>
            </label>

            <Select
              value={selectedLanguage}
              onValueChange={(val) => setLanguage(val)}
              disabled={!isAudioEnabled || !isVoiceEnabled}
            >
              <SelectTrigger className="w-full rounded-2xl h-11 bg-white dark:bg-gray-800 border-2 border-indigo-100 dark:border-indigo-800 font-bold text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">{currentLangObj.flag}</span>
                  <span>{currentLangObj.name}</span>
                  <span className="text-gray-400 font-normal">
                    ({currentLangObj.nativeName})
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-64 rounded-2xl border-2 border-indigo-100 dark:border-indigo-800">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="rounded-xl text-xs py-2 font-medium"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{lang.flag}</span>
                      <span className="font-bold">{lang.name}</span>
                      <span className="text-gray-400 font-normal">
                        ({lang.nativeName})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Voice Detection Status */}
            <div className="mt-1.5 px-1">
              {detectedVoiceName ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                    ✓ Voice: {detectedVoiceName}
                  </span>
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                      No {currentLangObj.name} voice installed — will speak in English
                    </span>
                  </div>
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 leading-snug pl-[18px]">
                    To enable {currentLangObj.nativeName} speech: Windows Settings → Time & Language → Language → Add "{currentLangObj.name}" → Download Speech Pack
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Voice Speed Slider */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-purple-500" />
                Speech Speed Rate
              </span>
              <span className="font-black text-purple-600 dark:text-purple-400">
                {voiceRate.toFixed(1)}x
              </span>
            </div>
            <Slider
              value={[voiceRate]}
              min={0.5}
              max={2.0}
              step={0.1}
              onValueChange={([val]) => setVoiceRate(val)}
              disabled={!isAudioEnabled || !isVoiceEnabled}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
              <span>0.5x (Very Slow)</span>
              <span>1.0x (Normal)</span>
              <span>2.0x (Very Fast)</span>
            </div>
          </div>

          {/* Spoken Preview Box */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
            <p className="text-[10px] uppercase font-black text-indigo-500 tracking-wider mb-1">
              Sample Voice Callout ({currentLangObj.nativeName}):
            </p>
            <p className="text-xs font-bold text-gray-900 dark:text-indigo-100 italic">
              "{currentLangObj.testSample}"
            </p>
          </div>

          {/* Test Voice Sample Button */}
          <Button
            onClick={() => testVoice()}
            disabled={!isAudioEnabled || !isVoiceEnabled}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs shadow-md gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            Play Test Order Call ({currentLangObj.name})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KitchenVoiceSettings;
