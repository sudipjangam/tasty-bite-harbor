import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RawMaterial {
  inventory_item_id: string;
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  available_stock: number;
}

interface InventoryItemOption {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number | null;
  category?: string;
}

interface HomemadeIngredientPickerProps {
  materials: RawMaterial[];
  onMaterialsChange: (materials: RawMaterial[]) => void;
  inventoryItems: InventoryItemOption[];
  currencySymbol: string;
}

const MaterialCombobox = ({
  value,
  onValueChange,
  inventoryItems,
  currencySymbol,
  excludeIds,
}: {
  value: string;
  onValueChange: (id: string, item: InventoryItemOption) => void;
  inventoryItems: InventoryItemOption[];
  currencySymbol: string;
  excludeIds: string[];
}) => {
  const [open, setOpen] = useState(false);
  const selectedItem = inventoryItems.find((item) => item.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-xl h-[38px] px-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <span className="truncate flex-1 text-left text-gray-700 dark:text-gray-200 text-xs">
            {selectedItem
              ? `${selectedItem.name} (${selectedItem.unit})`
              : "Search material..."}
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] sm:w-[350px] p-0 z-[100] shadow-xl"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search inventory..." className="h-9" />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup className="max-h-[220px] overflow-auto">
              {inventoryItems
                .filter((item) => !excludeIds.includes(item.id))
                .map((item) => {
                  const stock = Number(parseFloat(String(item.quantity)).toFixed(2));
                  return (
                    <CommandItem
                      key={item.id}
                      value={`${item.name} ${item.id}`}
                      onSelect={() => {
                        onValueChange(item.id, item);
                        setOpen(false);
                      }}
                      className="flex justify-between items-center rounded-lg cursor-pointer my-0.5"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate font-medium text-sm">
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {currencySymbol}
                          {item.cost_per_unit || 0}/{item.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-mono text-muted-foreground bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {stock} {item.unit}
                        </span>
                        <Check
                          className={cn(
                            "h-3.5 w-3.5",
                            value === item.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </div>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const HomemadeIngredientPicker = ({
  materials,
  onMaterialsChange,
  inventoryItems,
  currencySymbol,
}: HomemadeIngredientPickerProps) => {
  const addMaterial = () => {
    onMaterialsChange([
      ...materials,
      {
        inventory_item_id: "",
        name: "",
        quantity: 0,
        unit: "",
        cost_per_unit: 0,
        available_stock: 0,
      },
    ]);
  };

  const removeMaterial = (index: number) => {
    onMaterialsChange(materials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, updates: Partial<RawMaterial>) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], ...updates };
    onMaterialsChange(updated);
  };

  const handleItemSelect = (index: number, itemId: string, item: InventoryItemOption) => {
    updateMaterial(index, {
      inventory_item_id: itemId,
      name: item.name,
      unit: item.unit,
      cost_per_unit: item.cost_per_unit || 0,
      available_stock: item.quantity,
    });
  };

  const totalCost = materials.reduce(
    (sum, m) => sum + m.quantity * m.cost_per_unit,
    0
  );

  const hasInsufficientStock = materials.some(
    (m) => m.inventory_item_id && m.quantity > m.available_stock
  );

  const excludeIds = materials
    .map((m) => m.inventory_item_id)
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          🧪 Raw Materials Used
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMaterial}
          className="h-7 text-xs rounded-lg border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
        >
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>

      {/* Materials List */}
      {materials.length === 0 ? (
        <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          No raw materials added. Click "Add" to select inventory items.
        </div>
      ) : (
        <div className="space-y-2">
          {materials.map((material, index) => {
            const isInsufficient =
              material.inventory_item_id &&
              material.quantity > material.available_stock;
            return (
              <div
                key={index}
                className={`p-2.5 rounded-xl border transition-all ${
                  isInsufficient
                    ? "border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Item picker */}
                  <div className="flex-1 min-w-0">
                    <MaterialCombobox
                      value={material.inventory_item_id}
                      onValueChange={(id, item) =>
                        handleItemSelect(index, id, item)
                      }
                      inventoryItems={inventoryItems}
                      currencySymbol={currencySymbol}
                      excludeIds={excludeIds.filter(
                        (id) => id !== material.inventory_item_id
                      )}
                    />
                  </div>

                  {/* Quantity */}
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={material.quantity || ""}
                    onChange={(e) =>
                      updateMaterial(index, {
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Qty"
                    className="w-20 h-[38px] text-sm rounded-xl text-center"
                  />

                  {/* Unit label */}
                  {material.unit && (
                    <span className="text-xs text-gray-500 font-medium w-8 shrink-0">
                      {material.unit}
                    </span>
                  )}

                  {/* Remove */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMaterial(index)}
                    className="h-7 w-7 shrink-0 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>

                {/* Stock status */}
                {material.inventory_item_id && (
                  <div className="flex items-center justify-between mt-1.5 px-1">
                    <div className="flex items-center gap-1">
                      {isInsufficient ? (
                        <>
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                            Need {material.quantity}, have{" "}
                            {material.available_stock} {material.unit}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            In stock: {material.available_stock} {material.unit}
                          </span>
                        </>
                      )}
                    </div>
                    {material.quantity > 0 && material.cost_per_unit > 0 && (
                      <span className="text-[10px] font-semibold text-gray-500">
                        {currencySymbol}
                        {(material.quantity * material.cost_per_unit).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cost Summary */}
      {materials.length > 0 && totalCost > 0 && (
        <div className="bg-emerald-50/80 dark:bg-emerald-900/15 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Total Production Cost
            </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {currencySymbol}{totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Insufficient stock warning */}
      {hasInsufficientStock && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/40 rounded-xl">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">
            Insufficient stock for one or more materials
          </span>
        </div>
      )}
    </div>
  );
};

export default HomemadeIngredientPicker;
