
import { Suspense, lazy } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load the MenuGrid component
const MenuGrid = lazy(() => import("@/components/Menu/MenuGrid"));

const Menu = () => {
  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <Card variant="glass" className="p-4 md:p-6 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Restaurant Menu
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your restaurant's menu items
        </p>
      </Card>
      <Card variant="default" className="p-4 md:p-6 rounded-xl">
        <Suspense fallback={
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          </div>
        }>
          <div className="overflow-x-auto">
            <MenuGrid />
          </div>
        </Suspense>
      </Card>
    </div>
  );
};

export default Menu;
