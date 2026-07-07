import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  LayoutGrid,
  ChefHat,
  Coffee,
  Info,
  BellRing,
  Edit,
  Save,
  HelpCircle,
} from "lucide-react";

type ObjectType = "wall" | "restroom" | "storage" | "kitchen" | "host_stand" | "manager_desk" | "bar" | "grass" | "tree" | "staircase" | "door";

interface LayoutObject {
  id: string;
  name: string;
  type: ObjectType;
  x_pos: number;
  y_pos: number;
  width: number;
  height: number;
}

interface TableObject {
  id: string;
  name: string;
  capacity: number;
  status: string;
  x_pos: number;
  y_pos: number;
  width: number;
  height: number;
  shape: "square" | "circle" | "rectangle";
}

const DigitalTwin: React.FC = () => {
  const { toast } = useToast();

  const [activeBranchId, setActiveBranchId] = useState<string>("");
  const [activeBranchName, setActiveBranchName] = useState<string>("Active Branch");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  
  // Data State
  const [tables, setTables] = useState<TableObject[]>([]);
  const [layoutObjects, setLayoutObjects] = useState<LayoutObject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [dbBranches, setDbBranches] = useState<{ id: string; name: string }[]>([]);
  
  // Selection / Dragging state
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedObjectType, setSelectedObjectType] = useState<"table" | "object" | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedType, setDraggedType] = useState<"table" | "object" | null>(null);
  
  // Form input states
  const [newObjectName, setNewObjectName] = useState<string>("");
  const [newObjectType, setNewObjectType] = useState<ObjectType>("wall");

  // Grid references
  const gridRef = useRef<HTMLDivElement>(null);
  const gridCols = 24;
  const gridRows = 16;

  // Render chairs around a square/rectangle table box
  const renderChairs = (capacity: number) => {
    const chairs = [];
    const sideCount = Math.ceil(capacity / 2);
    
    // Left side chairs
    for (let i = 0; i < sideCount; i++) {
      const offset = `${(i + 0.5) * (100 / sideCount)}%`;
      chairs.push(
        <div
          key={`left-${i}`}
          className="absolute w-2 h-2 bg-slate-200 dark:bg-slate-800 border border-slate-400 dark:border-slate-600 rounded-sm -left-2.5"
          style={{ top: offset, transform: "translateY(-50%)" }}
        />
      );
    }

    // Right side chairs
    const rightCount = capacity - sideCount;
    for (let i = 0; i < rightCount; i++) {
      const offset = `${(i + 0.5) * (100 / rightCount)}%`;
      chairs.push(
        <div
          key={`right-${i}`}
          className="absolute w-2 h-2 bg-slate-200 dark:bg-slate-800 border border-slate-400 dark:border-slate-600 rounded-sm -right-2.5"
          style={{ top: offset, transform: "translateY(-50%)" }}
        />
      );
    }

    return chairs;
  };

  // Render chairs around a circular table
  const renderCircleChairs = (capacity: number) => {
    const chairs = [];
    for (let i = 0; i < capacity; i++) {
      const angle = (i * 2 * Math.PI) / capacity;
      const x = 50 + 60 * Math.cos(angle);
      const y = 50 + 60 * Math.sin(angle);
      chairs.push(
        <div
          key={`circle-${i}`}
          className="absolute w-2 h-2 bg-slate-200 dark:bg-slate-800 border border-slate-400 dark:border-slate-600 rounded-sm"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      );
    }
    return chairs;
  };

  // Auto-detect authentication & restaurant profiles to disable demoMode
  useEffect(() => {
    const detectMode = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsDemoMode(true);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("restaurant_id")
          .eq("id", user.id)
          .single();

        if (profile?.restaurant_id) {
          setIsDemoMode(false);
          setActiveBranchId(profile.restaurant_id);

          const { data: rest } = await supabase
            .from("restaurants")
            .select("name, organization_id")
            .eq("id", profile.restaurant_id)
            .single();

          if (rest?.name) {
            setActiveBranchName(rest.name);
          }

          if (rest?.organization_id) {
            const { data: siblings } = await supabase
              .from("restaurants")
              .select("id, name")
              .eq("organization_id", rest.organization_id);

            if (siblings && siblings.length > 1) {
              setDbBranches(siblings);
            } else {
              setDbBranches([]);
            }
          } else {
            setDbBranches([]);
          }
        } else {
          setIsDemoMode(true);
        }
      } catch (err) {
        console.error("Authentication check error:", err);
        setIsDemoMode(true);
      }
    };

    detectMode();
  }, []);

  // Fetch tables and layout objects
  const loadTwinData = async () => {
    if (!activeBranchId) return;

    if (isDemoMode) {
      setTables([
        { id: "t1", name: "T1", capacity: 4, status: "occupied", x_pos: 2, y_pos: 2, width: 2, height: 2, shape: "square" },
        { id: "t2", name: "T2", capacity: 2, status: "available", x_pos: 6, y_pos: 2, width: 2, height: 2, shape: "circle" },
        { id: "t3", name: "T3", capacity: 4, status: "occupied", x_pos: 10, y_pos: 2, width: 2, height: 2, shape: "square" },
        { id: "t4", name: "T4", capacity: 2, status: "reserved", x_pos: 14, y_pos: 2, width: 2, height: 2, shape: "circle" },
        { id: "t6", name: "T6", capacity: 4, status: "available", x_pos: 18, y_pos: 2, width: 2, height: 2, shape: "square" },
        { id: "t7", name: "T7", capacity: 8, status: "available", x_pos: 2, y_pos: 6, width: 3, height: 2, shape: "rectangle" },
        { id: "t18", name: "T18", capacity: 6, status: "available", x_pos: 6, y_pos: 6, width: 2, height: 3, shape: "rectangle" },
        { id: "t12", name: "T12", capacity: 4, status: "occupied", x_pos: 10, y_pos: 6, width: 2, height: 2, shape: "square" },
        { id: "t14", name: "T14", capacity: 4, status: "occupied", x_pos: 14, y_pos: 6, width: 2, height: 2, shape: "square" },
        { id: "t25", name: "T25", capacity: 4, status: "occupied", x_pos: 14, y_pos: 10, width: 2, height: 2, shape: "square" },
        { id: "t9", name: "T9", capacity: 4, status: "available", x_pos: 6, y_pos: 10, width: 2, height: 2, shape: "square" },
      ]);

      setLayoutObjects([
        { id: "o1", name: "Restrooms", type: "restroom", x_pos: 17, y_pos: 5, width: 3, height: 3 },
        { id: "o2", name: "Storage", type: "storage", x_pos: 20, y_pos: 5, width: 3, height: 3 },
        { id: "o3", name: "Kitchen", type: "kitchen", x_pos: 18, y_pos: 9, width: 5, height: 6 },
        { id: "o4", name: "Bar Area", type: "bar", x_pos: 11, y_pos: 11, width: 2, height: 4 },
        { id: "o5", name: "Host Stand", type: "host_stand", x_pos: 2, y_pos: 13, width: 2, height: 2 },
      ]);
      return;
    }

    setLoading(true);
    try {
      const { data: tData, error: tError } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", activeBranchId);

      if (tError) throw tError;

      const { data: ordersData } = await supabase
        .from("kitchen_orders")
        .select("table_number, customer_name, source")
        .eq("restaurant_id", activeBranchId)
        .in("status", ["new", "preparing", "ready", "held"]);

      const activeOrders = ordersData || [];

      const { data: oData, error: oError } = await supabase
        .from("restaurant_layout_objects")
        .select("*")
        .eq("restaurant_id", activeBranchId);

      if (oError) throw oError;

      setTables(
        (tData || []).map((t) => {
          const hasActiveOrder = activeOrders.some((order) => {
            const tableName = t.name?.toLowerCase() || "";
            const orderTable = order.table_number?.toLowerCase() || "";
            const customerName = order.customer_name?.toLowerCase() || "";
            const source = order.source?.toLowerCase() || "";

            return (
              orderTable === tableName ||
              customerName === `table ${tableName}` ||
              customerName === tableName ||
              source.includes(`table ${tableName}`) ||
              source.includes(`table-${tableName}`)
            );
          });

          return {
            id: t.id,
            name: t.name,
            capacity: t.capacity,
            status: hasActiveOrder ? "occupied" : (t.status || "available"),
            x_pos: t.x_pos ?? 0,
            y_pos: t.y_pos ?? 0,
            width: t.width ?? 2,
            height: t.height ?? 2,
            shape: (t.shape as any) || "square",
          };
        })
      );

      setLayoutObjects(
        (oData || []).map((o) => ({
          id: o.id,
          name: o.name,
          type: o.type as ObjectType,
          x_pos: o.x_pos,
          y_pos: o.y_pos,
          width: o.width,
          height: o.height,
        }))
      );
    } catch (err: any) {
      console.error("Error loading twin data:", err);
      toast({
        title: "Error Loading Floor Layout",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTwinData();
  }, [activeBranchId, isDemoMode]);

  useEffect(() => {
    if (isDemoMode || !activeBranchId) return;

    const channel = supabase
      .channel("digital-twin-realtime-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
          filter: `restaurant_id=eq.${activeBranchId}`,
        },
        () => {
          loadTwinData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_orders",
          filter: `restaurant_id=eq.${activeBranchId}`,
        },
        () => {
          loadTwinData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemoMode, activeBranchId]);

  // Handle Drag Events on Blueprint Grid
  const handleDragStart = (e: React.DragEvent, id: string, type: "table" | "object") => {
    if (!isEditMode) return;
    setDraggedId(id);
    setDraggedType(type);
    
    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode || !draggedId || !gridRef.current) return;
    e.preventDefault();

    const rect = gridRef.current.getBoundingClientRect();
    const cellWidth = rect.width / gridCols;
    const cellHeight = rect.height / gridRows;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    let targetX = Math.floor(clientX / cellWidth);
    let targetY = Math.floor(clientY / cellHeight);

    targetX = Math.max(0, Math.min(gridCols - 2, targetX));
    targetY = Math.max(0, Math.min(gridRows - 2, targetY));

    if (draggedType === "table") {
      setTables((prev) =>
        prev.map((t) => (t.id === draggedId ? { ...t, x_pos: targetX, y_pos: targetY } : t))
      );
    } else {
      setLayoutObjects((prev) =>
        prev.map((o) => (o.id === draggedId ? { ...o, x_pos: targetX, y_pos: targetY } : o))
      );
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDraggedType(null);
  };

  // Add layout object
  const handleAddObject = async () => {
    if (!newObjectName.trim()) return;

    const newObj: LayoutObject = {
      id: "temp-" + Date.now(),
      name: newObjectName,
      type: newObjectType,
      x_pos: 0,
      y_pos: 0,
      width: newObjectType === "wall" ? 4 : newObjectType === "tree" ? 2 : newObjectType === "grass" ? 4 : 3,
      height: newObjectType === "wall" ? 1 : newObjectType === "tree" ? 2 : newObjectType === "grass" ? 4 : 3,
    };

    setLayoutObjects([...layoutObjects, newObj]);
    setNewObjectName("");
    
    toast({
      title: "Object Added to Blueprint",
      description: `Drag ${newObjectName} from the top left of the grid to position it.`,
    });
  };

  // Add table object
  const handleAddTable = () => {
    const tableNo = tables.length + 1;
    const newTab: TableObject = {
      id: "temp-t-" + Date.now(),
      name: `T${tableNo}`,
      capacity: 4,
      status: "available",
      x_pos: 0,
      y_pos: 0,
      width: 2,
      height: 2,
      shape: "square",
    };

    setTables([...tables, newTab]);
    
    toast({
      title: "Table Added to Blueprint",
      description: `Drag ${newTab.name} from the top left of the grid to position it.`,
    });
  };

  // Delete selected element
  const handleDeleteSelected = () => {
    if (!selectedObjectId || !selectedObjectType) return;

    if (selectedObjectType === "table") {
      setTables(tables.filter((t) => t.id !== selectedObjectId));
    } else {
      setLayoutObjects(layoutObjects.filter((o) => o.id !== selectedObjectId));
    }

    setSelectedObjectId(null);
    setSelectedObjectType(null);
    
    toast({
      title: "Item Deleted",
      description: "Element has been removed from the layout.",
    });
  };

  const updateTable = (id: string, updates: Partial<TableObject>) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const updateLayoutObject = (id: string, updates: Partial<LayoutObject>) => {
    setLayoutObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  // Save changes to DB
  const handleSaveLayout = async () => {
    if (isDemoMode) {
      setIsEditMode(false);
      setSelectedObjectId(null);
      toast({
        title: "Demo Layout Saved",
        description: "Layout settings saved successfully (Demo Mode).",
      });
      return;
    }

    setLoading(true);
    try {
      for (const t of tables) {
        if (t.id.startsWith("temp-")) {
          const { error: insErr } = await supabase.from("restaurant_tables").insert({
            name: t.name,
            capacity: t.capacity,
            status: t.status,
            restaurant_id: activeBranchId,
            x_pos: t.x_pos,
            y_pos: t.y_pos,
            width: t.width,
            height: t.height,
            shape: t.shape,
          });
          if (insErr) throw insErr;
        } else {
          const { error: updErr } = await supabase
            .from("restaurant_tables")
            .update({
              name: t.name,
              capacity: t.capacity,
              status: t.status,
              x_pos: t.x_pos,
              y_pos: t.y_pos,
              width: t.width,
              height: t.height,
              shape: t.shape,
            })
            .eq("id", t.id);
          if (updErr) throw updErr;
        }
      }

      const { error: delErr } = await supabase
        .from("restaurant_layout_objects")
        .delete()
        .eq("restaurant_id", activeBranchId);

      if (delErr) throw delErr;

      const objectsToInsert = layoutObjects.map((o) => ({
        restaurant_id: activeBranchId,
        name: o.name,
        type: o.type,
        x_pos: o.x_pos,
        y_pos: o.y_pos,
        width: o.width,
        height: o.height,
      }));

      if (objectsToInsert.length > 0) {
        const { error: insErr } = await supabase
          .from("restaurant_layout_objects")
          .insert(objectsToInsert);
        if (insErr) throw insErr;
      }

      setIsEditMode(false);
      setSelectedObjectId(null);
      toast({
        title: "Floor Plan Saved",
        description: "Branch layout configurations have been synchronized successfully.",
      });
    } catch (err: any) {
      console.error("Error saving layout:", err);
      toast({
        title: "Save Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => t.status === "occupied").length;
  const availableTables = tables.filter((t) => t.status === "available").length;
  const reservedTables = tables.filter((t) => t.status === "reserved").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A1220] text-slate-800 dark:text-slate-100 p-6 space-y-6 flex flex-col">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="text-orange-500 h-8 w-8" /> RestroFlow Digital Twin
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time outlet blueprint &amp; station analytics for <span className="text-orange-500 dark:text-orange-400 font-semibold">{activeBranchName}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {dbBranches.length > 1 && (
            <select
              value={activeBranchId}
              onChange={(e) => {
                const b = dbBranches.find((br) => br.id === e.target.value);
                if (b) {
                  setActiveBranchId(b.id);
                  setActiveBranchName(b.name);
                }
              }}
              className="bg-white dark:bg-[#131F35] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-orange-500"
            >
              {dbBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {isEditMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditMode(false);
                  setSelectedObjectId(null);
                  loadTwinData();
                }}
                className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveLayout}
                disabled={loading}
                className="bg-orange-600 text-white hover:bg-orange-500"
              >
                <Save className="h-4 w-4 mr-1.5" /> Save Blueprint
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsEditMode(true)}
              className="bg-white dark:bg-[#131F35] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Edit className="h-4 w-4 mr-1.5 text-orange-500" /> Edit Blueprint Layout
            </Button>
          )}
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        {/* Left Control panel or Editor panel */}
        <div className="lg:col-span-1 bg-white dark:bg-[#131F35] border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-orange-500" /> Layout Summary
              </h2>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-slate-50 dark:bg-[#0A1220]/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total Tables</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalTables}</div>
                </div>
                <div className="bg-slate-50 dark:bg-[#0A1220]/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Occupied</div>
                  <div className="text-2xl font-black text-red-500 mt-1">{occupiedTables}</div>
                </div>
                <div className="bg-slate-50 dark:bg-[#0A1220]/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Available</div>
                  <div className="text-2xl font-black text-green-600 dark:text-green-400 mt-1">{availableTables}</div>
                </div>
                <div className="bg-slate-50 dark:bg-[#0A1220]/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Reserved</div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{reservedTables}</div>
                </div>
              </div>
            </div>

            {/* Service Alert Box */}
            <div className="bg-rose-50 dark:bg-[#0A1220]/40 p-4 rounded-xl border border-rose-100 dark:border-rose-950/40 space-y-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm font-semibold">
                <BellRing className="h-4 w-4 animate-bounce" /> Kitchen &amp; Table Alerts
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                3 tables have flagged waiters for service: <span className="text-rose-600 dark:text-rose-400 font-bold">T12, T25</span>.
              </div>
            </div>

            {/* Designer Panel controls (Only visible in Edit Mode) */}
            {isEditMode && (
              <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-955 dark:text-white">Blueprint Objects Library</h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleAddTable}
                    variant="outline"
                    className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1220] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs py-1"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Table
                  </Button>
                </div>

                <div className="space-y-3 border-t border-slate-200 dark:border-slate-800/60 pt-3">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Add Structural Object</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Object name..."
                      value={newObjectName}
                      onChange={(e) => setNewObjectName(e.target.value)}
                      className="bg-slate-50 dark:bg-[#0A1220] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-white focus:outline-none flex-1"
                    />
                    <select
                      value={newObjectType}
                      onChange={(e) => setNewObjectType(e.target.value as ObjectType)}
                      className="bg-slate-50 dark:bg-[#0A1220] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-white"
                    >
                      <option value="wall">Wall</option>
                      <option value="restroom">Restrooms</option>
                      <option value="storage">Storage</option>
                      <option value="kitchen">Kitchen</option>
                      <option value="host_stand">Host Stand</option>
                      <option value="manager_desk">Desk</option>
                      <option value="bar">Bar</option>
                      <option value="grass">Grass Floor</option>
                      <option value="tree">Tree</option>
                      <option value="staircase">Staircase</option>
                      <option value="door">Door</option>
                    </select>
                  </div>
                  <Button
                    onClick={handleAddObject}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs py-1.5"
                  >
                    Add Object Shape
                  </Button>
                </div>
              </div>
            )}

            {/* Inspector for selected element */}
            {selectedObjectId && (
              <div className="bg-slate-50 dark:bg-[#0A1220]/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold text-orange-600 dark:text-orange-400">Selected Item</div>
                  {isEditMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDeleteSelected}
                      className="text-rose-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 h-7 w-7"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {selectedObjectType === "table" ? (
                  (() => {
                    const table = tables.find((t) => t.id === selectedObjectId);
                    if (!table) return null;
                    if (isEditMode) {
                      return (
                        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                          <div>
                            <label className="block text-slate-500 dark:text-slate-400 mb-1">Label:</label>
                            <input
                              type="text"
                              value={table.name}
                              onChange={(e) => updateTable(table.id, { name: e.target.value })}
                              className="w-full bg-white dark:bg-[#0A1220] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white focus:outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-slate-500 dark:text-slate-400 mb-1">Capacity:</label>
                              <input
                                type="number"
                                min="1"
                                value={table.capacity}
                                onChange={(e) => updateTable(table.id, { capacity: Number(e.target.value) })}
                                className="w-full bg-white dark:bg-[#0A1220] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 dark:text-slate-400 mb-1">Shape:</label>
                              <select
                                value={table.shape}
                                onChange={(e) => updateTable(table.id, { shape: e.target.value as any })}
                                className="w-full bg-white dark:bg-[#0A1220] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white focus:outline-none"
                              >
                                <option value="square">Square</option>
                                <option value="circle">Circle</option>
                                <option value="rectangle">Rectangle</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-slate-500 dark:text-slate-400 mb-1">Width (Grid):</label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={table.width}
                                onChange={(e) => updateTable(table.id, { width: Number(e.target.value) })}
                                className="w-full bg-white dark:bg-[#0A1220] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 dark:text-slate-400 mb-1">Height (Grid):</label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={table.height}
                                onChange={(e) => updateTable(table.id, { height: Number(e.target.value) })}
                                className="w-full bg-white dark:bg-[#0A1220] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-slate-500 dark:text-slate-400 mb-1">Status:</label>
                            <select
                              value={table.status}
                              onChange={(e) => updateTable(table.id, { status: e.target.value })}
                              className="w-full bg-white dark:bg-[#0A1220] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white focus:outline-none"
                            >
                              <option value="available">Available</option>
                              <option value="occupied">Occupied</option>
                              <option value="reserved">Reserved</option>
                            </select>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Label:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{table.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Capacity:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{table.capacity} guests</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Status:</span>
                          <span
                            className={cn(
                              "font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded text-[10px]",
                              table.status === "available" && "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400",
                              table.status === "occupied" && "bg-red-100 text-red-850 dark:bg-red-950 dark:text-red-400",
                              table.status === "reserved" && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400"
                            )}
                          >
                            {table.status}
                          </span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  (() => {
                    const obj = layoutObjects.find((o) => o.id === selectedObjectId);
                    if (!obj) return null;
                    if (isEditMode) {
                      return (
                        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                          <div>
                            <label className="block text-slate-500 dark:text-slate-400 mb-1">Name:</label>
                            <input
                              type="text"
                              value={obj.name}
                              onChange={(e) => updateLayoutObject(obj.id, { name: e.target.value })}
                              className="w-full bg-white dark:bg-[#0A1220] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-500 dark:text-slate-400 mb-1">Type:</label>
                            <select
                              value={obj.type}
                              onChange={(e) => updateLayoutObject(obj.id, { type: e.target.value as any })}
                              className="w-full bg-white dark:bg-[#0A1220] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white focus:outline-none"
                            >
                              <option value="wall">Wall</option>
                              <option value="restroom">Restrooms</option>
                              <option value="storage">Storage</option>
                              <option value="kitchen">Kitchen</option>
                              <option value="host_stand">Host Stand</option>
                              <option value="manager_desk">Desk</option>
                              <option value="bar">Bar</option>
                              <option value="grass">Grass Floor</option>
                              <option value="tree">Tree</option>
                              <option value="staircase">Staircase</option>
                              <option value="door">Door</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-slate-500 dark:text-slate-400 mb-1">Width (Grid):</label>
                              <input
                                type="number"
                                min="1"
                                max="24"
                                value={obj.width}
                                onChange={(e) => updateLayoutObject(obj.id, { width: Number(e.target.value) })}
                                className="w-full bg-white dark:bg-[#0A1220] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 dark:text-slate-400 mb-1">Height (Grid):</label>
                              <input
                                type="number"
                                min="1"
                                max="16"
                                value={obj.height}
                                onChange={(e) => updateLayoutObject(obj.id, { height: Number(e.target.value) })}
                                className="w-full bg-white dark:bg-[#0A1220] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Name:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{obj.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Type:</span>
                          <span className="font-semibold text-slate-900 dark:text-white capitalize">{obj.type}</span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <HelpCircle className="h-3 w-3 text-slate-400" />
            {isEditMode ? "Drag shapes to place on grid." : "Click items to inspect."}
          </div>
        </div>

        {/* Blueprint Grid Layout */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#0A1220] border-2 border-orange-500/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex-1 min-h-[480px] flex flex-col">
            {/* Grid background lines */}
            <div className="absolute inset-0 grid grid-cols-24 grid-rows-16 pointer-events-none opacity-[0.08] dark:opacity-[0.04]">
              {Array.from({ length: gridCols * gridRows }).map((_, i) => (
                <div key={i} className="border-r border-b border-orange-500" />
              ))}
            </div>

            {/* Layout Title Badge */}
            <div className="flex justify-between items-center mb-4 z-10">
              <span className="text-xs font-semibold tracking-wider text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/40 rounded-full px-3 py-1 uppercase">
                Blueprint Layout (24 x 16 Grid)
              </span>
              {isEditMode && (
                <span className="text-xs text-orange-600 dark:text-orange-500 animate-pulse font-bold">
                  ● EDITING MODE - DRAG TO POSITION
                </span>
              )}
            </div>

            {/* Layout Canvas Grid Container */}
            <div
              ref={gridRef}
              onDragOver={handleDragOver}
              className="flex-1 relative bg-slate-50/50 dark:bg-[#060D1A]/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden min-h-[400px]"
            >
              {/* Render Structural Elements */}
              {layoutObjects.map((obj) => {
                const style = {
                  left: `${(obj.x_pos / gridCols) * 100}%`,
                  top: `${(obj.y_pos / gridRows) * 100}%`,
                  width: `${(obj.width / gridCols) * 100}%`,
                  height: `${(obj.height / gridRows) * 100}%`,
                  backgroundImage: obj.type === "staircase" ? "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(148, 163, 184, 0.15) 4px, rgba(148, 163, 184, 0.15) 8px)" : undefined
                };
                return (
                  <div
                    key={obj.id}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, obj.id, "object")}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      setSelectedObjectId(obj.id);
                      setSelectedObjectType("object");
                    }}
                    style={style}
                    className={cn(
                      "absolute border transition-all flex flex-col justify-center items-center p-1 text-[11px] font-bold select-none cursor-pointer overflow-hidden",
                      selectedObjectId === obj.id
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 shadow-lg shadow-orange-500/10 z-30"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 z-10",
                      obj.type === "wall" && "bg-slate-200 dark:bg-slate-700/40 border-slate-400 dark:border-slate-600",
                      obj.type === "kitchen" && "bg-orange-50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/40 text-orange-700 dark:text-orange-400/80",
                      obj.type === "grass" && "bg-emerald-100/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400",
                      obj.type === "tree" && "rounded-full bg-green-100/50 dark:bg-green-950/20 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400",
                      obj.type === "staircase" && "bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300",
                      obj.type === "door" && "bg-transparent border-transparent"
                    )}
                  >
                    {/* Architectural Blueprint Detailed Vectors */}
                    {obj.type === "restroom" && (
                      <svg className="absolute inset-0 w-full h-full p-2 stroke-slate-400 dark:stroke-slate-500 fill-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <rect x="15" y="10" width="30" height="15" rx="2" />
                        <ellipse cx="30" cy="40" rx="12" ry="16" />
                        <rect x="65" y="15" width="20" height="20" rx="2" />
                        <circle cx="75" cy="25" r="4" />
                        <path d="M 75 15 L 75 18" />
                      </svg>
                    )}
                    {obj.type === "kitchen" && (
                      <svg className="absolute inset-0 w-full h-full p-2 stroke-orange-400/60 fill-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <rect x="10" y="10" width="35" height="35" rx="2" />
                        <circle cx="20" cy="20" r="5" />
                        <circle cx="35" cy="20" r="5" />
                        <circle cx="20" cy="35" r="5" />
                        <circle cx="35" cy="35" r="5" />
                        <rect x="55" y="10" width="35" height="35" rx="2" />
                        <rect x="60" y="15" width="11" height="11" rx="1" />
                        <rect x="74" y="15" width="11" height="11" rx="1" />
                        <rect x="10" y="55" width="80" height="35" rx="2" />
                        <path d="M 10 72.5 L 90 72.5" />
                      </svg>
                    )}
                    {obj.type === "storage" && (
                      <svg className="absolute inset-0 w-full h-full p-2 stroke-slate-400 dark:stroke-slate-500 fill-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <rect x="10" y="10" width="80" height="20" rx="1" />
                        <line x1="25" y1="10" x2="25" y2="30" />
                        <line x1="50" y1="10" x2="50" y2="30" />
                        <line x1="75" y1="10" x2="75" y2="30" />
                        <rect x="10" y="45" width="80" height="20" rx="1" />
                        <line x1="25" y1="45" x2="25" y2="65" />
                        <line x1="50" y1="45" x2="50" y2="65" />
                        <line x1="75" y1="45" x2="75" y2="65" />
                        <rect x="10" y="80" width="80" height="10" rx="1" />
                      </svg>
                    )}
                    {obj.type === "bar" && (
                      <svg className="absolute inset-0 w-full h-full p-2 stroke-slate-400 dark:stroke-slate-500 fill-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <rect x="15" y="15" width="70" height="30" rx="2" />
                        <circle cx="25" cy="70" r="8" />
                        <circle cx="25" cy="70" r="3" />
                        <circle cx="50" cy="70" r="8" />
                        <circle cx="50" cy="70" r="3" />
                        <circle cx="75" cy="70" r="8" />
                        <circle cx="75" cy="70" r="3" />
                      </svg>
                    )}
                    {obj.type === "host_stand" && (
                      <svg className="absolute inset-0 w-full h-full p-2 stroke-slate-400 dark:stroke-slate-500 fill-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <rect x="25" y="20" width="50" height="60" rx="2" />
                        <rect x="35" y="30" width="30" height="20" rx="1" />
                        <line x1="50" y1="30" x2="50" y2="50" />
                        <line x1="40" y1="35" x2="48" y2="35" />
                        <line x1="40" y1="40" x2="48" y2="40" />
                        <line x1="52" y1="35" x2="60" y2="35" />
                        <line x1="52" y1="40" x2="60" y2="40" />
                      </svg>
                    )}
                    {obj.type === "manager_desk" && (
                      <svg className="absolute inset-0 w-full h-full p-2 stroke-slate-400 dark:stroke-slate-500 fill-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <rect x="10" y="20" width="80" height="40" rx="2" />
                        <rect x="30" y="25" width="40" height="5" rx="1" />
                        <line x1="50" y1="30" x2="50" y2="38" />
                        <line x1="45" y1="38" x2="55" y2="38" />
                        <rect x="35" y="45" width="30" height="8" rx="1" />
                        <circle cx="50" cy="80" r="10" />
                        <path d="M 40 85 L 60 85" />
                      </svg>
                    )}
                    {obj.type === "door" && (
                      <svg className="absolute inset-0 w-full h-full p-1 stroke-orange-500/60 fill-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line x1="10" y1="90" x2="10" y2="10" strokeWidth="2.5" />
                        <line x1="10" y1="90" x2="90" y2="90" strokeWidth="1" strokeDasharray="3,3" />
                        <path d="M 10 10 A 80 80 0 0 1 90 90" strokeWidth="1.5" strokeDasharray="3,3" />
                      </svg>
                    )}
                    {obj.type === "tree" && (
                      <svg className="absolute inset-0 w-full h-full p-2 stroke-green-500/60 fill-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <circle cx="50" cy="50" r="30" />
                        <circle cx="50" cy="50" r="22" />
                        <path d="M 50 10 Q 60 30 50 50 Q 40 30 50 10" />
                        <path d="M 10 50 Q 30 60 50 50 Q 30 40 10 50" />
                      </svg>
                    )}
                    {obj.type === "grass" && (
                      <svg className="absolute inset-0 w-full h-full p-2 stroke-emerald-600/30 fill-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M 20 40 L 25 20 L 30 40" />
                        <path d="M 25 40 L 30 25 L 35 40" />
                        <path d="M 65 30 L 70 10 L 75 30" />
                        <path d="M 40 80 L 45 60 L 50 80" />
                        <path d="M 75 75 L 80 55 L 85 75" />
                      </svg>
                    )}

                    <span className="truncate z-10">{obj.name}</span>
                    <span className="text-[8px] opacity-60 capitalize font-medium z-10">{obj.type}</span>
                  </div>
                );
              })}

              {/* Render Tables */}
              {tables.map((t) => {
                const style = {
                  left: `${(t.x_pos / gridCols) * 100}%`,
                  top: `${(t.y_pos / gridRows) * 100}%`,
                  width: `${(t.width / gridCols) * 100}%`,
                  height: `${(t.height / gridRows) * 100}%`,
                };
                return (
                  <div
                    key={t.id}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, t.id, "table")}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      setSelectedObjectId(t.id);
                      setSelectedObjectType("table");
                    }}
                    style={style}
                    className={cn(
                      "absolute transition-all cursor-pointer select-none flex flex-col justify-center items-center border p-1 text-center font-bold z-20 shadow-sm",
                      t.shape === "circle" ? "rounded-full" : "rounded-lg",
                      selectedObjectId === t.id
                        ? "border-orange-500 bg-orange-50/15 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 shadow-lg shadow-orange-500/20"
                        : t.status === "occupied"
                        ? "border-rose-500 dark:border-rose-700 bg-rose-50/5 dark:bg-rose-950/10 text-rose-600 dark:text-rose-550"
                        : t.status === "reserved"
                        ? "border-blue-500 dark:border-blue-700 bg-blue-50/5 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400"
                        : "border-green-500 dark:border-green-700 bg-green-50/5 dark:bg-green-950/10 text-green-600 dark:text-green-550"
                    )}
                  >
                    {/* Render Chairs Around the Table Box */}
                    {t.shape === "circle" ? renderCircleChairs(t.capacity) : renderChairs(t.capacity)}

                    {/* Table Status Dot */}
                    <div className="flex items-center justify-center gap-1 z-10">
                      <span
                        className={cn(
                          "w-2.5 h-2.5 rounded-full inline-block",
                          t.status === "occupied" ? "bg-rose-500 shadow-sm shadow-rose-500/50" :
                          t.status === "reserved" ? "bg-blue-500 shadow-sm shadow-blue-500/50" :
                          "bg-green-500 shadow-sm shadow-green-500/50"
                        )}
                      />
                      <span className="text-[11px] font-black tracking-tight text-slate-800 dark:text-slate-100">{t.name}</span>
                    </div>
                    
                    <span className="text-[8px] opacity-75 mt-0.5 text-slate-500 dark:text-slate-400 z-10">
                      {t.status === "occupied" ? "Occ" : t.status === "reserved" ? "Resv" : "Avail"}
                    </span>
                    <span className="text-[8px] opacity-60 text-slate-450 dark:text-slate-500 z-10">{t.capacity} Pax</span>

                    {t.status === "occupied" && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Panels - Kitchen Station Loads & Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kitchen Station Load */}
            <div className="bg-white dark:bg-[#131F35] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-855 dark:text-white flex items-center gap-1.5">
                <ChefHat className="text-orange-500 h-4 w-4" /> Live Kitchen Station Load
              </h3>
              <div className="space-y-3">
                {/* Grill Station */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">Grill Station</span>
                    <span className="text-rose-500 dark:text-rose-400 font-semibold">78% high load</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: "78%" }} />
                  </div>
                </div>

                {/* Sauté Station */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">Sauté Station</span>
                    <span className="text-orange-500 dark:text-orange-400 font-semibold">64% moderate load</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full rounded-full" style={{ width: "64%" }} />
                  </div>
                </div>

                {/* Prep/Salads */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">Prep / Salads</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">39% low load</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-400 h-full rounded-full" style={{ width: "39%" }} />
                  </div>
                </div>

                {/* Plating */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">Expo / Plating</span>
                    <span className="text-rose-600 dark:text-rose-500 font-semibold">88% busy</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-600 h-full rounded-full" style={{ width: "88%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Status Legend / Map Help */}
            <div className="bg-white dark:bg-[#131F35] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-855 dark:text-white flex items-center gap-1.5">
                <Coffee className="text-orange-500 h-4 w-4" /> Operations Legend
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-md border border-green-600 bg-green-50 dark:bg-green-950/40" />
                  <span>Vacant / Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-md border border-rose-600 bg-rose-50 dark:bg-rose-950/40" />
                  <span>Occupied / Active Order</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-md border border-blue-600 bg-blue-50 dark:bg-blue-950/40" />
                  <span>Reserved Table</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-md border border-slate-400 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60" />
                  <span>Structural Area</span>
                </div>
              </div>
              
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <p>• Tables auto-refresh layout status via restaurant orders feed.</p>
                <p>• In edit mode, click save to lock positions to database.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwin;
