import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, X, Play } from "lucide-react";
import Highcharts, { Options } from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { format } from "date-fns";

const CHART_TYPES = [
  { value: "line", label: "Line", icon: "📈" },
  { value: "spline", label: "Spline", icon: "〰️" },
  { value: "area", label: "Area", icon: "▦" },
  { value: "areaspline", label: "Area Spline", icon: "🌊" },
  { value: "column", label: "Column", icon: "📊" },
  { value: "bar", label: "Bar", icon: "📶" },
  { value: "pie", label: "Pie", icon: "🥧" },
  { value: "scatter", label: "Scatter", icon: "⚬" },
  { value: "bubble", label: "Bubble", icon: "🫧" },
  { value: "funnel", label: "Funnel", icon: "🔽" },
];

const COLORS = ["#8b5cf6","#10b981","#f59e0b","#ec4899","#06b6d4","#f97316","#3b82f6","#a855f7","#14b8a6","#f43f5e"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

interface Props {
  orders: any[];
  menuItems: any[];
  revenueStats: any[];
  customerInsights: any[];
  topProducts: any[];
}

// All X-axis options (categorical)
const X_OPTIONS = [
  { group: "Time", items: [
    { key: "date", label: "Date" },
    { key: "weekday", label: "Day of Week" },
    { key: "hour", label: "Hour of Day" },
    { key: "month", label: "Month" },
    { key: "week", label: "Week Number" },
  ]},
  { group: "Orders", items: [
    { key: "order_type", label: "Order Type (Dine-in/Takeaway/Delivery)" },
    { key: "payment_status", label: "Payment Status" },
    { key: "order_source", label: "Order Source" },
    { key: "is_qr_order", label: "QR vs Manual Orders" },
  ]},
  { group: "Menu", items: [
    { key: "menu_item", label: "Menu Item (Top 20)" },
    { key: "menu_category", label: "Menu Category" },
    { key: "veg_nonveg", label: "Veg vs Non-Veg" },
    { key: "price_range", label: "Price Range Bucket" },
  ]},
  { group: "Customers", items: [
    { key: "customer_name", label: "Customer (Top 20)" },
  ]},
  { group: "Staff", items: [
    { key: "attendant", label: "Attendant / Staff" },
  ]},
];

// All Y-axis options (numeric)
const Y_OPTIONS = [
  { group: "Revenue", items: [
    { key: "revenue", label: "Total Revenue (₹)" },
    { key: "avg_order_value", label: "Avg Order Value (₹)" },
    { key: "max_order_value", label: "Max Order Value (₹)" },
    { key: "min_order_value", label: "Min Order Value (₹)" },
    { key: "discount_total", label: "Total Discount Given (₹)" },
    { key: "net_revenue", label: "Net Revenue After Discount (₹)" },
  ]},
  { group: "Orders", items: [
    { key: "order_count", label: "Number of Orders" },
    { key: "items_per_order", label: "Avg Items per Order" },
    { key: "total_items_sold", label: "Total Items Sold" },
  ]},
  { group: "Menu", items: [
    { key: "item_qty", label: "Quantity Sold" },
    { key: "item_revenue", label: "Item Revenue (₹)" },
    { key: "unique_items", label: "Unique Items Ordered" },
    { key: "item_price", label: "Menu Price (₹)" },
  ]},
  { group: "Customers", items: [
    { key: "customer_count", label: "Unique Customers" },
    { key: "customer_spending", label: "Customer Spending (₹)" },
    { key: "customer_visits", label: "Customer Visit Count" },
    { key: "avg_customer_spend", label: "Avg Spend per Customer (₹)" },
  ]},
];

export default function ManualChartBuilder({ orders, menuItems, revenueStats, customerInsights, topProducts }: Props) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const [chartType, setChartType] = useState("column");
  const [chartOptions, setChartOptions] = useState<Options | null>(null);
  const [chartTitle, setChartTitle] = useState("");
  const [error, setError] = useState("");

  // Pre-compute all aggregations
  const agg = useMemo(() => {
    const byKey: Record<string, Record<string, { revenue: number; count: number; items: number; discount: number; maxVal: number; minVal: number; customers: Set<string>; uniqueItems: Set<string> }>> = {};

    const ensure = (dim: string, key: string) => {
      if (!byKey[dim]) byKey[dim] = {};
      if (!byKey[dim][key]) byKey[dim][key] = { revenue: 0, count: 0, items: 0, discount: 0, maxVal: 0, minVal: Infinity, customers: new Set(), uniqueItems: new Set() };
      return byKey[dim][key];
    };

    // Item-level aggregations
    const itemQty: Record<string, number> = {};
    const itemRev: Record<string, number> = {};
    const catQty: Record<string, number> = {};
    const catRev: Record<string, number> = {};

    orders.forEach((o: any) => {
      const total = Number(o.total || o.total_amount || 0);
      const discount = Number(o.discount_amount || 0);
      const custName = o.customer_name || o.Customer_Name || "Walk-in";
      const orderType = o.order_type || "dine-in";
      const payStatus = o.payment_status || "unknown";
      const source = o.source || "pos";
      const isQr = o.is_qr_order ? "QR Order" : "Manual Order";
      const attendant = o.attendant || "Unassigned";

      // Count items in this order
      let orderItemCount = 0;
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          let name = "", qty = 1, price = 0;
          try {
            const p = typeof item === "string" ? JSON.parse(item) : item;
            name = p.name || ""; qty = p.quantity || 1; price = p.price || 0;
          } catch { name = String(item).replace(/@[\d.]+\s*$/, "").trim(); }
          orderItemCount += qty;
          if (name) {
            itemQty[name] = (itemQty[name] || 0) + qty;
            itemRev[name] = (itemRev[name] || 0) + qty * price;
            const mi = menuItems.find((m: any) => m.name === name);
            const cat = mi?.category || "Other";
            catQty[cat] = (catQty[cat] || 0) + qty;
            catRev[cat] = (catRev[cat] || 0) + qty * (price || mi?.price || 0);
          }
        });
      }

      // Helper to aggregate into all dimension buckets
      const agg1 = (dim: string, key: string) => {
        const b = ensure(dim, key);
        b.revenue += total; b.count += 1; b.items += orderItemCount;
        b.discount += discount;
        b.maxVal = Math.max(b.maxVal, total);
        b.minVal = Math.min(b.minVal, total);
        b.customers.add(custName);
        if (Array.isArray(o.items)) o.items.forEach((it: any) => {
          try { const p = typeof it === "string" ? JSON.parse(it) : it; if (p.name) b.uniqueItems.add(p.name); } catch {}
        });
      };

      // Time dimensions
      if (o.created_at) {
        const d = new Date(o.created_at);
        agg1("hour", `${d.getHours().toString().padStart(2, "0")}:00`);
        agg1("weekday", WEEKDAYS[d.getDay()]);
        agg1("month", format(d, "yyyy-MM"));
        const weekNum = format(d, "yyyy-'W'II");
        agg1("week", weekNum);
      }

      agg1("order_type", orderType);
      agg1("payment_status", payStatus);
      agg1("order_source", source);
      agg1("is_qr_order", isQr);
      agg1("attendant", attendant);
      agg1("customer_name", custName);

      // Veg/Non-veg dimension
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          let name = "";
          try { const p = typeof item === "string" ? JSON.parse(item) : item; name = p.name || ""; } catch {}
          if (name) {
            const mi = menuItems.find((m: any) => m.name === name);
            const vegLabel = mi?.is_veg === true ? "Veg" : mi?.is_veg === false ? "Non-Veg" : "Unknown";
            ensure("veg_nonveg", vegLabel).count += 1;
          }
        });
      }
    });

    // Price range buckets from menu items
    const priceRanges: Record<string, { qty: number; rev: number }> = {};
    Object.entries(itemQty).forEach(([name, qty]) => {
      const mi = menuItems.find((m: any) => m.name === name);
      const price = mi?.price || 0;
      let bucket = "₹0-100";
      if (price > 500) bucket = "₹500+";
      else if (price > 300) bucket = "₹300-500";
      else if (price > 200) bucket = "₹200-300";
      else if (price > 100) bucket = "₹100-200";
      if (!priceRanges[bucket]) priceRanges[bucket] = { qty: 0, rev: 0 };
      priceRanges[bucket].qty += qty;
      priceRanges[bucket].rev += (itemRev[name] || 0);
    });

    return { byKey, itemQty, itemRev, catQty, catRev, priceRanges };
  }, [orders, menuItems]);

  const resolve = (x: string, y: string): { categories: string[]; values: number[] } | null => {
    const c = agg;
    const topN = (rec: Record<string, number>, n = 20) => Object.entries(rec).sort(([, a], [, b]) => b - a).slice(0, n);
    const sortByVal = (entries: [string, any][], valFn: (v: any) => number) => entries.sort(([, a], [, b]) => valFn(b) - valFn(a));

    // Date from revenueStats
    if (x === "date") {
      const sorted = [...revenueStats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const cats = sorted.map((s: any) => format(new Date(s.date), "MMM dd"));
      const vals = sorted.map((s: any) => {
        if (y === "revenue" || y === "item_revenue" || y === "net_revenue") return Number(s.total_revenue);
        if (y === "order_count" || y === "total_items_sold") return s.order_count;
        if (y === "avg_order_value" || y === "avg_customer_spend") return Number(s.average_order_value);
        if (y === "customer_count") return s.order_count; // proxy
        return Number(s.total_revenue);
      });
      return { categories: cats, values: vals };
    }

    // Menu item X
    if (x === "menu_item") {
      if (y === "item_qty" || y === "total_items_sold" || y === "order_count") {
        const t = topN(c.itemQty); return { categories: t.map(([k]) => k), values: t.map(([, v]) => v) };
      }
      if (y === "item_price") {
        const t = topN(c.itemQty);
        return { categories: t.map(([k]) => k), values: t.map(([k]) => menuItems.find((m: any) => m.name === k)?.price || 0) };
      }
      const t = topN(c.itemRev); return { categories: t.map(([k]) => k), values: t.map(([, v]) => Math.round(v)) };
    }

    // Menu category X
    if (x === "menu_category") {
      if (y === "item_qty" || y === "total_items_sold" || y === "order_count") {
        const t = topN(c.catQty); return { categories: t.map(([k]) => k), values: t.map(([, v]) => v) };
      }
      if (y === "unique_items") {
        const catItems: Record<string, Set<string>> = {};
        menuItems.forEach((m: any) => { if (!catItems[m.category]) catItems[m.category] = new Set(); catItems[m.category].add(m.name); });
        const entries = Object.entries(catItems).map(([k, v]) => [k, v.size] as [string, number]).sort(([, a], [, b]) => b - a);
        return { categories: entries.map(([k]) => k), values: entries.map(([, v]) => v) };
      }
      const t = topN(c.catRev); return { categories: t.map(([k]) => k), values: t.map(([, v]) => Math.round(v)) };
    }

    // Veg/Non-veg X
    if (x === "veg_nonveg") {
      const vegQty: Record<string, number> = {};
      const vegRev: Record<string, number> = {};
      Object.entries(c.itemQty).forEach(([name, qty]) => {
        const mi = menuItems.find((m: any) => m.name === name);
        const label = mi?.is_veg === true ? "Veg" : mi?.is_veg === false ? "Non-Veg" : "Unknown";
        vegQty[label] = (vegQty[label] || 0) + qty;
        vegRev[label] = (vegRev[label] || 0) + (c.itemRev[name] || 0);
      });
      if (y === "item_qty" || y === "total_items_sold" || y === "order_count") {
        const entries = Object.entries(vegQty); return { categories: entries.map(([k]) => k), values: entries.map(([, v]) => v) };
      }
      const entries = Object.entries(vegRev); return { categories: entries.map(([k]) => k), values: entries.map(([, v]) => Math.round(v)) };
    }

    // Price range X
    if (x === "price_range") {
      const bucketOrder = ["₹0-100", "₹100-200", "₹200-300", "₹300-500", "₹500+"];
      const cats = bucketOrder.filter(b => c.priceRanges[b]);
      if (y === "item_qty" || y === "total_items_sold" || y === "order_count") {
        return { categories: cats, values: cats.map(b => c.priceRanges[b]?.qty || 0) };
      }
      return { categories: cats, values: cats.map(b => Math.round(c.priceRanges[b]?.rev || 0)) };
    }

    // Customer X
    if (x === "customer_name") {
      const sorted = [...customerInsights].sort((a: any, b: any) => b.total_spent - a.total_spent).slice(0, 20);
      if (y === "customer_visits" || y === "order_count") return { categories: sorted.map((ci: any) => ci.customer_name), values: sorted.map((ci: any) => ci.visit_count) };
      return { categories: sorted.map((ci: any) => ci.customer_name), values: sorted.map((ci: any) => Number(ci.total_spent)) };
    }

    // Generic dimension from byKey (weekday, hour, month, week, order_type, payment_status, source, qr, attendant)
    const bucket = c.byKey[x];
    if (!bucket) return null;

    let entries = Object.entries(bucket);
    // Sort
    if (x === "weekday") entries = WEEKDAYS.filter(d => bucket[d]).map(d => [d, bucket[d]]);
    else if (x === "hour") entries.sort(([a], [b]) => a.localeCompare(b));
    else if (x === "month" || x === "week") entries.sort(([a], [b]) => a.localeCompare(b));
    else sortByVal(entries, (v) => v.count);

    const cats = entries.map(([k]) => k);
    const vals = entries.map(([, v]) => {
      if (y === "revenue" || y === "item_revenue" || y === "customer_spending") return Math.round(v.revenue);
      if (y === "order_count") return v.count;
      if (y === "avg_order_value" || y === "avg_customer_spend") return v.count ? Math.round(v.revenue / v.count) : 0;
      if (y === "max_order_value") return Math.round(v.maxVal);
      if (y === "min_order_value") return v.minVal === Infinity ? 0 : Math.round(v.minVal);
      if (y === "discount_total") return Math.round(v.discount);
      if (y === "net_revenue") return Math.round(v.revenue - v.discount);
      if (y === "total_items_sold" || y === "item_qty") return v.items;
      if (y === "items_per_order") return v.count ? Math.round((v.items / v.count) * 10) / 10 : 0;
      if (y === "customer_count") return v.customers.size;
      if (y === "customer_visits") return v.count;
      if (y === "unique_items") return v.uniqueItems.size;
      if (y === "item_price") return v.count ? Math.round(v.revenue / v.items) : 0;
      return Math.round(v.revenue);
    });

    return cats.length ? { categories: cats, values: vals } : null;
  };

  const handleGenerate = () => {
    if (!xAxis || !yAxis) { setError("Select both X-Axis and Y-Axis"); return; }
    setError("");

    const xLabel = X_OPTIONS.flatMap(g => g.items).find(i => i.key === xAxis)?.label || xAxis;
    const yLabel = Y_OPTIONS.flatMap(g => g.items).find(i => i.key === yAxis)?.label || yAxis;
    const isPie = chartType === "pie" || chartType === "funnel";

    const result = resolve(xAxis, yAxis);
    if (!result || !result.values.length) { setError(`No data for "${xLabel}" vs "${yLabel}".`); return; }

    const title = `${yLabel} by ${xLabel}`;
    setChartTitle(title);

    if (isPie) {
      setChartOptions({
        chart: { type: chartType as any, backgroundColor: "transparent", height: 380 },
        credits: { enabled: false }, title: { text: undefined },
        plotOptions: { pie: { innerSize: "45%", showInLegend: true, dataLabels: { enabled: true, format: "{point.name}: {point.percentage:.1f}%" } } },
        series: [{ name: yLabel, type: "pie", data: result.categories.map((name, i) => ({ name, y: result.values[i], color: COLORS[i % COLORS.length] })) }],
      });
    } else {
      setChartOptions({
        chart: { type: chartType as any, backgroundColor: "transparent", height: 380 },
        credits: { enabled: false }, title: { text: undefined },
        xAxis: { categories: result.categories, labels: { style: { fontSize: "11px" }, rotation: result.categories.length > 12 ? -45 : 0 } },
        yAxis: { title: { text: yLabel } },
        plotOptions: { series: { borderRadius: 3 }, column: { borderRadius: 4 } },
        series: [{ name: yLabel, type: chartType as any, data: result.values.map((v, i) => ({ y: v, color: (chartType === "column" || chartType === "bar") ? COLORS[i % COLORS.length] : undefined })), color: COLORS[0] }],
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* X-Axis */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">X</span>
            X-Axis (Categories)
          </label>
          <Select value={xAxis} onValueChange={setXAxis}>
            <SelectTrigger className="h-9 text-sm border-blue-200 dark:border-blue-800"><SelectValue placeholder="Select X-Axis..." /></SelectTrigger>
            <SelectContent>
              {X_OPTIONS.map(g => (
                <SelectGroup key={g.group}>
                  <SelectLabel className="text-xs font-semibold text-purple-600 dark:text-purple-400">{g.group}</SelectLabel>
                  {g.items.map(d => <SelectItem key={d.key} value={d.key} className="text-sm">{d.label}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Y-Axis */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center text-[10px] font-bold">Y</span>
            Y-Axis (Values)
          </label>
          <Select value={yAxis} onValueChange={setYAxis}>
            <SelectTrigger className="h-9 text-sm border-green-200 dark:border-green-800"><SelectValue placeholder="Select Y-Axis..." /></SelectTrigger>
            <SelectContent>
              {Y_OPTIONS.map(g => (
                <SelectGroup key={g.group}>
                  <SelectLabel className="text-xs font-semibold text-green-600 dark:text-green-400">{g.group}</SelectLabel>
                  {g.items.map(d => <SelectItem key={d.key} value={d.key} className="text-sm">{d.label}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Chart Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5 text-purple-500" /> Chart Type
          </label>
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="h-9 text-sm border-purple-200 dark:border-purple-800"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHART_TYPES.map(ct => <SelectItem key={ct.value} value={ct.value} className="text-sm">{ct.icon} {ct.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={!xAxis || !yAxis} className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20">
        <Play className="h-4 w-4 mr-2" /> Generate Chart
      </Button>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-xl text-sm text-red-600 dark:text-red-400">
          <X className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {chartOptions && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{chartTitle}</h3>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setChartOptions(null); setChartTitle(""); }}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <HighchartsReact highcharts={Highcharts} options={chartOptions} ref={chartRef} />
          </div>
        </div>
      )}
    </div>
  );
}
