import React, { useCallback } from 'react';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { Lock } from 'lucide-react';

interface FeatureLockProps {
  /** Dot-notation feature key (e.g., 'reports.default.staff') */
  feature: string;
  /** The children to render (always visible, but interaction is intercepted when locked) */
  children: React.ReactNode;
  /** 
   * Optional: Render a completely custom locked state instead of the default overlay.
   * If provided, this replaces the children when locked.
   */
  lockedFallback?: React.ReactNode;
  /**
   * If true, wraps children in a container that captures clicks.
   * If false (default for inline usage), only adds the lock icon.
   * @default true
   */
  interceptClicks?: boolean;
  /**
   * Optional CSS class applied to the wrapper div.
   */
  className?: string;
}

/**
 * Wrapper component that gates UI features based on subscription access.
 * 
 * **Locked behavior**: 
 * - The UI element remains visible (never hidden) with a 🔒 lock icon overlay.
 * - Clicking the locked element triggers an upgrade toast instead of the original action.
 * 
 * **Unlocked behavior**: 
 * - Transparently renders children with no overhead.
 * 
 * Usage:
 * ```tsx
 * <FeatureLock feature="reports.default.staff">
 *   <ReportCard title="Staff Report" onClick={handleClick} />
 * </FeatureLock>
 * 
 * <FeatureLock feature="pos.whatsapp_billing">
 *   <Switch checked={whatsappEnabled} onChange={setWhatsappEnabled} />
 * </FeatureLock>
 * ```
 */
export const FeatureLock: React.FC<FeatureLockProps> = ({
  feature,
  children,
  lockedFallback,
  interceptClicks = true,
  className = '',
}) => {
  const { isLocked, loading, showUpgradeToast } = useFeatureGate(feature);

  const handleLockedClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showUpgradeToast();
    },
    [showUpgradeToast]
  );

  // While loading, render children normally (optimistic access)
  if (loading) {
    return <>{children}</>;
  }

  // Unlocked: render children transparently
  if (!isLocked) {
    return <>{children}</>;
  }

  // Locked: show custom fallback if provided
  if (lockedFallback) {
    return <>{lockedFallback}</>;
  }

  // Locked: render with lock overlay + click interception
  if (interceptClicks) {
    return (
      <div
        className={`relative group cursor-not-allowed ${className}`}
        onClick={handleLockedClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showUpgradeToast();
          }
        }}
        aria-label="This feature requires a plan upgrade"
      >
        {/* Children rendered with reduced opacity + pointer-events disabled */}
        <div className="opacity-50 pointer-events-none select-none">
          {children}
        </div>

        {/* Lock icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg">
            <Lock className="h-3.5 w-3.5" />
            <span>Upgrade to unlock</span>
          </div>
        </div>

        {/* Persistent mini lock badge */}
        <div className="absolute top-1 right-1 z-20">
          <div className="bg-amber-500/90 text-white p-1 rounded-full shadow-md">
            <Lock className="h-3 w-3" />
          </div>
        </div>
      </div>
    );
  }

  // Non-intercepting mode: just add a lock icon next to children
  return (
    <div className={`inline-flex items-center gap-1.5 opacity-50 ${className}`}>
      {children}
      <Lock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
    </div>
  );
};

export default FeatureLock;
