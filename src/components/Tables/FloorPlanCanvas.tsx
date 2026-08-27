import React, { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Layers,
  Edit3,
  Save,
  Plus,
  Trash2,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Move,
  Flame,
  LayoutGrid,
  BrickWall,
  SquareDashedBottomCode,
} from "lucide-react";
import {
  FloorTable,
  FloorSection,
  TableOccupancyStatus,
  TableShape,
  ArchitecturalElement,
  ArchitecturalElementType,
} from "@/types/tableFloorPlan";
import { ArchitecturalElementNode } from "./ArchitecturalElementNode";
import { AddArchitecturalElementDialog } from "./AddArchitecturalElementDialog";

interface FloorPlanCanvasProps {
  tables: FloorTable[];
  sections: FloorSection[];
  activeSection: string;
  onSelectSection: (section: string) => void;
  onTableClick: (table: FloorTable) => void;
  onSaveLayout: (tables: Array<{ id: string; x_pos: number; y_pos: number; width?: number; height?: number; shape?: string }>) => void;
  onCreateTable: (params: { name: string; capacity: number; shape: TableShape; section: string }) => void;
  onDeleteTable: (id: string) => void;
  isSaving?: boolean;
  // Architectural elements props
  architecturalElements?: ArchitecturalElement[];
  onAddArchitecturalElement?: (params: { type: ArchitecturalElementType; label: string; width: number; height: number }) => void;
  onDeleteArchitecturalElement?: (id: string) => void;
  onRotateArchitecturalElement?: (id: string) => void;
  onResizeArchitecturalElement?: (id: string, deltaW: number, deltaH: number) => void;
  onSaveArchitecturalElements?: (elements: ArchitecturalElement[]) => void;
}

