
import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

interface SimpleLayoutProps {
  children: ReactNode;
}

export const SimpleLayout = ({ children }: SimpleLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar />
        <main className="flex-1 overflow-auto" style={{ paddingLeft: '7rem' }}>
          <div className="p-4">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
