
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ShoppingBag, Users, Tag, Edit3, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomCardProps {
  room: {
    id: string;
    name: string;
    capacity: number;
    status: string;
    price: number;
  };
  foodOrdersTotal?: number;
  onEdit: (room: any) => void;
  onReserve: (room: any) => void;
  onFoodOrder: (room: any) => void;
  onCheckout: (roomId: string) => void;
  getStatusClass: (status: string) => string;
}

const RoomCard: React.FC<RoomCardProps> = ({
  room,
  foodOrdersTotal,
  onEdit,
  onReserve,
  onFoodOrder,
  onCheckout,
  getStatusClass
}) => {
  // Get status gradient for card
  const getStatusGradient = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-500/20 dark:via-teal-500/10';
      case 'occupied':
        return 'from-blue-500/10 via-indigo-500/5 to-transparent dark:from-blue-500/20 dark:via-indigo-500/10';
      case 'cleaning':
        return 'from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-500/20 dark:via-orange-500/10';
      case 'maintenance':
        return 'from-rose-500/10 via-pink-500/5 to-transparent dark:from-rose-500/20 dark:via-pink-500/10';
      default:
        return 'from-gray-500/10 via-gray-400/5 to-transparent';
    }
  };

  // Get status border color
  const getStatusBorderColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'border-l-4 border-l-emerald-500';
      case 'occupied':
        return 'border-l-4 border-l-blue-500';
      case 'cleaning':
        return 'border-l-4 border-l-amber-500';
      case 'maintenance':
        return 'border-l-4 border-l-rose-500';
      default:
        return 'border-l-4 border-l-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return {
          bg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
          text: 'text-white',
          icon: '✓'
        };
      case 'occupied':
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          text: 'text-white',
          icon: '👤'
        };
      case 'cleaning':
        return {
          bg: 'bg-gradient-to-r from-amber-500 to-orange-600',
          text: 'text-white',
          icon: '🧹'
        };
      case 'maintenance':
        return {
          bg: 'bg-gradient-to-r from-rose-500 to-pink-600',
          text: 'text-white',
          icon: '🔧'
        };
      default:
        return {
          bg: 'bg-gray-200',
          text: 'text-gray-700',
          icon: ''
        };
    }
  };

  const badge = getStatusBadge(room.status);
  
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300",
      "hover:shadow-xl hover:-translate-y-1",
      "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm",
      "border border-gray-200/50 dark:border-gray-700/50",
      getStatusBorderColor(room.status),
      "rounded-2xl"
    )}>
      {/* Background gradient overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-60",
        getStatusGradient(room.status)
      )} />
      
      <CardHeader className="relative pb-2 pt-5">
        <CardTitle className="flex justify-between items-start">
          <span className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {room.name}
          </span>
          <span className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-semibold shadow-lg",
            badge.bg,
            badge.text
          )}>
            <span>{badge.icon}</span>
            {room.status}
          </span>
        </CardTitle>
        
        <CardDescription className="space-y-3 mt-4">
          <div className="flex items-center gap-3 p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-md">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Capacity</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">{room.capacity} {room.capacity === 1 ? "person" : "people"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
              <Tag className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">₹{room.price} / night</p>
            </div>
          </div>
          
          {room.status === "occupied" && foodOrdersTotal && foodOrdersTotal > 0 && (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md">
                <ShoppingBag className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400">Food Orders</p>
                <p className="font-bold text-purple-700 dark:text-purple-300">₹{foodOrdersTotal.toFixed(2)}</p>
              </div>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardFooter className="relative flex flex-wrap gap-2 pt-2 pb-5 px-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onEdit(room)}
          className="flex-1 bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all duration-200"
        >
          <Edit3 className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        
        {room.status === "available" ? (
          <Button
            size="sm"
            onClick={() => onReserve(room)}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
            Reserve
          </Button>
        ) : room.status === "occupied" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFoodOrder(room)}
              className="flex-1 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-medium rounded-xl transition-all duration-200"
            >
              <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
              Food Order
            </Button>
            <Button
              size="sm"
              onClick={() => onCheckout(room.id)}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Checkout
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="flex-1 text-gray-500 rounded-xl"
          >
            {room.status === "cleaning" ? "🧹 Cleaning" : "🔧 Maintenance"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default RoomCard;
