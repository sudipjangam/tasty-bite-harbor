
import { Skeleton } from "./skeleton";
import { Card } from "./card";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  type: "table" | "card" | "form" | "list" | "stats";
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ type, count = 3, className }: LoadingSkeletonProps) {
  switch (type) {
    case "table":
      return (
        <div className={cn("w-full space-y-3", className)}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-8 w-[120px]" />
          </div>
          <div className="rounded-md border">
            <div className="bg-muted/50 p-4">
              <div className="grid grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-6" />
                ))}
              </div>
            </div>
            <div className="p-4 space-y-4">
              {[...Array(count)].map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-4">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-6" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "card":
      return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
          {[...Array(count)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      );

    case "form":
      return (
        <div className={cn("space-y-6", className)}>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/5" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="flex justify-end space-x-2">
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>
      );

    case "list":
      return (
        <div className={cn("space-y-4", className)}>
          {[...Array(count)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          ))}
        </div>
      );

    case "stats":
      return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
          {[...Array(count)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
      );

    default:
      return <Skeleton className={cn("h-16 w-full", className)} />;
  }
}
