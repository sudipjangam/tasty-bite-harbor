import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DoorOpen,
  CookingPot,
  Wine,
  CreditCard,
  TreeDeciduous,
  Layers,
  CircleDot,
  Split,
  Plus,
} from "lucide-react";
import { ArchitecturalElementType } from "@/types/tableFloorPlan";

interface AddArchitecturalElementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (params: {
    type: ArchitecturalElementType;
    label: string;
    width: number;
    height: number;
  }) => void;
}

const ELEMENT_PRESETS: Array<{
  type: ArchitecturalElementType;
  label: string;
  defaultLabel: string;
  icon: any;
  defaultW: number;
  defaultH: number;
  desc: string;
}> = [
  {
    type: "door",
    label: "Main Entrance / Door",
    defaultLabel: "Entrance",
    icon: DoorOpen,
    defaultW: 130,
    defaultH: 45,
    desc: "Customer entryway & foyer zone",
  },
  {
    type: "wall",
    label: "Wall / Partition",
    defaultLabel: "Wall",
    icon: Split,
    defaultW: 160,
    defaultH: 20,
    desc: "Solid boundary or glass acoustic partition",
  },
  {
    type: "bar_counter",
    label: "Bar Counter",
    defaultLabel: "Bar & Cocktail Lounge",
    icon: Wine,
    defaultW: 240,
    defaultH: 60,
    desc: "Curved or straight bar with stool markers",
  },
  {
    type: "kitchen_window",
    label: "Kitchen KOT Pass",
    defaultLabel: "Kitchen Window",
    icon: CookingPot,
    defaultW: 160,
    defaultH: 50,
    desc: "Food pickup window & expediter counter",
  },
  {
    type: "cashier_desk",
    label: "Cashier & Host Desk",
    defaultLabel: "Billing Desk",
    icon: CreditCard,
    defaultW: 150,
    defaultH: 45,
    desc: "Front POS billing reception & host podium",
  },
  {
    type: "pillar",
    label: "Pillar / Structural Column",
    defaultLabel: "Column",
    icon: CircleDot,
    defaultW: 45,
    defaultH: 45,
    desc: "Round building support column",
  },
  {
    type: "plant",
    label: "Indoor Planter Box",
    defaultLabel: "Planter",
    icon: TreeDeciduous,
    defaultW: 45,
    defaultH: 45,
    desc: "Decorative greenery & aesthetic dividers",
  },
  {
    type: "restroom",
    label: "Restroom / Washroom",
    defaultLabel: "Restroom",
    icon: Layers,
    defaultW: 110,
    defaultH: 45,
    desc: "Guest washrooms and facilities",
  },
];

export const AddArchitecturalElementDialog: React.FC<AddArchitecturalElementDialogProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [selectedType, setSelectedType] = useState<ArchitecturalElementType>("wall");
  const [customLabel, setCustomLabel] = useState("Partition Wall");
  const [width, setWidth] = useState(160);
  const [height, setHeight] = useState(20);

  const handleSelectPreset = (preset: (typeof ELEMENT_PRESETS)[0]) => {
    setSelectedType(preset.type);
    setCustomLabel(preset.defaultLabel);
    setWidth(preset.defaultW);
    setHeight(preset.defaultH);
  };

  const handleAdd = () => {
    onAdd({
      type: selectedType,
      label: customLabel.trim() || selectedType.toUpperCase(),
      width: Math.max(20, width),
      height: Math.max(15, height),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            <Plus className="h-5 w-5 text-purple-600" />
            Add Architectural Element
          </DialogTitle>
          <p className="text-xs text-gray-500">
            Select a structural component to place onto your 2D restaurant floor plan.
          </p>
        </DialogHeader>

        {/* Preset Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
          {ELEMENT_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedType === preset.type;
            return (
              <button
                key={preset.type}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`flex flex-col text-left p-3 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? "border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 ring-2 ring-purple-500/20 shadow-md"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white/50 dark:bg-gray-900/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-xl ${
                      isSelected
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-xs text-gray-900 dark:text-white truncate">
                    {preset.label}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {preset.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Customization Fields */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="col-span-3 sm:col-span-1 space-y-1.5">
            <Label className="text-xs font-bold">Element Label</Label>
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              className="rounded-xl h-9 text-xs"
              placeholder="e.g. West Wall"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Width (px)</Label>
            <Input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="rounded-xl h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Height (px)</Label>
            <Input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="rounded-xl h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs font-bold">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white text-xs font-bold gap-1.5 shadow-md"
          >
            <Plus className="h-4 w-4" />
            Place on Canvas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
