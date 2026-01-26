// NC (Non-Chargeable) Order Constants
// Standardized reasons for marking orders as non-chargeable

export const NC_REASONS = {
  STAFF_MEAL: "staff_meal",
  PROMOTIONAL: "promotional",
  VIP_GUEST: "vip_guest",
  COMPLAINT: "complaint",
  MANAGEMENT: "management",
  EVENT: "event",
  OTHER: "other",
} as const;

export const NC_REASON_LABELS: Record<string, string> = {
  [NC_REASONS.STAFF_MEAL]: "Staff Meal",
  [NC_REASONS.PROMOTIONAL]: "Promotional",
  [NC_REASONS.VIP_GUEST]: "VIP Guest",
  [NC_REASONS.COMPLAINT]: "Complaint Resolution",
  [NC_REASONS.MANAGEMENT]: "Management Discretion",
  [NC_REASONS.EVENT]: "Event/Catering",
  [NC_REASONS.OTHER]: "Other  ",
};

export const NC_REASON_OPTIONS = Object.entries(NC_REASON_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  })
);

export type NCReason = (typeof NC_REASONS)[keyof typeof NC_REASONS];
