import React from "react";
import {
  DoorOpen,
  CookingPot,
  Sparkles,
  RotateCw,
  Trash2,
  Maximize2,
  TreeDeciduous,
  CreditCard,
  Wine,
  ShieldAlert,
  Layers,
} from "lucide-react";
import { ArchitecturalElement, ArchitecturalElementType } from "@/types/tableFloorPlan";

interface ArchitecturalElementNodeProps {
  element: ArchitecturalElement;
  isEditMode: boolean;
  isDragging?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onRotate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onResize?: (id: string, deltaW: number, deltaH: number) => void;
}

export const ArchitecturalElementNode: React.FC<ArchitecturalElementNodeProps> = ({
  element,
  isEditMode,
  isDragging,
  onMouseDown,
  onRotate,
  onDelete,
  onResize,
}) => {
  const rotation = element.rotation || 0;

  const renderContent = () => {
    switch (element.type) {
      case "wall":
        return (
          <div className="w-full h-full bg-slate-800 dark:bg-slate-700 rounded-md border border-slate-900 shadow-md flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,#000,#000_5px,#fff_5px,#fff_10px)]" />
            <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase z-10 px-1 truncate select-none">
              {element.label || "WALL"}
            </span>
          </div>
        );

      case "door":
        return (
          <div className="w-full h-full bg-emerald-50/90 dark:bg-emerald-950/50 border-2 border-dashed border-emerald-500 rounded-xl flex items-center justify-between px-2.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px] select-none truncate">
              <DoorOpen className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{element.label || "ENTRANCE"}</span>
            </div>
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
          </div>
        );

      case "pillar":
        return (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700 dark:from-slate-600 dark:to-slate-900 border-2 border-slate-300 dark:border-slate-600 shadow-md flex items-center justify-center text-white font-black text-[11px] select-none ring-2 ring-slate-400/30">
            {element.label || "PIL"}
          </div>
        );

      case "bar_counter":
        return (
          <div className="w-full h-full rounded-2xl bg-gradient-to-r from-amber-800 via-stone-800 to-amber-900 border-2 border-amber-500/80 shadow-lg flex items-center justify-between px-3 text-amber-100 relative overflow-hidden">
            <div className="flex items-center gap-2 z-10 select-none truncate">
              <Wine className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="font-extrabold text-xs tracking-wider uppercase truncate">
                {element.label || "BAR & BEVERAGE COUNTER"}
              </span>
            </div>
            {/* Stool dots */}
            <div className="flex items-center gap-1.5 z-10 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-900 shadow-xs" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-900 shadow-xs" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-900 shadow-xs" />
            </div>
          </div>
        );

      case "kitchen_window":
        return (
          <div className="w-full h-full rounded-2xl bg-gradient-to-r from-rose-900 via-red-900 to-orange-950 border-2 border-rose-500/80 shadow-lg flex items-center justify-between px-3 text-white">
            <div className="flex items-center gap-2 select-none truncate">
              <CookingPot className="h-4 w-4 text-rose-400 shrink-0" />
              <span className="font-black text-xs uppercase tracking-wide truncate">
                {element.label || "KITCHEN PASS (KOT)"}
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white font-extrabold text-[9px] uppercase shrink-0">
              EXPEDITE
            </span>
          </div>
        );

      case "plant":
        return (
          <div className="w-full h-full rounded-full bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-500 shadow-md flex items-center justify-center text-emerald-700 dark:text-emerald-300 ring-4 ring-emerald-500/20">
            <TreeDeciduous className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        );

      case "cashier_desk":
        return (
          <div className="w-full h-full rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 border-2 border-indigo-500/80 shadow-md flex items-center justify-between px-3 text-indigo-100">
            <div className="flex items-center gap-2 select-none truncate">
              <CreditCard className="h-4 w-4 text-indigo-400 shrink-0" />
              <span className="font-bold text-xs uppercase truncate">
                {element.label || "RECEPTION / BILLING"}
              </span>
            </div>
          </div>
        );

      case "restroom":
        return (
          <div className="w-full h-full rounded-xl bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-400 text-blue-800 dark:text-blue-200 flex items-center justify-center gap-1.5 text-xs font-black shadow-sm">
            <span>🚻</span>
            <span className="select-none">{element.label || "RESTROOM"}</span>
          </div>
        );

      default:
        return (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-lg border border-gray-400 flex items-center justify-center text-[10px] font-bold">
            {element.label || element.type}
          </div>
        );
    }
  };

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        transform: `translate(${element.x_pos}px, ${element.y_pos}px) rotate(${rotation}deg)`,
        width: element.width,
        height: element.height,
      }}
      className={`absolute group select-none transition-shadow ${
        isEditMode ? "cursor-move ring-2 ring-purple-400/60 ring-offset-2" : "pointer-events-none"
      } ${isDragging ? "opacity-70 z-30 scale-105 shadow-2xl" : "z-0"}`}
    >
      {renderContent()}

      {/* Edit Mode Hover Toolbar */}
      {isEditMode && !isDragging && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -top-7 right-0 hidden group-hover:flex items-center gap-1 bg-gray-900/90 text-white p-1 rounded-lg shadow-xl z-50 pointer-events-auto"
        >
          {onRotate && (
            <button
              onClick={() => onRotate(element.id)}
              className="p-1 hover:bg-gray-700 rounded transition-colors text-white"
              title="Rotate 90°"
            >
              <RotateCw className="h-3 w-3" />
            </button>
          )}

          {onResize && (
            <button
              onClick={() => onResize(element.id, 20, 0)}
              className="p-1 hover:bg-gray-700 rounded transition-colors text-white text-[10px] font-bold"
              title="Increase Width"
            >
              +W
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(element.id)}
              className="p-1 hover:bg-red-600 rounded transition-colors text-red-300 hover:text-white"
              title="Delete Element"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
