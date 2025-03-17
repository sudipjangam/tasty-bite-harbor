
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarDays, SquareMenu, Users, ShoppingBag, Table2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const ModernSidebar = () => {
  const location = useLocation();
  
  const navItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/",
    },
    {
      name: "Reservations",
      icon: CalendarDays,
      path: "/reservations",
    },
    {
      name: "Tables",
      icon: Table2,
      path: "/tables",
    },
    {
      name: "Menu",
      icon: SquareMenu,
      path: "/menu",
    },
    {
      name: "Staff",
      icon: Users,
      path: "/staff",
    },
    {
      name: "Orders",
      icon: ShoppingBag,
      path: "/orders",
    },
  ];

  return (
    <div className="min-h-screen w-16 md:w-64 flex flex-col bg-white shadow-md transition-all duration-200">
      <div className="p-4 flex items-center">
        <Avatar className="h-10 w-10 bg-blue-500 text-white">
          <span className="text-xl font-bold">R</span>
        </Avatar>
        <span className="ml-3 text-lg font-medium hidden md:inline">RestoManager</span>
      </div>
      
      <nav className="flex-1 mt-6">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors",
                  location.pathname === item.path && "bg-blue-50 text-blue-600"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="ml-3 hidden md:inline">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center">
          <Avatar className="h-9 w-9 bg-gray-200">
            <span className="text-sm">JD</span>
          </Avatar>
          <div className="ml-3 hidden md:block">
            <p className="text-sm font-medium">John Doe</p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernSidebar;
