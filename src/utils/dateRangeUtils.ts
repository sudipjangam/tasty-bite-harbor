/**
 * Shared date range utility for consistent date filtering across hooks
 * Eliminates duplication in usePastOrders, useActiveKitchenOrders, useReportsData
 */

export type DateFilter =
  | "today"
  | "yesterday"
  | "last7days"
  | "thisMonth"
  | "custom";

export interface DateRange {
  start: string;
  end: string;
}

/**
 * Calculate date range based on filter (using UTC to match database timestamps)
 */
export const getDateRange = (
  filter: DateFilter,
  customStartDate?: Date | null,
  customEndDate?: Date | null
): DateRange => {
  const now = new Date();
  // Use UTC dates to match database timestamps
  const todayStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0
    )
  );
  const todayEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  switch (filter) {
    case "today":
      return { start: todayStart.toISOString(), end: todayEnd.toISOString() };

    case "yesterday": {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
      const yesterdayEnd = new Date(todayStart);
      yesterdayEnd.setUTCMilliseconds(-1);
      return {
        start: yesterdayStart.toISOString(),
        end: yesterdayEnd.toISOString(),
      };
    }

    case "last7days": {
      const weekAgoStart = new Date(todayStart);
      weekAgoStart.setUTCDate(weekAgoStart.getUTCDate() - 7);
      return {
        start: weekAgoStart.toISOString(),
        end: todayEnd.toISOString(),
      };
    }

    case "thisMonth": {
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
      );
      return { start: monthStart.toISOString(), end: todayEnd.toISOString() };
    }

    case "custom": {
      if (customStartDate && customEndDate) {
        const customStart = new Date(
          Date.UTC(
            customStartDate.getFullYear(),
            customStartDate.getMonth(),
            customStartDate.getDate(),
            0,
            0,
            0
          )
        );
        const customEnd = new Date(
          Date.UTC(
            customEndDate.getFullYear(),
            customEndDate.getMonth(),
            customEndDate.getDate(),
            23,
            59,
            59,
            999
          )
        );
        return {
          start: customStart.toISOString(),
          end: customEnd.toISOString(),
        };
      }
      // Fallback to today if custom dates not set
      return { start: todayStart.toISOString(), end: todayEnd.toISOString() };
    }

    default:
      return { start: todayStart.toISOString(), end: todayEnd.toISOString() };
  }
};
