import React from "react";
import { Room } from "@/hooks/useRooms";
import { RoomSelection } from "@/hooks/useGroupReservations";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { Users, Bed, Check } from "lucide-react";

interface RoomSelectorProps {
  rooms: Room[];
  selectedRooms: RoomSelection[];
  onSelectionChange: (rooms: RoomSelection[]) => void;
}

const RoomSelector: React.FC<RoomSelectorProps> = ({
  rooms,
  selectedRooms,
  onSelectionChange,
}) => {
  const { symbol: currencySymbol } = useCurrencyContext();

  const isSelected = (roomId: string) => {
    return selectedRooms.some((r) => r.roomId === roomId);
  };

  const toggleRoom = (room: Room) => {
    if (isSelected(room.id)) {
      onSelectionChange(selectedRooms.filter((r) => r.roomId !== room.id));
    } else {
      onSelectionChange([
        ...selectedRooms,
        {
          roomId: room.id,
          roomName: room.name,
          price: room.price,
          capacity: room.capacity,
        },
      ]);
    }
  };

  const totalPrice = selectedRooms.reduce((sum, room) => sum + room.price, 0);

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-lg">
            <Bed className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-200">
              {selectedRooms.length} room{selectedRooms.length !== 1 ? "s" : ""}{" "}
              selected
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Click rooms to select/deselect
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {currencySymbol}
            {totalPrice.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">per night</div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No rooms available for the selected dates
          </div>
        ) : (
          rooms.map((room) => {
            const selected = isSelected(room.id);

            return (
              <button
                key={room.id}
                onClick={() => toggleRoom(room)}
                className={cn(
                  "relative p-4 rounded-2xl border-2 transition-all duration-200 text-left group",
                  "hover:shadow-lg hover:-translate-y-0.5",
                  selected
                    ? "border-indigo-500 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 shadow-md"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300"
                )}
              >
                {/* Selection Indicator */}
                <div
                  className={cn(
                    "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    selected
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-gray-300 dark:border-gray-600 group-hover:border-indigo-400"
                  )}
                >
                  {selected && <Check className="h-4 w-4 text-white" />}
                </div>

                {/* Room Info */}
                <div className="pr-8">
                  <h4
                    className={cn(
                      "font-semibold text-lg",
                      selected
                        ? "text-indigo-700 dark:text-indigo-300"
                        : "text-gray-800 dark:text-gray-200"
                    )}
                  >
                    {room.name}
                  </h4>

                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    <span>
                      {room.capacity} guest{room.capacity !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "text-lg font-bold mt-2",
                      selected
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-gray-700 dark:text-gray-300"
                    )}
                  >
                    {currencySymbol}
                    {room.price.toLocaleString()}
                    <span className="text-sm font-normal text-gray-500">
                      /night
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-3">
                  <Badge
                    className={cn(
                      "text-xs",
                      room.status === "available"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    )}
                  >
                    {room.status === "available"
                      ? "🟢 Available"
                      : `⚠️ ${room.status}`}
                  </Badge>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Selected Rooms Summary */}
      {selectedRooms.length > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Selected Rooms:
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedRooms.map((room) => (
              <Badge
                key={room.roomId}
                variant="secondary"
                className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
              >
                {room.roomName} • {currencySymbol}
                {room.price}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomSelector;