const STATUS_COLORS: Record<TableOccupancyStatus, { border: string; bg: string; text: string; glow: string }> = {
  available: {
    border: "border-emerald-500",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-100",
    text: "text-emerald-700 dark:text-emerald-400",
    glow: "shadow-emerald-500/20",
  },
  seated: {
    border: "border-blue-500",
    bg: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-950 dark:text-blue-100",
    text: "text-blue-700 dark:text-blue-400",
    glow: "shadow-blue-500/20",
  },
  served: {
    border: "border-orange-500",
    bg: "bg-orange-500/10 dark:bg-orange-500/20 text-orange-950 dark:text-orange-100",
    text: "text-orange-700 dark:text-orange-400",
    glow: "shadow-orange-500/20",
  },
  billed: {
    border: "border-purple-500",
    bg: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-950 dark:text-purple-100",
    text: "text-purple-700 dark:text-purple-400",
    glow: "shadow-purple-500/20",
  },
  reserved: {
    border: "border-amber-500",
    bg: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-950 dark:text-amber-100",
    text: "text-amber-700 dark:text-amber-400",
    glow: "shadow-amber-500/20",
  },
  dirty: {
    border: "border-gray-400",
    bg: "bg-gray-200/50 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    text: "text-gray-500",
    glow: "shadow-gray-400/20",
  },
};

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  tables,
  sections,
  activeSection,
  onSelectSection,
  onTableClick,
  onSaveLayout,
  onCreateTable,
  onDeleteTable,
  isSaving,
  architecturalElements = [],
  onAddArchitecturalElement,
  onDeleteArchitecturalElement,
  onRotateArchitecturalElement,
  onResizeArchitecturalElement,
  onSaveArchitecturalElements,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [localElementPositions, setLocalElementPositions] = useState<Record<string, { x: number; y: number }>>({});

  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isAddElementOpen, setIsAddElementOpen] = useState(false);

  // New Table Form State
  const [newTableName, setNewTableName] = useState("");
  const [newTableCap, setNewTableCap] = useState(4);
  const [newTableShape, setNewTableShape] = useState<TableShape>("rectangle");

  const canvasRef = useRef<HTMLDivElement>(null);

  // Sync positions when tables change
  React.useEffect(() => {
    const posMap: Record<string, { x: number; y: number }> = {};
    tables.forEach((t) => {
      posMap[t.id] = { x: t.x_pos, y: t.y_pos };
    });
    setLocalPositions(posMap);
  }, [tables]);

  // Sync positions when architectural elements change
  React.useEffect(() => {
    const elemPosMap: Record<string, { x: number; y: number }> = {};
    architecturalElements.forEach((e) => {
      elemPosMap[e.id] = { x: e.x_pos, y: e.y_pos };
    });
    setLocalElementPositions(elemPosMap);
  }, [architecturalElements]);

  // Drag Handlers for Tables
  const handleTableMouseDown = (e: React.MouseEvent, table: FloorTable) => {
    if (!isEditMode) return;
    e.preventDefault();
    setDraggedTableId(table.id);
    setDraggedElementId(null);
    const curPos = localPositions[table.id] || { x: table.x_pos, y: table.y_pos };
    setDragOffset({
      x: e.clientX - curPos.x,
      y: e.clientY - curPos.y,
    });
  };

  // Drag Handlers for Architectural Elements
  const handleElementMouseDown = (e: React.MouseEvent, element: ArchitecturalElement) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggedElementId(element.id);
    setDraggedTableId(null);
    const curPos = localElementPositions[element.id] || { x: element.x_pos, y: element.y_pos };
    setDragOffset({
      x: e.clientX - curPos.x,
      y: e.clientY - curPos.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditMode) return;

      if (draggedTableId) {
        const rawX = e.clientX - dragOffset.x;
        const rawY = e.clientY - dragOffset.y;
        const snappedX = Math.max(10, Math.round(rawX / 15) * 15);
        const snappedY = Math.max(10, Math.round(rawY / 15) * 15);

        setLocalPositions((prev) => ({
          ...prev,
          [draggedTableId]: { x: snappedX, y: snappedY },
        }));
      } else if (draggedElementId) {
        const rawX = e.clientX - dragOffset.x;
        const rawY = e.clientY - dragOffset.y;
        const snappedX = Math.max(10, Math.round(rawX / 15) * 15);
        const snappedY = Math.max(10, Math.round(rawY / 15) * 15);

        setLocalElementPositions((prev) => ({
          ...prev,
          [draggedElementId]: { x: snappedX, y: snappedY },
        }));
      }
    },
    [draggedTableId, draggedElementId, isEditMode, dragOffset],
  );

  const handleMouseUp = () => {
    setDraggedTableId(null);
    setDraggedElementId(null);
  };

  const handleSavePositions = () => {
    // 1. Save Tables
    const tablePayload = tables.map((t) => ({
      id: t.id,
      x_pos: localPositions[t.id]?.x ?? t.x_pos,
      y_pos: localPositions[t.id]?.y ?? t.y_pos,
      width: t.width,
      height: t.height,
      shape: t.shape,
    }));
    onSaveLayout(tablePayload);

    // 2. Save Architectural Elements
    if (onSaveArchitecturalElements) {
      const updatedElements = architecturalElements.map((e) => ({
        ...e,
        x_pos: localElementPositions[e.id]?.x ?? e.x_pos,
        y_pos: localElementPositions[e.id]?.y ?? e.y_pos,
      }));
      onSaveArchitecturalElements(updatedElements);
    }

    setIsEditMode(false);
  };

  const handleCreateTableSubmit = () => {
    if (!newTableName) return;
    onCreateTable({
      name: newTableName,
      capacity: newTableCap,
      shape: newTableShape,
      section: activeSection === "All" ? "Main Dining" : activeSection,
    });
    setIsAddTableOpen(false);
    setNewTableName("");
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Sections Tabs + Edit Layout Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-3.5 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        {/* Section Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <Button
            size="sm"
            variant={activeSection === "All" ? "default" : "outline"}
            onClick={() => onSelectSection("All")}
            className={`rounded-xl text-xs font-bold ${
              activeSection === "All"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : ""
            }`}
          >
            All Sections ({tables.length})
          </Button>

          {sections.map((sec) => (
            <Button
              key={sec.id}
              size="sm"
              variant={activeSection === sec.name ? "default" : "outline"}
              onClick={() => onSelectSection(sec.name)}
              className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
                activeSection === sec.name
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : ""
              }`}
            >
              {sec.name}
            </Button>
          ))}
        </div>

        {/* Edit Layout Controls */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {isEditMode ? (
            <>
              {onAddArchitecturalElement && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddElementOpen(true)}
                  className="rounded-xl text-xs font-semibold gap-1.5 border-indigo-200 text-indigo-700 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  <BrickWall className="h-4 w-4" /> Add Structure
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddTableOpen(true)}
                className="rounded-xl text-xs font-semibold gap-1.5 border-purple-200 text-purple-700 dark:border-purple-800"
              >
                <Plus className="h-4 w-4" /> Add Table
              </Button>

              <Button
                size="sm"
                onClick={handleSavePositions}
                disabled={isSaving}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold gap-1.5 shadow-md"
              >
                <Save className="h-4 w-4" /> Save Floor Plan
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditMode(true)}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Edit3 className="h-4 w-4 text-purple-600" /> Edit Layout
            </Button>
          )}
        </div>
      </div>

      {/* 2D Interactive Canvas */}
      <Card
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative w-full h-[640px] rounded-3xl border-2 overflow-hidden select-none transition-all shadow-xl ${
          isEditMode
            ? "bg-[radial-gradient(#9333ea_1px,transparent_1px)] [background-size:24px_24px] bg-purple-50/20 dark:bg-purple-950/10 border-purple-400/60"
            : "bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] bg-slate-50/60 dark:bg-gray-900/60 border-gray-200 dark:border-gray-800"
        }`}
      >
        {/* Helper Badge in Edit Mode */}
        {isEditMode && (
          <div className="absolute top-4 left-4 z-20 bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 animate-bounce">
            <Move className="h-3.5 w-3.5" /> Drag & Snap tables or structural walls to reposition
          </div>
        )}

        {/* Status Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg text-[11px] font-semibold">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Seated
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Served
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Billed
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Reserved
          </div>
        </div>

        {/* 1. Layer 1: Architectural Structural Elements (Walls, Bar, Doors, Kitchen Pass, Plants) */}
        {architecturalElements.map((elem) => {
          const pos = localElementPositions[elem.id] || { x: elem.x_pos, y: elem.y_pos };
          const elemWithLocalPos = { ...elem, x_pos: pos.x, y_pos: pos.y };

          return (
            <ArchitecturalElementNode
              key={elem.id}
              element={elemWithLocalPos}
              isEditMode={isEditMode}
              isDragging={draggedElementId === elem.id}
              onMouseDown={(e) => handleElementMouseDown(e, elem)}
              onRotate={onRotateArchitecturalElement}
              onDelete={onDeleteArchitecturalElement}
              onResize={onResizeArchitecturalElement}
            />
          );
        })}

        {/* 2. Layer 2: Dining Table Nodes */}
        {tables.map((table) => {
          const pos = localPositions[table.id] || { x: table.x_pos, y: table.y_pos };
          const styleConfig = STATUS_COLORS[table.status] || STATUS_COLORS.available;
          const isDragging = draggedTableId === table.id;
          const elapsed = table.occupiedMinutes || 0;
          const isLate = elapsed > 60;

          const isCircle = table.shape === "circle";
          const isBooth = table.shape === "booth";

          // Ensure minimum sizing for clean UI
          const nodeWidth = isCircle ? Math.max(110, table.width || 110) : Math.max(125, table.width || 125);
          const nodeHeight = isCircle ? Math.max(110, table.height || 110) : Math.max(95, table.height || 95);

          // Clean table label (avoid duplicate "T-T3" or "T-Table1")
          const cleanName = table.name.replace(/^T-|^Table\s*/i, "").trim();
          const displayLabel = cleanName.length <= 3 && !cleanName.startsWith("T") ? `T-${cleanName}` : cleanName;

          return (
            <div
              key={table.id}
              onMouseDown={(e) => handleTableMouseDown(e, table)}
              onClick={() => {
                if (!isEditMode) onTableClick(table);
              }}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                width: nodeWidth,
                height: nodeHeight,
              }}
              className={`absolute cursor-pointer transition-shadow duration-200 border-2 shadow-lg backdrop-blur-md flex flex-col items-center justify-between p-2.5 ${
                styleConfig.border
              } ${styleConfig.bg} ${
                isCircle
                  ? "rounded-full"
                  : isBooth
                  ? "rounded-t-3xl rounded-b-lg border-b-4"
                  : "rounded-2xl"
              } ${isDragging ? "opacity-75 z-40 scale-105 shadow-2xl" : "z-20"} ${
                isLate ? "animate-pulse border-red-500 ring-2 ring-red-400/50" : ""
              }`}
            >
              {/* Top Header: Table Number & Pax */}
              <div className="w-full flex items-center justify-between text-[11px] px-1">
                <span className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                  {displayLabel}
                </span>

                <span className="flex items-center gap-0.5 text-gray-600 dark:text-gray-300 font-bold text-[10px]">
                  <Users className="h-3 w-3" /> {table.capacity}
                </span>
              </div>

              {/* Center Content: Turn Time Gauge or Vacant */}
              {table.status !== "available" ? (
                <div className="flex flex-col items-center justify-center my-0.5">
                  <div className="flex items-center gap-1 font-bold text-xs">
                    <Clock className="h-3 w-3" />
                    <span>{elapsed}m</span>
                  </div>
                  {table.activeOrder?.total ? (
                    <span className="font-extrabold text-[11px] text-emerald-600 dark:text-emerald-400">
                      ₹{table.activeOrder.total}
                    </span>
                  ) : null}
                </div>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                  Ready
                </span>
              )}

              {/* Bottom Footer: Waiter or Status */}
              <div className="w-full flex items-center justify-between text-[10px] px-1">
                <span className="capitalize font-semibold text-gray-500 truncate">
                  {table.activeOrder?.waiterName || table.shape}
                </span>
                {table.activeOrder?.currentCourse && (
                  <Badge className="bg-orange-500 text-white text-[8px] px-1 py-0 uppercase">
                    {table.activeOrder.currentCourse}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {/* Add Table Dialog */}
      <Dialog open={isAddTableOpen} onOpenChange={setIsAddTableOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Plus className="h-5 w-5 text-purple-600" />
              Add Table to {activeSection === "All" ? "Main Dining" : activeSection}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 dark:text-gray-300">Table Name / Number</label>
              <Input
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="e.g. 12 or T-05"
                className="rounded-xl text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 dark:text-gray-300">Seating Capacity</label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 6, 8].map((cap) => (
                  <Button
                    key={cap}
                    type="button"
                    variant={newTableCap === cap ? "default" : "outline"}
                    onClick={() => setNewTableCap(cap)}
                    className={`rounded-xl text-xs h-8 font-bold ${
                      newTableCap === cap ? "bg-purple-600 text-white" : ""
                    }`}
                  >
                    {cap} Pax
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 dark:text-gray-300">Table Shape</label>
              <div className="grid grid-cols-3 gap-2">
                {(["rectangle", "circle", "booth"] as const).map((shp) => (
                  <Button
                    key={shp}
                    type="button"
                    variant={newTableShape === shp ? "default" : "outline"}
                    onClick={() => setNewTableShape(shp)}
                    className={`rounded-xl text-xs h-8 font-semibold capitalize ${
                      newTableShape === shp ? "bg-purple-600 text-white" : ""
                    }`}
                  >
                    {shp}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setIsAddTableOpen(false)} className="flex-1 rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleCreateTableSubmit}
              disabled={!newTableName}
              className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
            >
              Add Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Architectural Element Dialog */}
      {onAddArchitecturalElement && (
        <AddArchitecturalElementDialog
          isOpen={isAddElementOpen}
          onClose={() => setIsAddElementOpen(false)}
          onAdd={onAddArchitecturalElement}
        />
      )}
    </div>
  );
};
