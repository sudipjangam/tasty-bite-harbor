import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import {
  FloorTable,
  FloorSection,
  TableOccupancyStatus,
  TableShape,
  ArchitecturalElement,
  ArchitecturalElementType,
} from "@/types/tableFloorPlan";
import { differenceInMinutes } from "date-fns";

export const DEFAULT_SECTIONS: FloorSection[] = [
  { id: "main", name: "Main Dining", isDefault: true },
  { id: "ac-hall", name: "AC Hall" },
  { id: "rooftop", name: "Rooftop" },
  { id: "bar-lounge", name: "Bar & Lounge" },
  { id: "pdr", name: "Private Dining (PDR)" },
];

export const DEFAULT_ARCHITECTURAL_ELEMENTS: ArchitecturalElement[] = [
  {
    id: "arch-entry-1",
    restaurant_id: "",
    section: "Main Dining",
    type: "door",
    label: "Main Entrance",
    x_pos: 20,
    y_pos: 20,
    width: 130,
    height: 45,
    rotation: 0,
  },
  {
    id: "arch-cashier-1",
    restaurant_id: "",
    section: "Main Dining",
    type: "cashier_desk",
    label: "Host & Billing Desk",
    x_pos: 170,
    y_pos: 20,
    width: 160,
    height: 45,
    rotation: 0,
  },
  {
    id: "arch-kitchen-1",
    restaurant_id: "",
    section: "Main Dining",
    type: "kitchen_window",
    label: "Kitchen KOT Window",
    x_pos: 750,
    y_pos: 20,
    width: 170,
    height: 45,
    rotation: 0,
  },
  {
    id: "arch-bar-1",
    restaurant_id: "",
    section: "Bar & Lounge",
    type: "bar_counter",
    label: "Cocktail Bar Station",
    x_pos: 30,
    y_pos: 30,
    width: 250,
    height: 60,
    rotation: 0,
  },
  {
    id: "arch-plant-1",
    restaurant_id: "",
    section: "Main Dining",
    type: "plant",
    label: "Indoor Palm",
    x_pos: 20,
    y_pos: 530,
    width: 45,
    height: 45,
    rotation: 0,
  },
  {
    id: "arch-pillar-1",
    restaurant_id: "",
    section: "Main Dining",
    type: "pillar",
    label: "Pillar",
    x_pos: 480,
    y_pos: 260,
    width: 45,
    height: 45,
    rotation: 0,
  },
];

