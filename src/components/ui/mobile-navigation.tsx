import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Menu, 
  X, 
  Home, 
  ShoppingCart, 
  Users, 
  Settings,
  MoreHorizontal,
  ChefHat,
  Package,
  UtensilsCrossed,
  CreditCard,
  Calendar,
  BarChart3,
  BookOpen,
  LogOut,
  Bed,
  Sparkles,
  MapPin,
  Target,
  UserPlus,
  Shield,
  DollarSign,
  FileText,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Permission } from "@/types/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

interface MobileNavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermissions?: Permission[];
  gradient: string;
  shadowColor: string;
  textColor: string;
}

// All navigation items with unique gradients
const mobileNavItems: MobileNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: Home, requiredPermissions: ['dashboard.view'], gradient: 'from-violet-500 to-purple-600', shadowColor: 'shadow-violet-500/30', textColor: 'text-violet-600' },
  { id: 'pos', label: 'POS', path: '/pos', icon: CreditCard, requiredPermissions: ['orders.view'], gradient: 'from-emerald-500 to-teal-600', shadowColor: 'shadow-emerald-500/30', textColor: 'text-emerald-600' },
  { id: 'orders', label: 'Orders', path: '/orders', icon: ShoppingCart, requiredPermissions: ['orders.view'], gradient: 'from-blue-500 to-indigo-600', shadowColor: 'shadow-blue-500/30', textColor: 'text-blue-600' },
  { id: 'kitchen', label: 'Kitchen', path: '/kitchen', icon: ChefHat, requiredPermissions: ['kitchen.view'], gradient: 'from-orange-500 to-red-500', shadowColor: 'shadow-orange-500/30', textColor: 'text-orange-600' },
  { id: 'menu', label: 'Menu', path: '/menu', icon: UtensilsCrossed, requiredPermissions: ['menu.view'], gradient: 'from-amber-500 to-orange-500', shadowColor: 'shadow-amber-500/30', textColor: 'text-amber-600' },
  { id: 'recipes', label: 'Recipes', path: '/recipes', icon: BookOpen, requiredPermissions: ['menu.view'], gradient: 'from-lime-500 to-green-600', shadowColor: 'shadow-lime-500/30', textColor: 'text-lime-600' },
  { id: 'tables', label: 'Tables', path: '/tables', icon: MapPin, requiredPermissions: ['tables.view'], gradient: 'from-cyan-500 to-blue-600', shadowColor: 'shadow-cyan-500/30', textColor: 'text-cyan-600' },
  { id: 'inventory', label: 'Inventory', path: '/inventory', icon: Package, requiredPermissions: ['inventory.view'], gradient: 'from-fuchsia-500 to-pink-600', shadowColor: 'shadow-fuchsia-500/30', textColor: 'text-fuchsia-600' },
  { id: 'rooms', label: 'Rooms', path: '/rooms', icon: Bed, requiredPermissions: ['rooms.view'], gradient: 'from-sky-500 to-cyan-600', shadowColor: 'shadow-sky-500/30', textColor: 'text-sky-600' },
  { id: 'reservations', label: 'Reservations', path: '/reservations', icon: Calendar, requiredPermissions: ['reservations.view'], gradient: 'from-rose-500 to-pink-600', shadowColor: 'shadow-rose-500/30', textColor: 'text-rose-600' },
  { id: 'housekeeping', label: 'Housekeeping', path: '/housekeeping', icon: Sparkles, requiredPermissions: ['housekeeping.view'], gradient: 'from-teal-500 to-emerald-600', shadowColor: 'shadow-teal-500/30', textColor: 'text-teal-600' },
  { id: 'customers', label: 'Customers', path: '/customers', icon: Users, requiredPermissions: ['customers.view'], gradient: 'from-indigo-500 to-purple-600', shadowColor: 'shadow-indigo-500/30', textColor: 'text-indigo-600' },
  { id: 'marketing', label: 'Marketing', path: '/marketing', icon: Target, requiredPermissions: ['customers.view'], gradient: 'from-pink-500 to-rose-600', shadowColor: 'shadow-pink-500/30', textColor: 'text-pink-600' },
  { id: 'staff', label: 'Staff', path: '/staff', icon: Users, requiredPermissions: ['staff.view'], gradient: 'from-blue-600 to-violet-600', shadowColor: 'shadow-blue-600/30', textColor: 'text-blue-600' },
  { id: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart3, requiredPermissions: ['analytics.view'], gradient: 'from-purple-500 to-indigo-600', shadowColor: 'shadow-purple-500/30', textColor: 'text-purple-600' },
  { id: 'financial', label: 'Financial', path: '/financial', icon: DollarSign, requiredPermissions: ['financial.view'], gradient: 'from-green-500 to-emerald-600', shadowColor: 'shadow-green-500/30', textColor: 'text-green-600' },
  { id: 'reports', label: 'Reports', path: '/reports', icon: FileText, requiredPermissions: ['analytics.view'], gradient: 'from-slate-500 to-gray-600', shadowColor: 'shadow-slate-500/30', textColor: 'text-slate-600' },
  { id: 'user-management', label: 'Users', path: '/user-management', icon: UserPlus, requiredPermissions: ['users.manage'], gradient: 'from-violet-600 to-purple-700', shadowColor: 'shadow-violet-600/30', textColor: 'text-violet-600' },
  { id: 'role-management', label: 'Roles', path: '/role-management', icon: Shield, requiredPermissions: ['users.manage'], gradient: 'from-red-500 to-rose-600', shadowColor: 'shadow-red-500/30', textColor: 'text-red-600' },
  { id: 'ai', label: 'AI Assistant', path: '/ai', icon: MessageSquare, requiredPermissions: ['dashboard.view'], gradient: 'from-cyan-400 to-blue-500', shadowColor: 'shadow-cyan-400/30', textColor: 'text-cyan-600' },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, requiredPermissions: ['settings.view'], gradient: 'from-gray-500 to-slate-600', shadowColor: 'shadow-gray-500/30', textColor: 'text-gray-600' },
];

