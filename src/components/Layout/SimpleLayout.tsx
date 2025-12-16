import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { useIsMobile } from "@/hooks/use-mobile";

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
          <div className="p-3 sm:p-4 md:p-6 w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
        {isMobile && <MobileNavigation />}
      </div>
    </SidebarProvider>
  );
};
