import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReplayOrder {
  id: string;
  table_number: string | null;
  status: string;
  items: any;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  server_name: string | null;
  order_type: string | null;
}

export interface ReplaySnapshot {
  timestamp: Date;
  minuteIndex: number; // minutes from start of day
  activeOrders: ReplayOrder[];  // orders active at this moment
  tableStatuses: Record<string, string>; // tableNumber -> status
  orderCount: number;
}

export interface ReplayTimeline {
  snapshots: ReplaySnapshot[];
  dayStart: Date;
  dayEnd: Date;
  totalMinutes: number;
  date: string;
}

// ── Demo replay data (synthetic lunch rush) ──────────────────
function buildDemoTimeline(date: string): ReplayTimeline {
  const dayStart = new Date(`${date}T10:00:00`);
  const dayEnd = new Date(`${date}T22:00:00`);
  const snapshots: ReplaySnapshot[] = [];

  const demoEvents: Array<{ minute: number; table: string; status: string; action: 'add' | 'update' | 'remove' }> = [
    { minute: 0,   table: 'T1', status: 'occupied',  action: 'add' },
    { minute: 5,   table: 'T1', status: 'occupied',  action: 'update' }, // order placed
    { minute: 8,   table: 'T2', status: 'occupied',  action: 'add' },
    { minute: 10,  table: 'T3', status: 'reserved',  action: 'add' },
    { minute: 15,  table: 'T1', status: 'occupied',  action: 'update' }, // food served
    { minute: 18,  table: 'T3', status: 'occupied',  action: 'update' },
    { minute: 25,  table: 'T4', status: 'occupied',  action: 'add' },
    { minute: 30,  table: 'T1', status: 'available', action: 'remove' },
    { minute: 35,  table: 'T5', status: 'occupied',  action: 'add' },
    { minute: 40,  table: 'T2', status: 'available', action: 'remove' },
    { minute: 45,  table: 'T1', status: 'occupied',  action: 'add' },   // re-seated
    { minute: 55,  table: 'T3', status: 'available', action: 'remove' },
    { minute: 60,  table: 'T6', status: 'occupied',  action: 'add' },
    { minute: 70,  table: 'T4', status: 'available', action: 'remove' },
    { minute: 80,  table: 'T5', status: 'available', action: 'remove' },
    { minute: 90,  table: 'T2', status: 'occupied',  action: 'add' },
    { minute: 100, table: 'T3', status: 'reserved',  action: 'add' },
    { minute: 110, table: 'T1', status: 'available', action: 'remove' },
    { minute: 120, table: 'T6', status: 'available', action: 'remove' },
  ];

  const demoOrders: ReplayOrder[] = [
    { id: 'd1', table_number: 'T1', status: 'preparing', items: [{ name: 'Masala Dosa', qty: 2 }], created_at: new Date(dayStart.getTime() + 5*60000).toISOString(), started_at: new Date(dayStart.getTime() + 7*60000).toISOString(), completed_at: new Date(dayStart.getTime() + 15*60000).toISOString(), server_name: 'John', order_type: 'dine_in' },
    { id: 'd2', table_number: 'T2', status: 'new', items: [{ name: 'Paneer Tikka', qty: 1 }, { name: 'Naan', qty: 3 }], created_at: new Date(dayStart.getTime() + 8*60000).toISOString(), started_at: null, completed_at: null, server_name: 'Alice', order_type: 'dine_in' },
    { id: 'd3', table_number: 'T3', status: 'ready', items: [{ name: 'Biryani', qty: 2 }], created_at: new Date(dayStart.getTime() + 18*60000).toISOString(), started_at: new Date(dayStart.getTime() + 20*60000).toISOString(), completed_at: new Date(dayStart.getTime() + 35*60000).toISOString(), server_name: 'John', order_type: 'dine_in' },
    { id: 'd4', table_number: 'T4', status: 'preparing', items: [{ name: 'Thali', qty: 3 }], created_at: new Date(dayStart.getTime() + 26*60000).toISOString(), started_at: new Date(dayStart.getTime() + 28*60000).toISOString(), completed_at: null, server_name: 'Alice', order_type: 'dine_in' },
  ];

  // Build one snapshot per minute for the 2-hour window
  const totalMinutes = Math.floor((dayEnd.getTime() - dayStart.getTime()) / 60000);

  let tableStatuses: Record<string, string> = {
    T1: 'available', T2: 'available', T3: 'available',
    T4: 'available', T5: 'available', T6: 'available',
  };

  for (let m = 0; m <= totalMinutes; m += 2) { // snapshot every 2 minutes
    // Apply events up to this minute
    demoEvents
      .filter(e => e.minute <= m)
      .forEach(e => { tableStatuses[e.table] = e.status; });

    const snapshotTime = new Date(dayStart.getTime() + m * 60000);

    // Active orders at this minute
    const activeOrders = demoOrders.filter(o => {
      const created = new Date(o.created_at).getTime();
      const completed = o.completed_at ? new Date(o.completed_at).getTime() : Infinity;
      return created <= snapshotTime.getTime() && snapshotTime.getTime() <= completed;
    });

    snapshots.push({
      timestamp: snapshotTime,
      minuteIndex: m,
      activeOrders,
      tableStatuses: { ...tableStatuses },
      orderCount: activeOrders.length,
    });
  }

  return { snapshots, dayStart, dayEnd, totalMinutes, date };
}

