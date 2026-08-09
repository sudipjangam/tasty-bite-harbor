import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SimTable {
  id: string;
  name: string;
  capacity: number;
  status: string;
  x_pos: number;
  y_pos: number;
  width: number;
  height: number;
  shape: 'square' | 'circle' | 'rectangle';
}

export interface SimLayoutObject {
  id: string;
  name: string;
  type: string;
  x_pos: number;
  y_pos: number;
  width: number;
  height: number;
}

export interface SimOrder {
  id: string;
  table_number: string;
  status: string;
}

export interface SimStaff {
  id: string;
  name: string;
  role: string;
}

const DEMO_TABLES: SimTable[] = [
  { id: "t1", name: "T1", capacity: 4, status: "occupied", x_pos: 2, y_pos: 2, width: 2, height: 2, shape: "square" },
  { id: "t2", name: "T2", capacity: 2, status: "available", x_pos: 6, y_pos: 2, width: 2, height: 2, shape: "circle" },
  { id: "t3", name: "T3", capacity: 4, status: "occupied", x_pos: 10, y_pos: 2, width: 2, height: 2, shape: "square" },
  { id: "t4", name: "T4", capacity: 2, status: "reserved", x_pos: 14, y_pos: 2, width: 2, height: 2, shape: "circle" },
  { id: "t6", name: "T6", capacity: 4, status: "available", x_pos: 18, y_pos: 2, width: 2, height: 2, shape: "square" },
];

const DEMO_LAYOUT: SimLayoutObject[] = [
  { id: "o1", name: "Restrooms", type: "restroom", x_pos: 17, y_pos: 5, width: 3, height: 3 },
  { id: "o2", name: "Storage", type: "storage", x_pos: 20, y_pos: 5, width: 3, height: 3 },
  { id: "o3", name: "Kitchen", type: "kitchen", x_pos: 18, y_pos: 9, width: 5, height: 6 },
  { id: "o4", name: "Bar Area", type: "bar", x_pos: 11, y_pos: 11, width: 2, height: 4 },
  { id: "o5", name: "Host Stand", type: "host_stand", x_pos: 2, y_pos: 13, width: 2, height: 2 },
];

const DEMO_STAFF: SimStaff[] = [
  { id: 's1', name: 'John', role: 'waiter' },
  { id: 's2', name: 'Alice', role: 'waiter' },
  { id: 's3', name: 'Chef Gordon', role: 'chef' },
];

const DEMO_ORDERS: SimOrder[] = [
  { id: 'o1', table_number: 'T1', status: 'preparing' },
];

export const useSimulationData = (activeBranchId: string | undefined, isDemoMode: boolean) => {
  const [tables, setTables] = useState<SimTable[]>([]);
  const [layoutObjects, setLayoutObjects] = useState<SimLayoutObject[]>([]);
  const [orders, setOrders] = useState<SimOrder[]>([]);
  const [staff, setStaff] = useState<SimStaff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Use a ref to always have a stable reference to the latest state setters
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // useCallback so the realtime subscription always calls the latest version
  const loadData = useCallback(async () => {
    if (isDemoMode) {
      setTables(DEMO_TABLES);
      setLayoutObjects(DEMO_LAYOUT);
      setStaff(DEMO_STAFF);
      setOrders(DEMO_ORDERS);
      setLoading(false);
      return;
    }

    if (!activeBranchId) return;

    setLoading(true);
    try {
      const [tablesRes, layoutRes, ordersRes, staffRes] = await Promise.all([
        supabase.from('restaurant_tables').select('*').eq('restaurant_id', activeBranchId),
        supabase.from('restaurant_layout_objects').select('*').eq('restaurant_id', activeBranchId),
        supabase.from('kitchen_orders')
          .select('id, table_number, status')
          .eq('restaurant_id', activeBranchId)
          .in('status', ['new', 'preparing', 'ready']),
        supabase.from('staff')
          .select('id, name, role')
          .eq('restaurant_id', activeBranchId)
          .eq('is_active', true),
      ]);

      if (!isMounted.current) return;

      if (tablesRes.error) throw tablesRes.error;
      if (layoutRes.error) throw layoutRes.error;
      if (ordersRes.error) throw ordersRes.error;

      setTables(tablesRes.data as any || []);
      setLayoutObjects(layoutRes.data as any || []);
      setOrders(ordersRes.data as any || []);

      if (staffRes.data && staffRes.data.length > 0) {
        setStaff(staffRes.data as any);
      } else {
        setStaff([
          { id: 's1', name: 'John', role: 'waiter' },
          { id: 's2', name: 'Alice', role: 'waiter' },
          { id: 's3', name: 'Chef', role: 'chef' },
        ]);
      }

    } catch (err: any) {
      console.error('Error loading simulation data:', err);
      if (isMounted.current) {
        toast({
          title: 'Error Loading Simulation',
          description: err.message,
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [activeBranchId, isDemoMode, toast]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription — uses stable loadData callback
  useEffect(() => {
    if (isDemoMode || !activeBranchId) return;

    const channelName = `simulation-realtime-${activeBranchId}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kitchen_orders',
        filter: `restaurant_id=eq.${activeBranchId}`
      }, () => loadData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'restaurant_tables',
        filter: `restaurant_id=eq.${activeBranchId}`
      }, () => loadData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${activeBranchId}`
      }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemoMode, activeBranchId, loadData]);

  return { tables, layoutObjects, orders, staff, loading };
};
