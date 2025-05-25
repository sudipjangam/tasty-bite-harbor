
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UtensilsCrossed, PackageCheck, Truck } from "lucide-react";

interface POSHeaderProps {
  orderType: string;
  setOrderType: (value: string) => void;
  tableNumber: string;
  setTableNumber: (value: string) => void;
  tables?: { id: string; name: string; capacity: number; }[];
}

const POSHeader = ({ 
  orderType, 
  setOrderType, 
  tableNumber, 
  setTableNumber, 
  tables 
}: POSHeaderProps) => {
  return (
    <div className="flex items-center gap-4 mb-4">
      <Select value={orderType} onValueChange={setOrderType}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select order type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Dine-In">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Dine-In
            </div>
          </SelectItem>
          <SelectItem value="Takeaway">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4" />
              Takeaway
            </div>
          </SelectItem>
          <SelectItem value="Delivery">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Delivery
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {orderType === "Dine-In" && tables && (
        <Select value={tableNumber} onValueChange={setTableNumber}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select table" />
          </SelectTrigger>
          <SelectContent>
            {tables.map(table => (
              <SelectItem key={table.id} value={table.name}>
                Table {table.name} (Capacity: {table.capacity})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default POSHeader;
