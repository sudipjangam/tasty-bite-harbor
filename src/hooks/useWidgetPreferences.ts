import { useState, useEffect, useCallback } from "react";
import { DEFAULT_WIDGETS, MAX_WIDGETS } from "@/components/Dashboard/widgets/WidgetRegistry";

const STORAGE_KEY = "dashboard_widgets";

function getStorageKey(restaurantId: string, dashboardType: string) {
  return `${STORAGE_KEY}_${dashboardType}_${restaurantId}`;
}

export function useWidgetPreferences(
  restaurantId: string | null,
  dashboardType: string = "food-truck",
  defaultWidgets: string[] = DEFAULT_WIDGETS,
) {
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(() => {
    if (!restaurantId) return defaultWidgets;
    try {
      const saved = localStorage.getItem(getStorageKey(restaurantId, dashboardType));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultWidgets;
  });

  // Sync state when restaurantId or dashboardType changes
  useEffect(() => {
    if (!restaurantId) {
      setSelectedWidgets(defaultWidgets);
      return;
    }
    try {
      const saved = localStorage.getItem(getStorageKey(restaurantId, dashboardType));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedWidgets(parsed);
          return;
        }
      }
    } catch {}
    setSelectedWidgets(defaultWidgets);
  }, [restaurantId, dashboardType]);

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
    [restaurantId, dashboardType],
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
    [restaurantId, dashboardType],
  );

  const resetToDefaults = useCallback(() => {
    saveWidgets(defaultWidgets);
  }, [saveWidgets, defaultWidgets]);

  return { selectedWidgets, toggleWidget, saveWidgets, resetToDefaults };
}