// Priority items for bottom bar
const priorityItemIds = ['dashboard', 'pos', 'orders', 'kitchen', 'menu', 'tables'];

interface MobileNavigationProps {
  className?: string;
}

/**
 * Mobile-optimized navigation with colorful gradient icons - Light Theme
 */
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasAnyPermission } = useAuth();
  const { restaurantName } = useRestaurantId();
  const { toast } = useToast();

  // Filter items based on user permissions
  const hasPermissionForItem = (item: MobileNavItem): boolean => {
    if (!user) return false;
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) return true;
    return hasAnyPermission(item.requiredPermissions);
  };

  const accessibleItems = mobileNavItems.filter(hasPermissionForItem);

  // Get bottom bar items
  const bottomBarItems = priorityItemIds
    .map(id => accessibleItems.find(item => item.id === id))
    .filter(Boolean)
    .slice(0, 4) as MobileNavItem[];

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      setIsOpen(false);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // Dynamic branding
  const brandName = restaurantName || "Swadeshi Solutions RMS";

  // User display info
  const displayName = user?.first_name 
    ? `${user.first_name} ${user.last_name || ""}`.trim() 
    : user?.email?.split("@")[0] || "User";
  const userRole = user?.role_name_text || (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Staff");

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <div className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 px-2 z-50 shadow-2xl shadow-black/10",
        "pb-[env(safe-area-inset-bottom,8px)] pt-2",
        className
      )}>
        <div className="flex items-center justify-around max-w-screen-xl mx-auto">
          {bottomBarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[60px]",
                  active ? "scale-110" : "hover:scale-105"
                )}
              >
                <div className={cn(
                  "p-2.5 rounded-xl transition-all",
                  active 
                    ? `bg-gradient-to-br ${item.gradient} shadow-lg ${item.shadowColor}` 
                    : "bg-gray-100 dark:bg-gray-700"
                )}>
                  <Icon className={cn("h-5 w-5", active ? "text-white" : `${item.textColor} dark:text-gray-300`)} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium truncate w-full text-center",
                  active ? item.textColor : "text-gray-500 dark:text-gray-400"
                )}>{item.label}</span>
              </button>
            );
          })}
          
          <button
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[60px] hover:scale-105"
          >
            <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700">
              <MoreHorizontal className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">More</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-in fade-in" 
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-white via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 rounded-t-3xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom pb-[env(safe-area-inset-bottom,0px)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Restaurant Name */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-5 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => handleNavigate("/")}
                >
                  <h3 className="text-xl font-bold text-white truncate">{brandName}</h3>
                  <p className="text-white/80 text-xs">Tap to go home</p>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle variant="mini" />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors shadow-lg"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-200px)] p-4 bg-gradient-to-b from-purple-50/50 to-white dark:from-gray-800/50 dark:to-gray-900">
              {/* Navigation Grid with Colorful Icons */}
              <div className="grid grid-cols-4 gap-3">
                {accessibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.path)}
                      className={cn(
                        "flex flex-col items-center gap-2.5 p-3 rounded-2xl transition-all transform bg-white dark:bg-gray-800",
                        active 
                          ? "scale-105 shadow-lg ring-2 ring-purple-200 dark:ring-purple-700" 
                          : "hover:scale-105 hover:shadow-md shadow-sm"
                      )}
                    >
                      {/* Gradient Icon Container */}
                      <div className={cn(
                        "p-3 rounded-2xl bg-gradient-to-br shadow-lg transition-all",
                        item.gradient,
                        item.shadowColor
                      )}>
                        <Icon className="h-5 w-5 text-white drop-shadow-sm" />
                      </div>
                      <span className={cn(
                        "font-semibold text-[10px] text-center leading-tight",
                        active ? item.textColor : "text-gray-600 dark:text-gray-300"
                      )}>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {accessibleItems.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-4 bg-gradient-to-br from-gray-400 to-slate-500 rounded-2xl inline-block mb-4 shadow-xl shadow-gray-400/30">
                    <Settings className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-gray-600 font-medium">No modules available</p>
                  <p className="text-sm text-gray-400">Contact admin for access</p>
                </div>
              )}
            </div>
            
            {/* Theme Toggle - Commented out, using mini variant in header instead */}
            {/* <div className="flex justify-center py-3 border-b border-gray-100 dark:border-gray-700">
              <ThemeToggle variant="pill" />
            </div> */}
            
            {/* User Info Footer */}
            <div className="sticky bottom-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl p-4 shadow-2xl shadow-black/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/30">
                  {user?.first_name ? user.first_name.charAt(0) : user?.email?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-gray-800 dark:text-white">{displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userRole}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 transition-all shadow-lg shadow-red-500/25"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-semibold">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
