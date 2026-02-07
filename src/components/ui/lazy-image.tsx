import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import swadeshiLogo from "@/assets/swadeshi-logo.png";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  placeholderClassName?: string;
  showLogoLoader?: boolean;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * LazyImage component with Swadeshi Solutions logo placeholder
 *
 * Features:
 * - Native lazy loading with IntersectionObserver fallback
 * - Animated logo placeholder while loading
 * - Smooth fade transition on load
 * - Error state with fallback image support
 *
 * @example
 * <LazyImage
 *   src="/menu/pizza.jpg"
 *   alt="Pizza"
 *   className="w-full h-48 object-cover rounded-xl"
 * />
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  containerClassName,
  placeholderClassName,
  showLogoLoader = true,
  fallbackSrc,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(container);
          }
        });
      },
      {
        rootMargin: "100px", // Start loading 100px before visible
        threshold: 0.01,
      },
    );

    observer.observe(container);

    return () => {
      observer.unobserve(container);
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setIsError(true);
    onError?.();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900",
        containerClassName,
      )}
    >
      {/* Logo Placeholder - shown while loading */}
      {showLogoLoader && !isLoaded && !isError && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-gradient-to-br from-white via-gray-50 to-gray-100",
            "dark:from-gray-800 dark:via-gray-850 dark:to-gray-900",
            placeholderClassName,
          )}
        >
          <div className="relative">
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-2 border-orange-300/40 animate-ping" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-blue-300/40 animate-pulse" />
            </div>
            {/* Logo with subtle animation */}
            <img
              src={swadeshiLogo}
              alt="Loading..."
              className="w-12 h-12 object-contain animate-pulse opacity-70 relative z-10"
            />
          </div>
        </div>
      )}

      {/* Error Fallback */}
      {isError && (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2",
            "bg-gray-100 dark:bg-gray-800 text-gray-400",
          )}
        >
          {fallbackSrc ? (
            <img src={fallbackSrc} alt={alt} className={className} />
          ) : (
            <>
              <img
                src={swadeshiLogo}
                alt="Loading failed"
                className="w-12 h-12 object-contain opacity-30"
              />
              <span className="text-xs text-gray-400">Image unavailable</span>
            </>
          )}
        </div>
      )}

      {/* Actual Image - loaded lazily */}
      {isInView && !isError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-500 ease-in-out",
            isLoaded ? "opacity-100" : "opacity-0",
            className,
          )}
        />
      )}
    </div>
  );
};

/**
 * Simple image with lazy loading - no placeholder animation
 * Use for images where a quick load is expected
 */
export const SimpleLazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => {
  return <img src={src} alt={alt} loading="lazy" className={className} />;
};

/**
 * Avatar with lazy loading and initials fallback
 */
export const LazyAvatar: React.FC<{
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ src, name, size = "md", className }) => {
  const [isError, setIsError] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!src || isError) {
    return (
      <div
        className={cn(
          "rounded-full bg-gradient-to-br from-indigo-500 to-purple-600",
          "flex items-center justify-center text-white font-medium",
          sizeClasses[size],
          className,
        )}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setIsError(true)}
      className={cn("rounded-full object-cover", sizeClasses[size], className)}
    />
  );
};

export default LazyImage;
