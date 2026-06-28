import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useFranchise } from "@/contexts/FranchiseContext";
import { MockBranch } from "@/data/franchiseMockData";
import { ChevronDown, Check, Building2 } from "lucide-react";

interface FranchiseBranchSwitcherProps {
  compact?: boolean;
}

export const FranchiseBranchSwitcher: React.FC<FranchiseBranchSwitcherProps> = ({
  compact = false,
}) => {
  const { allBranches, currentBranch, setCurrentBranch, currentBranchLabel } =
    useFranchise();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (branch: MockBranch | null) => {
    setCurrentBranch(branch);
    setOpen(false);
  };

  const activeDot = currentBranch
    ? `bg-[${currentBranch.color}]`
    : "bg-gradient-to-r from-violet-500 to-purple-500";

  return (
    <div ref={ref} className="relative w-full">
      <Button
        variant="ghost"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full justify-between gap-2 text-white/90 hover:bg-white/10",
          compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Color indicator */}
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              background: currentBranch
                ? currentBranch.color
                : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
            }}
          />
          <span className="truncate font-medium">{currentBranchLabel}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            open ? "rotate-180" : ""
          )}
        />
      </Button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute top-full mt-1 z-50 rounded-xl shadow-xl border overflow-hidden",
            "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700",
            compact ? "right-0 w-52" : "left-0 right-0 w-full"
          )}
        >
          {/* All Branches option */}
          <button
            onClick={() => select(null)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-800",
              !currentBranch
                ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                : "text-gray-700 dark:text-gray-300"
            )}
          >
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 shrink-0" />
            <span className="flex-1 text-left font-medium">All Branches</span>
            {!currentBranch && (
              <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            )}
          </button>

          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />

          {/* Individual branches */}
          {allBranches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => select(branch)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-800",
                currentBranch?.id === branch.id
                  ? "text-violet-700 dark:text-violet-300"
                  : "text-gray-700 dark:text-gray-300"
              )}
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: branch.color }}
              />
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium truncate">{branch.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  {branch.code} · {branch.city}
                </p>
              </div>
              {currentBranch?.id === branch.id && (
                <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
