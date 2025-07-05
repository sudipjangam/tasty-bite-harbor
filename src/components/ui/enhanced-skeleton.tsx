
import { Skeleton } from "./skeleton";
import { Card } from "./card";
import { cn } from "@/lib/utils";

interface EnhancedSkeletonProps {
  type: "table" | "card" | "form" | "list" | "stats" | "inventory" | "orders" | "purchase-orders";
  count?: number;
  className?: string;
  showHeader?: boolean;
  columns?: number;
}

export function EnhancedSkeleton({ 
  type, 
  count = 3, 
  className,
  showHeader = true,
  columns = 4
}: EnhancedSkeletonProps) {
  switch (type) {
    case "inventory":
      return (
        <div className={cn("space-y-4", className)}>
          {showHeader && (
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-[200px]" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-[100px]" />
                <Skeleton className="h-8 w-[120px]" />
              </div>
            </div>
          )}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4`}>
            {[...Array(count)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );

    case "purchase-orders":
      return (
        <div className={cn("space-y-4", className)}>
          {showHeader && (
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-[250px]" />
              <Skeleton className="h-10 w-[180px]" />
            </div>
          )}
          <div className="space-y-4">
            {[...Array(count)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );

    case "orders":
      return (
        <div className={cn("space-y-4", className)}>
          {showHeader && (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <Skeleton className="h-8 w-[200px]" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-[100px]" />
                <Skeleton className="h-8 w-[100px]" />
                <Skeleton className="h-8 w-[120px]" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </Card>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(count)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div className={cn("space-y-4", className)}>
          {[...Array(count)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
  }
}
