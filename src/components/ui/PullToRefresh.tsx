import React, { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current && contentRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isRefreshing) return;
    const y = e.touches[0].clientY;
    if (y > startY) {
      setCurrentY(y);
    } else {
      setIsDragging(false);
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging) return;
    setIsDragging(false);
    const distance = currentY - startY;

    if (distance > PULL_THRESHOLD) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setStartY(0);
    setCurrentY(0);
  };

  const distance = Math.max(0, currentY - startY);
  const pullHeight = Math.min(distance, PULL_THRESHOLD + 20);
  const isPulling = isDragging && distance > 0;

  return (
    <div
      className="h-full w-full relative flex flex-col overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-50 pointer-events-none",
          isRefreshing ? "opacity-100" : isPulling ? "opacity-70" : "opacity-0"
        )}
        style={{ height: `${PULL_THRESHOLD}px`, transform: `translateY(${isRefreshing ? 0 : pullHeight - PULL_THRESHOLD}px)` }}
      >
        <div className="bg-background shadow-md rounded-full p-2 mt-2 border border-border">
          <Loader2 className={cn("h-5 w-5 text-primary", isRefreshing && "animate-spin")} style={{ transform: `rotate(${Math.min(distance, 180)}deg)` }} />
        </div>
      </div>
      <div
        ref={contentRef}
        className="flex-1 w-full overflow-y-auto transition-transform duration-200"
        style={{ transform: `translateY(${isRefreshing ? PULL_THRESHOLD / 2 : 0}px)` }}
      >
        {children}
      </div>
    </div>
  );
};
