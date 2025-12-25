import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UtensilsCrossed, PackageCheck, Truck, Ban } from "lucide-react";

interface POSHeaderProps {
  orderType: string;
  setOrderType: (value: string) => void;
  tableNumber: string;
  setTableNumber: (value: string) => void;
  tables?: { id: string; name: string; capacity: number }[];
}

const POSHeader = ({
  orderType,
  setOrderType,
  tableNumber,
  setTableNumber,
  tables,
}: POSHeaderProps) => {
  const getOrderTypeIcon = () => {
    switch (orderType) {
      case "Dine-In":
        return <UtensilsCrossed className="w-4 h-4" />;
      case "Takeaway":
        return <PackageCheck className="w-4 h-4" />;
      case "Delivery":
        return <Truck className="w-4 h-4" />;
      case "Non-Chargeable":
        return <Ban className="w-4 h-4" />;
      default:
        return <UtensilsCrossed className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Order Type Selector with gradient */}
      <Select value={orderType} onValueChange={setOrderType}>
        <SelectTrigger className="w-[160px] bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-2 border-indigo-200 dark:border-indigo-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg text-white">
              {getOrderTypeIcon()}
            </div>
            <SelectValue placeholder="Order type" />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-2 border-indigo-100 dark:border-indigo-800 shadow-xl">
          <SelectItem
            value="Dine-In"
            className="rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
          >
            <div className="flex items-center gap-2 py-1">
              <div className="p-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-lg text-white">
                <UtensilsCrossed className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium">Dine-In</span>
            </div>
          </SelectItem>
          <SelectItem
            value="Takeaway"
            className="rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/30"
          >
            <div className="flex items-center gap-2 py-1">
              <div className="p-1.5 bg-gradient-to-r from-orange-400 to-amber-500 rounded-lg text-white">
                <PackageCheck className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium">Takeaway</span>
            </div>
          </SelectItem>
          <SelectItem
            value="Delivery"
            className="rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
          >
            <div className="flex items-center gap-2 py-1">
              <div className="p-1.5 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-lg text-white">
                <Truck className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium">Delivery</span>
            </div>
          </SelectItem>
          <SelectItem
            value="Non-Chargeable"
            className="rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <div className="flex items-center gap-2 py-1">
              <div className="p-1.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg text-white">
                <Ban className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-red-600 dark:text-red-400">
                  Non-Chargeable
                </span>
                <span className="text-[10px] text-gray-500">
                  Accidental KOT
                </span>
              </div>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Table Selector with gradient */}
      {orderType === "Dine-In" && tables && (
        <Select value={tableNumber} onValueChange={setTableNumber}>
          <SelectTrigger className="w-[180px] bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-200 dark:border-emerald-700 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-pulse"></div>
              <SelectValue placeholder="Select table" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-2 border-emerald-100 dark:border-emerald-800 shadow-xl max-h-[200px]">
            {tables.map((table) => (
              <SelectItem
                key={table.id}
                value={table.name}
                className="rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
              >
                <div className="flex items-center gap-2 py-0.5">
                  <span className="font-medium">Table {table.name}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                    {table.capacity} seats
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default POSHeader;