// ── Real data fetch ──────────────────────────────────────────
async function fetchDayTimeline(restaurantId: string, date: string): Promise<ReplayTimeline> {
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const { data, error } = await supabase
    .from('kitchen_orders')
    .select('id, table_number, status, items, created_at, started_at, completed_at, server_name, order_type')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', dayStart.toISOString())
    .lte('created_at', dayEnd.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;
  const orders: ReplayOrder[] = (data || []) as ReplayOrder[];

  // Find actual day bounds from data (or use full day)
  const firstOrder = orders[0] ? new Date(orders[0].created_at) : dayStart;
  const lastCompleted = orders.reduce((latest, o) => {
    const t = o.completed_at ? new Date(o.completed_at) : new Date(o.created_at);
    return t > latest ? t : latest;
  }, firstOrder);

  // Build timeline: snapshot every 2 minutes from first order to last completion
  const snapshotStart = new Date(firstOrder);
  snapshotStart.setMinutes(Math.floor(snapshotStart.getMinutes() / 2) * 2, 0, 0);

  const snapshotEnd = new Date(lastCompleted);
  snapshotEnd.setMinutes(Math.ceil(snapshotEnd.getMinutes() / 2) * 2 + 2, 0, 0);

  const totalMinutes = Math.max(
    120,
    Math.floor((snapshotEnd.getTime() - snapshotStart.getTime()) / 60000)
  );

  const snapshots: ReplaySnapshot[] = [];

  for (let m = 0; m <= totalMinutes; m += 2) {
    const snapshotTime = new Date(snapshotStart.getTime() + m * 60000);

    const activeOrders = orders.filter(o => {
      const created = new Date(o.created_at).getTime();
      const completed = o.completed_at ? new Date(o.completed_at).getTime() : (snapshotEnd.getTime() + 60000);
      return created <= snapshotTime.getTime() && snapshotTime.getTime() <= completed;
    });

    // Derive table statuses from active orders
    const tableStatuses: Record<string, string> = {};
    activeOrders.forEach(o => {
      if (o.table_number) {
        const existing = tableStatuses[o.table_number];
        // worst-case status wins: preparing > new > ready
        if (!existing || o.status === 'preparing') {
          tableStatuses[o.table_number] = 'occupied';
        }
      }
    });

    snapshots.push({
      timestamp: snapshotTime,
      minuteIndex: m,
      activeOrders,
      tableStatuses,
      orderCount: activeOrders.length,
    });
  }

  return { snapshots, dayStart: snapshotStart, dayEnd: snapshotEnd, totalMinutes, date };
}

// ── Hook ─────────────────────────────────────────────────────
export function useReplayData(restaurantId: string | null, isDemoMode: boolean) {
  const [timeline, setTimeline] = useState<ReplayTimeline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const loadTimeline = useCallback(async (date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let tl: ReplayTimeline;
      if (isDemoMode || !restaurantId) {
        tl = buildDemoTimeline(date);
      } else {
        tl = await fetchDayTimeline(restaurantId, date);
        if (tl.snapshots.length === 0) {
          // No data — fall back to demo so user sees something
          tl = buildDemoTimeline(date);
        }
      }
      setTimeline(tl);
    } catch (err: any) {
      setError(err.message);
      // Fall back to demo
      setTimeline(buildDemoTimeline(date));
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, isDemoMode]);

  useEffect(() => {
    loadTimeline(selectedDate);
  }, [selectedDate, loadTimeline]);

  return { timeline, isLoading, error, selectedDate, setSelectedDate, reload: loadTimeline };
}
