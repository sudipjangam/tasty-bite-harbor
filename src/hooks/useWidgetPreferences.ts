import { useState, useCallback } from "react";
import { DEFAULT_WIDGETS, MAX_WIDGETS } from "@/components/Dashboard/widgets/WidgetRegistry";

const STORAGE_KEY = "dashboard_widgets";

function getStorageKey(restaurantId: string, dashboardType: string) {
  return `${STORAGE_KEY}_${dashboardType}_${restaurantId}`;
}

export function useWidgetPreferences(restaurantId: string | null, dashboardType: string = "food-truck") {
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(() => {
    if (!restaurantId) return DEFAULT_WIDGETS;
    try {
      const saved = localStorage.getItem(getStorageKey(restaurantId, dashboardType));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_WIDGETS;
  });

  const saveWidgets = useCallback(
    (widgets: string[]) => {
      setSelectedWidgets(widgets);
      if (restaurantId) {
        localStorage.setItem(
          getStorageKey(restaurantId, dashboardType),
          JSON.stringify(widgets),
        );
      }
    },
    [restaurantId],
  );

  const toggleWidget = useCallback(
    (widgetId: string) => {
      setSelectedWidgets((prev) => {
        let next: string[];
        if (prev.includes(widgetId)) {
          next = prev.filter((id) => id !== widgetId);
        } else {
          if (prev.length >= MAX_WIDGETS) return prev;
          next = [...prev, widgetId];
        }
        if (restaurantId) {
          localStorage.setItem(
            getStorageKey(restaurantId, dashboardType),
            JSON.stringify(next),
          );
        }
        return next;
      });
    },
    [restaurantId],
  );

  const resetToDefaults = useCallback(() => {
    saveWidgets(DEFAULT_WIDGETS);
  }, [saveWidgets]);

  return { selectedWidgets, toggleWidget, saveWidgets, resetToDefaults };
}
