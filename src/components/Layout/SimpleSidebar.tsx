
import React, { useState } from "react";
import { X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ImprovedSidebarNavigation } from "./ImprovedSidebarNavigation";

const SimpleSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="bg-white shadow-md hover:bg-gray-50"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-full w-64 
        bg-gradient-to-b from-sidebar-purple to-sidebar-purple-dark 
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-sidebar-purple font-bold text-lg">R</span>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Restaurant Pro</h2>
              <p className="text-white/70 text-xs">Management System</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-white hover:bg-white/10 w-8 h-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <ImprovedSidebarNavigation />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-white/60 text-xs">
              © 2024 Restaurant Pro
            </p>
            <p className="text-white/60 text-xs">
              Version 2.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SimpleSidebar;
