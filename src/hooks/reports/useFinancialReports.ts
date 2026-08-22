import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ReportData } from "./types";

export function useStaffReport(
  restaurantId: string | null,
  startDate: string,
  endDate: string
): ReportData {
  const query = useQuery({
    queryKey: ["report-staff", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: staff, error: staffError } = await supabase
        .from("profiles")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (staffError) throw staffError;

      const { data: attendance, error: attError } = await supabase
        .from("staff_attendance")
        .select("*, profiles(first_name, last_name)")
        .gte("clock_in", startDate)
        .lte("clock_in", endDate);

      if (attError) throw attError;

      const totalHours =
        attendance?.reduce(
          (sum, a) => sum + (a.total_hours || 0),
          0
        ) || 0;

      const formatted =
        attendance?.map((a) => ({
          Staff: `${(a.profiles as any)?.first_name || ""} ${(a.profiles as any)?.last_name || ""}`.trim(),
          "Clock In": format(new Date(a.clock_in), "MMM dd, yyyy HH:mm"),
          "Clock Out": a.clock_out
            ? format(new Date(a.clock_out), "MMM dd, yyyy HH:mm")
            : "Active",
          "Total Hours": a.total_hours ? Number(a.total_hours.toFixed(1)) : "-",
          Status: a.status || "completed",
        })) || [];

      return {
        summary: {
          "Total Staff Members": staff?.length || 0,
          "Total Shifts Logged": attendance?.length || 0,
          "Total Hours Worked": Number(totalHours.toFixed(1)),
          "Avg Hours/Shift":
            attendance && attendance.length > 0
              ? Number((totalHours / attendance.length).toFixed(1))
              : 0,
        },
        chartData: staff?.map((s) => ({
          name: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
          value:
            attendance?.filter((a) => a.staff_id === s.id).length || 0,
        })),
        tableData: formatted,
      };
    },
    enabled: !!restaurantId,
  });

  return {
    category: "staff",
    title: "Staff & Attendance Report",
    summary: query.data?.summary || {},
    chartData: query.data?.chartData,
    tableData: query.data?.tableData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useExpensesReport(
  restaurantId: string | null,
  startDate: string,
  endDate: string
): ReportData {
  const query = useQuery({
    queryKey: ["report-expenses", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: expenses, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("date", startDate.split("T")[0])
        .lte("date", endDate.split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;

      const totalExpenses =
        expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      const byCategory =
        expenses?.reduce(
          (acc, e) => {
            const cat = e.category || "General";
            acc[cat] = (acc[cat] || 0) + (e.amount || 0);
            return acc;
          },
          {} as Record<string, number>
        ) || {};

      const formatted =
        expenses?.map((e) => ({
          Date: e.date,
          Title: e.title,
          Category: e.category || "General",
          Amount: e.amount,
          "Payment Method": e.payment_method || "N/A",
          Status: e.status || "approved",
        })) || [];

      return {
        summary: {
          "Total Expenses": `₹${totalExpenses.toLocaleString()}`,
          "Expense Count": expenses?.length || 0,
          "Top Category":
            Object.entries(byCategory).sort(
              ([, a], [, b]) => b - a
            )[0]?.[0] || "N/A",
          "Avg Expense":
            expenses && expenses.length > 0
              ? `₹${Math.round(totalExpenses / expenses.length)}`
              : "₹0",
        },
        chartData: Object.entries(byCategory).map(([name, value]) => ({
          name,
          value: Math.round(value),
        })),
        tableData: formatted,
      };
    },
    enabled: !!restaurantId,
  });

  return {
    category: "expenses",
    title: "Expenses & Overhead Report",
    summary: query.data?.summary || {},
    chartData: query.data?.chartData,
    tableData: query.data?.tableData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useRoomsReport(
  restaurantId: string | null,
  startDate: string,
  endDate: string
): ReportData {
  const query = useQuery({
    queryKey: ["report-rooms", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: rooms, error: roomsError } = await supabase
        .from("rooms")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (roomsError) throw roomsError;

      const { data: bookings, error: bookingsError } = await supabase
        .from("room_reservations")
        .select("*")
        .gte("start_time", startDate)
        .lte("start_time", endDate);

      if (bookingsError) throw bookingsError;

      const totalRevenue =
        bookings?.reduce(
          (sum, b) => sum + (b.total_amount || 0),
          0
        ) || 0;

      const formatted =
        bookings?.map((b) => ({
          Guest: b.customer_name,
          "Check In": format(new Date(b.start_time), "MMM dd, yyyy"),
          "Check Out": format(new Date(b.end_date), "MMM dd, yyyy"),
          Amount: b.total_amount || 0,
          Status: b.status,
        })) || [];

      return {
        summary: {
          "Total Rooms": rooms?.length || 0,
          "Total Bookings": bookings?.length || 0,
          "Room Revenue": `₹${totalRevenue.toLocaleString()}`,
          "Occupancy Rate":
            rooms && rooms.length > 0
              ? `${Math.min(
                  100,
                  Math.round(
                    ((bookings?.length || 0) / (rooms.length * 30)) * 100
                  )
                )}%`
              : "0%",
        },
        chartData: rooms?.map((r) => ({
          name: r.room_number,
          value:
            bookings?.filter((b) => b.room_id === r.id).length || 0,
        })),
        tableData: formatted,
      };
    },
    enabled: !!restaurantId,
  });

  return {
    category: "rooms",
    title: "Rooms & Hotel Report",
    summary: query.data?.summary || {},
    chartData: query.data?.chartData,
    tableData: query.data?.tableData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useRecipesReport(
  restaurantId: string | null
): ReportData {
  const query = useQuery({
    queryKey: ["report-recipes", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: recipes, error } = await supabase
        .from("recipes")
        .select("*, menu_items(name, price)")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      const formatted =
        recipes?.map((r) => {
          const sellingPrice = (r.menu_items as any)?.price || 0;
          const cost = r.cost_per_serving || 0;
          const margin =
            sellingPrice > 0
              ? `${Math.round(((sellingPrice - cost) / sellingPrice) * 100)}%`
              : "N/A";
          return {
            Recipe: r.name,
            "Menu Item": (r.menu_items as any)?.name || "Unlinked",
            "Cost/Serving": cost,
            "Selling Price": sellingPrice,
            Margin: margin,
            Yield: `${r.yield_quantity || 1} ${r.yield_unit || "servings"}`,
          };
        }) || [];

      const avgMargin =
        recipes?.reduce((sum, r) => {
          const sp = (r.menu_items as any)?.price || 0;
          const c = r.cost_per_serving || 0;
          return sp > 0 ? sum + ((sp - c) / sp) * 100 : sum;
        }, 0) || 0;

      return {
        summary: {
          "Configured Recipes": recipes?.length || 0,
          "Avg Food Margin":
            recipes && recipes.length > 0
              ? `${Math.round(avgMargin / recipes.length)}%`
              : "N/A",
        },
        chartData: recipes?.slice(0, 8).map((r) => ({
          name: r.name,
          value: r.cost_per_serving || 0,
        })),
        tableData: formatted,
      };
    },
    enabled: !!restaurantId,
  });

  return {
    category: "recipes",
    title: "Recipe & Costing Report",
    summary: query.data?.summary || {},
    chartData: query.data?.chartData,
    tableData: query.data?.tableData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function usePromotionsReport(
  restaurantId: string | null
): ReportData {
  const query = useQuery({
    queryKey: ["report-promotions", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: promotions, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      const formatted =
        promotions?.map((p) => ({
          Campaign: p.name,
          Code: p.promotion_code,
          Type: p.discount_type,
          Value:
            p.discount_type === "percentage"
              ? `${p.discount_value}%`
              : `₹${p.discount_value}`,
          "Min Spend": p.min_order_amount || 0,
          Status: p.is_active ? "Active" : "Inactive",
        })) || [];

      return {
        summary: {
          "Total Campaigns": promotions?.length || 0,
          "Active Campaigns":
            promotions?.filter((p) => p.is_active).length || 0,
        },
        chartData: promotions?.map((p) => ({
          name: p.name,
          value: Number(p.discount_value) || 0,
        })),
        tableData: formatted,
      };
    },
    enabled: !!restaurantId,
  });

  return {
    category: "promotions",
    title: "Promotions & Marketing Report",
    summary: query.data?.summary || {},
    chartData: query.data?.chartData,
    tableData: query.data?.tableData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
