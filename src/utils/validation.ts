/**
 * Priority validation utilities
 * Ensures type safety and runtime validation for order priorities
 */

export const VALID_PRIORITIES = ['normal', 'rush', 'vip'] as const;
export type Priority = typeof VALID_PRIORITIES[number];

/**
 * Type guard to check if value is a valid priority
 */
export function isValidPriority(value: unknown): value is Priority {
  return (
    typeof value === 'string' && 
    VALID_PRIORITIES.includes(value as Priority)
  );
}

/**
 * Validate and return priority, throw error if invalid
 */
export function validatePriority(value: unknown): Priority {
  if (!isValidPriority(value)) {
    throw new Error(
      `Invalid priority: "${value}". Must be one of: ${VALID_PRIORITIES.join(', ')}`
    );
  }
  return value;
}

/**
 * Priority display names for UI
 */
export const PRIORITY_LABELS: Record<Priority, string> = {
  normal: 'Normal',
  rush: 'Rush',
  vip: 'VIP',
};

/**
 * Priority colors for badges
 */
export const PRIORITY_COLORS: Record<Priority, string> = {
  normal: 'bg-gray-100 text-gray-800',
  rush: 'bg-orange-100 text-orange-800',
  vip: 'bg-purple-100 text-purple-800',
};
