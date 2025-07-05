
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, X, GripVertical } from "lucide-react";

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'trend' | 'custom';
  title: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  position: { row: number; col: number };
  data?: any;
  visible: boolean;
}

interface CustomizableDashboardProps {
  widgets: DashboardWidget[];
  onWidgetUpdate: (widgets: DashboardWidget[]) => void;
  editMode?: boolean;
  onEditModeChange?: (editMode: boolean) => void;
}

export const CustomizableDashboard: React.FC<CustomizableDashboardProps> = ({
  widgets,
  onWidgetUpdate,
  editMode = false,
  onEditModeChange
}) => {
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'col-span-1 row-span-1';
      case 'md':
        return 'col-span-2 row-span-1';
      case 'lg':
        return 'col-span-2 row-span-2';
      case 'xl':
        return 'col-span-3 row-span-2';
      default:
        return 'col-span-1 row-span-1';
    }
  };

  const handleWidgetRemove = (widgetId: string) => {
    const updatedWidgets = widgets.map(w => 
      w.id === widgetId ? { ...w, visible: false } : w
    );
    onWidgetUpdate(updatedWidgets);
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetWidgetId) return;

    const draggedIndex = widgets.findIndex(w => w.id === draggedWidget);
    const targetIndex = widgets.findIndex(w => w.id === targetWidgetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newWidgets = [...widgets];
    const [draggedItem] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, draggedItem);
    
    onWidgetUpdate(newWidgets);
    setDraggedWidget(null);
  };

  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.visible) return null;

    const baseClasses = `relative ${getSizeClasses(widget.size)} ${editMode ? 'border-2 border-dashed border-gray-300' : ''}`;
    
    return (
      <div
        key={widget.id}
        className={baseClasses}
        draggable={editMode}
        onDragStart={(e) => handleDragStart(e, widget.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, widget.id)}
      >
        <Card className="h-full relative group">
          {editMode && (
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleWidgetRemove(widget.id)}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                <GripVertical className="h-3 w-3" />
              </div>
            </div>
          )}
          
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {widget.title}
              <Badge variant="outline" className="text-xs">
                {widget.type}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-0">
            {widget.type === 'kpi' && (
              <div className="text-2xl font-bold">{widget.data?.value || 'N/A'}</div>
            )}
            {widget.type === 'chart' && (
              <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                Chart Widget
              </div>
            )}
            {widget.type === 'trend' && (
              <div className="h-32 bg-blue-50 rounded flex items-center justify-center text-blue-600">
                Trend Analysis
              </div>
            )}
            {widget.type === 'custom' && (
              <div className="h-32 bg-purple-50 rounded flex items-center justify-center text-purple-600">
                Custom Widget
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditModeChange?.(!editMode)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {editMode ? 'Done' : 'Customize'}
          </Button>
          {editMode && (
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
          )}
        </div>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-4 gap-4 auto-rows-min">
        {widgets.map(renderWidget)}
      </div>

      {editMode && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-8 text-center">
            <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Drag widgets here to reorder or click to add new widgets</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