export function useTableFloorPlan() {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<string>("Main Dining");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Architectural Elements State (Persisted in localStorage with restaurant scoping)
  const [architecturalElements, setArchitecturalElements] = useState<ArchitecturalElement[]>(() => {
    try {
      const key = `floor_elements_${restaurantId || "default"}`;
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return DEFAULT_ARCHITECTURAL_ELEMENTS;
  });

  const saveArchitecturalElements = useCallback(
    (newElements: ArchitecturalElement[]) => {
      setArchitecturalElements(newElements);
      try {
        const key = `floor_elements_${restaurantId || "default"}`;
        localStorage.setItem(key, JSON.stringify(newElements));
      } catch (e) {}
    },
    [restaurantId],
  );

  const addArchitecturalElement = useCallback(
    (elem: Omit<ArchitecturalElement, "id" | "restaurant_id">) => {
      const newElem: ArchitecturalElement = {
        ...elem,
        id: `arch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        restaurant_id: restaurantId || "",
        section: activeSection === "All" ? "Main Dining" : activeSection,
      };
      saveArchitecturalElements([...architecturalElements, newElem]);
      toast({
        title: "Element Added",
        description: `${newElem.label || newElem.type} placed on canvas.`,
      });
    },
    [architecturalElements, restaurantId, activeSection, saveArchitecturalElements, toast],
  );

  const deleteArchitecturalElement = useCallback(
    (id: string) => {
      saveArchitecturalElements(architecturalElements.filter((e) => e.id !== id));
      toast({ title: "Element Deleted", description: "Removed from floor plan." });
    },
    [architecturalElements, saveArchitecturalElements, toast],
  );

  const rotateArchitecturalElement = useCallback(
    (id: string) => {
      saveArchitecturalElements(
        architecturalElements.map((e) =>
          e.id === id ? { ...e, rotation: ((e.rotation || 0) + 90) % 360 } : e
        )
      );
    },
    [architecturalElements, saveArchitecturalElements],
  );

  const resizeArchitecturalElement = useCallback(
    (id: string, deltaW: number, deltaH: number) => {
      saveArchitecturalElements(
        architecturalElements.map((e) =>
          e.id === id
            ? {
                ...e,
                width: Math.max(30, (e.width || 50) + deltaW),
                height: Math.max(20, (e.height || 30) + deltaH),
              }
            : e
        )
      );
    },
    [architecturalElements, saveArchitecturalElements],
  );

  // 1. Fetch Tables from restaurant_tables
  const { data: rawTables = [], isLoading: isLoadingTables } = useQuery({
    queryKey: ["floor-tables", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) {
        console.error("[useTableFloorPlan] Error fetching tables:", error);
        throw error;
      }
      return data || [];
    },
  });

  // 2. Fetch Active Dine-in Orders for turn-times & live cart
  const { data: activeOrders = [] } = useQuery({
    queryKey: ["active-table-orders", restaurantId],
    enabled: !!restaurantId,
    refetchInterval: 10000, // Poll every 10s or rely on realtime
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_phone, total, status, items, notes, created_at, updated_at, table_number, split_payments")
        .eq("restaurant_id", restaurantId)
        .in("status", ["pending", "preparing", "ready", "held"])
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[useTableFloorPlan] Orders fetch error:", error);
        return [];
      }
      return data || [];
    },
  });

  // 3. Realtime Subscription on restaurant_tables & orders
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`floorplan-realtime-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["floor-tables", restaurantId] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["active-table-orders", restaurantId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  // 4. Transform Tables with Position, Section, and Live Active Orders
  const tables: FloorTable[] = useMemo(() => {
    return rawTables.map((t, idx) => {
      // Find matching active order for this table
      const matchingOrder = activeOrders.find(
        (o: any) =>
          o.table_number === t.name ||
          o.table_number === t.id ||
          o.notes?.toLowerCase().includes(`table ${t.name.toLowerCase()}`),
      );

      let activeOrder: TableActiveOrder | undefined;
      let computedStatus: TableOccupancyStatus = (t.status as TableOccupancyStatus) || "available";
      let occupiedMinutes = 0;

      if (matchingOrder) {
        const orderDate = new Date(matchingOrder.created_at);
        occupiedMinutes = differenceInMinutes(new Date(), orderDate);

        // Normalize items
        const rawItems = Array.isArray(matchingOrder.items) ? matchingOrder.items : [];
        const parsedItems = rawItems.map((item: any, itemIdx: number) => {
          if (typeof item === "string") {
            const match = item.match(/^(\d+)x\s+(.+?)(?:\s+@(\d+(?:\.\d+)?))?$/);
            return {
              id: `item-${itemIdx}`,
              name: match ? match[2] : item,
              quantity: match ? parseInt(match[1]) : 1,
              price: match && match[3] ? parseFloat(match[3]) : 150,
              status: matchingOrder.status === "ready" ? "ready" : "preparing",
            };
          }
          return {
            id: item.id || `item-${itemIdx}`,
            name: item.name || "Item",
            quantity: Number(item.quantity || 1),
            price: Number(item.price || 0),
            status: item.status || "preparing",
          };
        });

        const subtotal = Number(matchingOrder.total || 0);

        activeOrder = {
          orderId: matchingOrder.id,
          orderNumber: matchingOrder.order_number,
          customerName: matchingOrder.customer_name || "Dine-in Guest",
          customerPhone: matchingOrder.customer_phone,
          guestCount: t.capacity || 4,
          seatedAt: matchingOrder.created_at,
          items: parsedItems,
          subtotal,
          taxAmount: Math.round(subtotal * 0.05),
          discountAmount: 0,
          total: subtotal,
          status: matchingOrder.status,
          isBillPrinted: matchingOrder.status === "held" || matchingOrder.status === "ready",
          currentCourse: "main",
        };

        if (activeOrder.isBillPrinted) {
          computedStatus = "billed";
        } else if (matchingOrder.status === "ready") {
          computedStatus = "served";
        } else {
          computedStatus = "seated";
        }
      }

      // Default layout grid positions if not set
      const defaultCol = idx % 5;
      const defaultRow = Math.floor(idx / 5);
      const xPos = t.x_pos !== null && t.x_pos !== undefined && t.x_pos > 0 ? Number(t.x_pos) : 40 + defaultCol * 160;
      const yPos = t.y_pos !== null && t.y_pos !== undefined && t.y_pos > 0 ? Number(t.y_pos) : 40 + defaultRow * 140;

      // Ensure minimum usable dimension (prevents tiny 20px legacy circles)
      const tableWidth = Number(t.width && t.width >= 90 ? t.width : t.shape === "circle" ? 110 : 130);
      const tableHeight = Number(t.height && t.height >= 80 ? t.height : 100);

      return {
        id: t.id,
        restaurant_id: t.restaurant_id,
        name: t.name,
        capacity: Number(t.capacity || 4),
        status: computedStatus,
        section: (t as any).section || "Main Dining",
        x_pos: xPos,
        y_pos: yPos,
        width: tableWidth,
        height: tableHeight,
        shape: ((t.shape as TableShape) || "rectangle"),
        activeOrder,
        occupiedMinutes,
        created_at: t.created_at,
        updated_at: t.updated_at,
      };
    });
  }, [rawTables, activeOrders]);

  // Filtered tables by section
  const sectionTables = useMemo(() => {
    if (!activeSection || activeSection === "All") return tables;
    return tables.filter((t) => t.section === activeSection || !t.section);
  }, [tables, activeSection]);

  // Selected table
  const selectedTable = useMemo(() => {
    if (!selectedTableId) return null;
    return tables.find((t) => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  // Summary Metrics
  const floorStats = useMemo(() => {
    const total = tables.length;
    let available = 0;
    let seated = 0;
    let billed = 0;
    let totalGuests = 0;
    let totalCap = 0;

    tables.forEach((t) => {
      totalCap += t.capacity;
      if (t.status === "available") available += 1;
      else if (t.status === "seated" || t.status === "served") {
        seated += 1;
        totalGuests += t.activeOrder?.guestCount || t.capacity;
      } else if (t.status === "billed") billed += 1;
    });

    const occupancyRate = total > 0 ? Math.round(((total - available) / total) * 100) : 0;

    return {
      totalTables: total,
      availableTables: available,
      occupiedTables: seated + billed,
      billedTables: billed,
      totalCapacity: totalCap,
      currentGuests: totalGuests,
      occupancyRate,
    };
  }, [tables]);

  // 5. Mutations

  // Update Table Position / Size Mutation
  const updateTableLayoutMutation = useMutation({
    mutationFn: async (updatedTables: Array<{ id: string; x_pos: number; y_pos: number; width?: number; height?: number; section?: string; shape?: string }>) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      // Update optimistic cache
      queryClient.setQueryData(["floor-tables", restaurantId], (old: any[] = []) =>
        old.map((t) => {
          const match = updatedTables.find((u) => u.id === t.id);
          if (match) {
            return { ...t, ...match };
          }
          return t;
        }),
      );

      for (const t of updatedTables) {
        await supabase
          .from("restaurant_tables")
          .update({
            x_pos: t.x_pos,
            y_pos: t.y_pos,
            width: t.width,
            height: t.height,
            shape: t.shape,
            updated_at: new Date().toISOString(),
          })
          .eq("id", t.id);
      }
    },
    onSuccess: () => {
      toast({ title: "Floor Plan Saved", description: "Table layout updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["floor-tables", restaurantId] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save layout", description: err.message, variant: "destructive" });
    },
  });

  // Create Table Mutation
  const createTableMutation = useMutation({
    mutationFn: async (tableData: {
      name: string;
      capacity: number;
      shape: TableShape;
      section: string;
      x_pos?: number;
      y_pos?: number;
    }) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      const { data, error } = await supabase
        .from("restaurant_tables")
        .insert([
          {
            restaurant_id: restaurantId,
            name: tableData.name,
            capacity: tableData.capacity,
            shape: tableData.shape,
            status: "available",
            x_pos: tableData.x_pos || 80,
            y_pos: tableData.y_pos || 80,
            width: tableData.shape === "circle" ? 110 : tableData.shape === "rectangle" ? 130 : 110,
            height: 100,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Table Added", description: "New table ready on floor plan." });
      queryClient.invalidateQueries({ queryKey: ["floor-tables", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  // Update Table Mutation (Name, Capacity, Status, Shape)
  const updateTableMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      capacity,
      status,
      shape,
      section,
    }: {
      id: string;
      name?: string;
      capacity?: number;
      status?: TableOccupancyStatus;
      shape?: TableShape;
      section?: string;
    }) => {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (name !== undefined) updatePayload.name = name;
      if (capacity !== undefined) updatePayload.capacity = capacity;
      if (status !== undefined) updatePayload.status = status;
      if (shape !== undefined) updatePayload.shape = shape;

      const { error } = await supabase
        .from("restaurant_tables")
        .update(updatePayload)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Table Updated", description: "Table details updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["floor-tables", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (err: any) => {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    },
  });

  // Delete Table Mutation
  const deleteTableMutation = useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await supabase.from("restaurant_tables").delete().eq("id", tableId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Table Deleted", description: "Removed from floor plan." });
      queryClient.invalidateQueries({ queryKey: ["floor-tables", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["qsr-tables", restaurantId] });
      setSelectedTableId(null);
    },
  });

  // Seat Guests / Change Status Mutation
  const setTableStatusMutation = useMutation({
    mutationFn: async ({ tableId, status }: { tableId: string; status: TableOccupancyStatus }) => {
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", tableId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: "Table Status Updated", description: `Marked as ${vars.status.toUpperCase()}` });
      queryClient.invalidateQueries({ queryKey: ["floor-tables", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["qsr-tables", restaurantId] });
    },
  });

  // Transfer Table Mutation (moves running order from Table A to Table B)
  const transferTableMutation = useMutation({
    mutationFn: async ({
      fromTable,
      toTable,
    }: {
      fromTable: FloorTable;
      toTable: FloorTable;
    }) => {
      if (!fromTable.activeOrder) throw new Error("Source table has no active order");

      // 1. Update order table_number
      await supabase
        .from("orders")
        .update({
          table_number: toTable.name,
          notes: `[Transferred from Table ${fromTable.name}]`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fromTable.activeOrder.orderId);

      // 2. Update statuses
      await supabase
        .from("restaurant_tables")
        .update({ status: "available" })
        .eq("id", fromTable.id);

      await supabase
        .from("restaurant_tables")
        .update({ status: fromTable.status })
        .eq("id", toTable.id);
    },
    onSuccess: (_, vars) => {
      toast({
        title: "Table Transferred! 🔄",
        description: `Order successfully moved from Table ${vars.fromTable.name} to Table ${vars.toTable.name}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["floor-tables", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["active-table-orders", restaurantId] });
      setSelectedTableId(null);
    },
  });

  // Fire Next Course Mutation (Sends trigger to Kitchen KDS)
  const fireCourseMutation = useMutation({
    mutationFn: async ({
      orderId,
      courseName,
      tableName,
    }: {
      orderId: string;
      courseName: "Mains" | "Dessert" | "Starters";
      tableName: string;
    }) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      // Insert kitchen alert / priority KOT
      await supabase.from("kitchen_orders").insert([
        {
          restaurant_id: restaurantId,
          order_id: orderId,
          source: `FIRE ${courseName.toUpperCase()}`,
          status: "preparing",
          priority: "rush",
          items: [{ name: `🔥 FIRE ${courseName.toUpperCase()} for Table ${tableName}`, quantity: 1 }],
        },
      ]);
    },
    onSuccess: (_, vars) => {
      toast({
        title: `🔥 Course Fired: ${vars.courseName}`,
        description: `Kitchen alert sent for Table ${vars.tableName}.`,
      });
    },
  });

  // Split Bill Settlement Mutation
  const settleSplitBillMutation = useMutation({
    mutationFn: async ({
      orderId,
      tableId,
      checks,
    }: {
      orderId: string;
      tableId: string;
      checks: SplitCheck[];
    }) => {
      // 1. Record split payments in orders
      const splitPayload = checks.map((c) => ({
        method: c.paymentMethod,
        amount: c.totalAmount,
        guest_name: c.guestName,
        paid_at: new Date().toISOString(),
      }));

      await supabase
        .from("orders")
        .update({
          status: "completed",
          payment_status: "paid",
          payment_method: "split",
          split_payments: splitPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      // 2. Free the table
      await supabase
        .from("restaurant_tables")
        .update({ status: "available", updated_at: new Date().toISOString() })
        .eq("id", tableId);
    },
    onSuccess: () => {
      toast({
        title: "Split Bill Settled! 💳",
        description: "All sub-checks collected and table is now available.",
      });
      queryClient.invalidateQueries({ queryKey: ["floor-tables", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["active-table-orders", restaurantId] });
      setSelectedTableId(null);
    },
  });

  return {
    tables: sectionTables,
    allTables: tables,
    sections: DEFAULT_SECTIONS,
    activeSection,
    setActiveSection,
    selectedTable,
    selectedTableId,
    setSelectedTableId,
    isEditMode,
    setIsEditMode,
    stats: floorStats,
    isLoading: isLoadingTables,
    updateTableLayout: updateTableLayoutMutation.mutate,
    isSavingLayout: updateTableLayoutMutation.isPending,
    createTable: createTableMutation.mutate,
    updateTable: updateTableMutation.mutate,
    deleteTable: deleteTableMutation.mutate,
    setTableStatus: setTableStatusMutation.mutate,
    transferTable: transferTableMutation.mutate,
    fireCourse: fireCourseMutation.mutate,
    settleSplitBill: settleSplitBillMutation.mutate,
    isSettlingBill: settleSplitBillMutation.isPending,
    architecturalElements:
      activeSection === "All"
        ? architecturalElements
        : architecturalElements.filter((e) => e.section === activeSection),
    allArchitecturalElements: architecturalElements,
    saveArchitecturalElements,
    addArchitecturalElement,
    deleteArchitecturalElement,
    rotateArchitecturalElement,
    resizeArchitecturalElement,
  };
}
