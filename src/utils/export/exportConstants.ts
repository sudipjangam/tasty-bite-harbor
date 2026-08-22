import { sanitizeOrderItemDisplay } from "@/lib/order-utils";

export const BRAND_ORANGE = "F17A28";
export const BRAND_BLUE = "2B579A";
export const BRAND_LIGHT = "F9F9F9";
export const TEXT_DARK = "333333";
export const TEXT_MUTED = "777777";

export const formatColumnName = (key: string) => {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Id$/i, "ID");
};

export const formatCellValue = (value: unknown): string | number => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          try {
            const parsed = JSON.parse(item);
            return parsed.name
              ? `${parsed.quantity || 1}x ${sanitizeOrderItemDisplay(parsed.name)}`
              : item;
          } catch {
            return item;
          }
        }
        return item?.name
          ? `${item.quantity || 1}x ${sanitizeOrderItemDisplay(item.name)}`
          : JSON.stringify(item);
      })
      .join(", ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value).substring(0, 100);
    } catch {
      return "-";
    }
  }
  return String(value);
};

export const HIDDEN_COLUMNS = [
  "id",
  "restaurant_id",
  "created_by",
  "updated_at",
  "created_at",
];

export const getDisplayColumns = (data: Record<string, unknown>[]) => {
  if (data.length === 0) return [];
  return Object.keys(data[0]).filter(
    (key) =>
      !HIDDEN_COLUMNS.includes(key.toLowerCase()) &&
      !key.toLowerCase().endsWith("_id"),
  );
};
