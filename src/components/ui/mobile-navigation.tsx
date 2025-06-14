
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Menu, 
  X, 
  Home, 
  ShoppingCart, 
  Users, 
  Settings,
  MoreHorizontal
} from "lucide-react";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { cn } from "@/lib/utils";

interface MobileNavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mobileNavItems: MobileNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: Home },
  { id: 'orders', label: 'Orders', path: '/orders', icon: ShoppingCart },
  { id: 'customers', label: 'Customers', path: '/customers', icon: Users },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings },
];

interface MobileNavigationProps {
  className?: string;
}

/**
 * Mobile-optimized navigation for restaurant staff on tablets/phones
 */
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <div className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50",
        className
      )}>
        <div className="flex items-center justify-around">
          {mobileNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                  isActive(item.path)
                    ? "text-purple-600 bg-purple-50"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
          
          <button
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setIsOpen(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Navigation</h3>
              <StandardizedButton
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                icon={<X className="h-4 w-4" />}
              >
                Close
              </StandardizedButton>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.path)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border transition-colors text-left",
                      isActive(item.path)
                        ? "border-purple-200 bg-purple-50 text-purple-700"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
