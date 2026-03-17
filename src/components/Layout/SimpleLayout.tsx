import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import OwnerNotificationBell from "@/components/Notifications/OwnerNotificationBell";

interface SimpleLayoutProps {
  children: ReactNode;
}

export const SimpleLayout = ({ children }: SimpleLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar />
        <main 
          className="flex-1 overflow-auto overflow-x-hidden pb-20 lg:pb-0 w-full safe-area-inset-bottom" 
          style={{ paddingLeft: isMobile ? '0' : '7rem' }}
        >
          {/* Global Owner Notification Bell - fixed top-right */}
          <div className="sticky top-0 z-40 flex justify-end px-3 sm:px-4 md:px-6 pt-2">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-0.5 shadow-lg">
              <OwnerNotificationBell />
            </div>
          </div>
          <div className="p-3 sm:p-4 md:p-6 w-full max-w-full overflow-x-hidden -mt-2">
            {children}
          </div>
        </main>
        {isMobile && <MobileNavigation />}
      </div>
    </SidebarProvider>
  );
};
