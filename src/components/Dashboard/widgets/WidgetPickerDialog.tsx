import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, LayoutDashboard } from "lucide-react";
import {
  WIDGET_CATALOG,
  MAX_WIDGETS,
  DEFAULT_WIDGETS,
  type WidgetDefinition,
} from "./WidgetRegistry";

interface WidgetPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWidgets: string[];
  onSave: (widgets: string[]) => void;
}

export const WidgetPickerDialog: React.FC<WidgetPickerDialogProps> = ({
  isOpen,
  onClose,
  selectedWidgets,
  onSave,
}) => {
  const [tempSelection, setTempSelection] = useState<string[]>(selectedWidgets);

  // Reset temp selection when dialog opens
  React.useEffect(() => {
    if (isOpen) setTempSelection(selectedWidgets);
  }, [isOpen, selectedWidgets]);

  const handleToggle = (widgetId: string) => {
    setTempSelection((prev) => {
      if (prev.includes(widgetId)) {
        return prev.filter((id) => id !== widgetId);
      }
      if (prev.length >= MAX_WIDGETS) return prev;
      return [...prev, widgetId];
    });
  };

  const handleSave = () => {
    onSave(tempSelection);
    onClose();
  };

  const handleReset = () => {
    setTempSelection(DEFAULT_WIDGETS);
  };

  const isMaxReached = tempSelection.length >= MAX_WIDGETS;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <span>Customize Dashboard</span>
              <p className="text-xs font-normal text-gray-500 mt-0.5">
                Choose up to {MAX_WIDGETS} widgets for your dashboard
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Selection counter */}
        <div className="flex items-center justify-between px-1">
          <Badge
            variant={isMaxReached ? "default" : "outline"}
            className={`text-sm px-3 py-1 ${isMaxReached ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0" : ""}`}
          >
            {tempSelection.length} / {MAX_WIDGETS} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-gray-500 hover:text-gray-700 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset to defaults
          </Button>
        </div>

        {/* Widget Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {WIDGET_CATALOG.map((widget: WidgetDefinition) => {
            const isSelected = tempSelection.includes(widget.id);
            const isDisabled = !isSelected && isMaxReached;
            const Icon = widget.icon;

            return (
              <button
                key={widget.id}
                disabled={isDisabled}
                onClick={() => handleToggle(widget.id)}
                className={`relative flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-400 shadow-md shadow-indigo-500/10"
                    : isDisabled
                      ? "border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm bg-white dark:bg-gray-800"
                }`}
              >
                {/* Checkbox */}
                <div className="pt-0.5">
                  <Checkbox
                    checked={isSelected}
                    disabled={isDisabled}
                    className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                </div>

                {/* Icon */}
                <div
                  className={`shrink-0 p-2 rounded-xl bg-gradient-to-br ${widget.gradient} text-white shadow-sm`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">
                    {widget.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {widget.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="flex flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={tempSelection.length === 0}
            className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
          >
            Save Layout ({tempSelection.length} widgets)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WidgetPickerDialog;
