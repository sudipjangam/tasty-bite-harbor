import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  verifyQuickPin,
  getRememberedUser,
  clearRememberedUser,
  type RememberedUser,
} from "@/utils/pinAuth";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import {
  Fingerprint,
  Delete,
  Lock,
  UserCheck,
  ArrowRight,
  Sparkles,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickPinLoginProps {
  onSuccess: () => void;
  onUsePassword: () => void;
  onSwitchAccount: () => void;
}

export const QuickPinLogin: React.FC<QuickPinLoginProps> = ({
  onSuccess,
  onUsePassword,
  onSwitchAccount,
}) => {
  const [rememberedUser, setRememberedUser] = useState<RememberedUser | null>(null);
  const [pin, setPin] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorShake, setErrorShake] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const { authenticate, isAvailable } = useBiometricAuth();

  useEffect(() => {
    const user = getRememberedUser();
    setRememberedUser(user);

    isAvailable().then((avail) => {
      setBiometricAvailable(avail);
    });
  }, [isAvailable]);

  // Handle Biometric Login
  const handleBiometricAuth = useCallback(async () => {
    const ok = await authenticate({
      reason: "Unlock Swadeshi Solutions POS",
    });

    if (ok) {
      // Check if active Supabase session exists
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        toast({
          title: "Welcome back!",
          description: `Logged in as ${rememberedUser?.firstName || rememberedUser?.email || "User"}`,
          className: "bg-emerald-50 border-emerald-200 text-emerald-800",
        });
        onSuccess();
      } else {
        // Session expired, need full login
        toast({
          title: "Session Expired",
          description: "Please enter your password to re-authenticate.",
        });
        onUsePassword();
      }
    }
  }, [authenticate, onSuccess, onUsePassword, rememberedUser]);

  // Handle PIN Submission
  const handlePinSubmit = useCallback(
    async (pinToVerify: string) => {
      if (isVerifying) return;
      setIsVerifying(true);

      const isValid = await verifyQuickPin(pinToVerify);

      if (isValid) {
        // Verify or renew session
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          toast({
            title: "Welcome back!",
            description: `Unlocked for ${rememberedUser?.firstName || rememberedUser?.email || "User"}`,
            className: "bg-emerald-50 border-emerald-200 text-emerald-800",
          });
          setIsVerifying(false);
          onSuccess();
          return;
        } else {
          // Token expired, fallback to password
          toast({
            title: "Session Expired",
            description: "Please sign in with your password to refresh your session.",
          });
          setIsVerifying(false);
          onUsePassword();
          return;
        }
      } else {
        // Invalid PIN
        setErrorShake(true);
        setPin("");
        setTimeout(() => setErrorShake(false), 500);
        toast({
          title: "Incorrect PIN",
          description: "Please try again or use your password.",
          variant: "destructive",
        });
        setIsVerifying(false);
      }
    },
    [isVerifying, onSuccess, onUsePassword, rememberedUser]
  );

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        handlePinSubmit(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  const displayName = rememberedUser?.firstName
    ? `${rememberedUser.firstName} ${rememberedUser.lastName || ""}`.trim()
    : rememberedUser?.email || "Restaurant Staff";

  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col items-center px-2 sm:px-4 py-2 space-y-4 max-w-sm mx-auto w-full">
      {/* Remembered User Profile Chip (Skeuomorphic Raised Disc) */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="relative p-1.5 rounded-full skeuo-circle">
          <Avatar className="h-16 w-16 border-2 border-white/80 dark:border-slate-700 shadow-inner">
            {rememberedUser?.avatarUrl && (
              <AvatarImage src={rememberedUser.avatarUrl} alt={displayName} />
            )}
            <AvatarFallback className="bg-gradient-to-tr from-[#2E3192] to-[#F26722] text-white font-black text-lg">
              {userInitials || <UserCheck className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 bg-emerald-500 rounded-full p-1 border-2 border-white shadow-md">
            <Lock className="h-3 w-3 text-white" />
          </div>
        </div>

        <div>
          <h3 className="font-black text-gray-900 dark:text-white text-base sm:text-lg tracking-tight">
            {displayName}
          </h3>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {rememberedUser?.email}
            </span>
            {rememberedUser?.role && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 capitalize skeuo-inset border-0 text-[#2E3192] dark:text-indigo-400 font-bold">
                {rememberedUser.role}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 4-Digit Sunken PIN Wells */}
      <div
        className={cn(
          "flex justify-center items-center gap-4 py-2 px-6 rounded-2xl skeuo-inset transition-transform duration-200",
          errorShake && "animate-shake"
        )}
      >
        {[0, 1, 2, 3].map((index) => {
          const isFilled = pin.length > index;
          return (
            <div
              key={index}
              className={cn(
                "h-4 w-4 rounded-full transition-all duration-200",
                isFilled
                  ? "bg-gradient-to-r from-[#2E3192] to-[#F26722] scale-110 shadow-[0_0_10px_rgba(46,49,146,0.5)]"
                  : "bg-gray-300 dark:bg-slate-700 shadow-inner"
              )}
            />
          );
        })}
      </div>

      {/* Tactile Skeuomorphic Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[270px] pt-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(String(num))}
            disabled={isVerifying}
            className="h-13 sm:h-14 rounded-2xl skeuo-btn flex items-center justify-center text-xl font-bold text-gray-800 dark:text-white select-none touch-manipulation active:scale-95"
          >
            {num}
          </button>
        ))}

        {/* Biometric or Clear */}
        {biometricAvailable ? (
          <button
            type="button"
            onClick={handleBiometricAuth}
            className="h-13 sm:h-14 rounded-2xl skeuo-btn flex items-center justify-center text-[#2E3192] dark:text-indigo-400 select-none touch-manipulation active:scale-95"
            title="Biometric Fingerprint Unlock"
          >
            <Fingerprint className="h-6 w-6" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClear}
            className="h-13 sm:h-14 rounded-2xl skeuo-btn flex items-center justify-center text-gray-500 hover:text-gray-800 text-xs font-bold uppercase tracking-wider select-none touch-manipulation active:scale-95"
          >
            Clear
          </button>
        )}

        {/* Zero */}
        <button
          type="button"
          onClick={() => handleKeyPress("0")}
          disabled={isVerifying}
          className="h-13 sm:h-14 rounded-2xl skeuo-btn flex items-center justify-center text-xl font-bold text-gray-800 dark:text-white select-none touch-manipulation active:scale-95"
        >
          0
        </button>

        {/* Backspace */}
        <button
          type="button"
          onClick={handleBackspace}
          className="h-13 sm:h-14 rounded-2xl skeuo-btn flex items-center justify-center text-gray-600 dark:text-gray-300 select-none touch-manipulation active:scale-95"
          title="Backspace"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>

      {/* Alternative Options */}
      <div className="flex flex-col items-center gap-2 pt-2 w-full text-center">
        <Button
          type="button"
          variant="link"
          onClick={onUsePassword}
          className="text-xs sm:text-sm text-[#2E3192] hover:text-[#1a1f6e] dark:text-indigo-400 font-bold h-auto p-0"
        >
          <KeyRound className="h-3.5 w-3.5 mr-1.5" />
          Sign in with Password instead
        </Button>

        <button
          type="button"
          onClick={onSwitchAccount}
          className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 flex items-center justify-center gap-1 py-1"
        >
          <RotateCcw className="h-3 w-3" />
          Switch Account
        </button>
      </div>
    </div>
  );
};
