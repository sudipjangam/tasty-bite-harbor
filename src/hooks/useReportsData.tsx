/**
 * useReportsData Facade Hook
 * 
 * Orchestrates domain-specific report queries:
 * - Orders & Sales (useOrderReports)
 * - Menu & Items (useMenuReports)
 * - Inventory & Suppliers (useInventoryReports)
 * - Customers & Frequency (useCustomerReports)
 * - Financial, Staff, Rooms, Recipes & Promotions (useFinancialReports)
 */

import { subDays, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { useRestaurantId } from "./useRestaurantId";
import { type BusinessCategory, isReportCategoryVisible } from "./usePlanType";

import {
  ReportCategory,
  CategoryReportConfig,
  REPORT_CATEGORIES,
  PayLaterOrderSummary,
  ReportData,
} from "./reports/types";

import { useOrderReport } from "./reports/useOrderReports";
import { useMenuReport } from "./reports/useMenuReports";
import {
  useInventoryReport,
  useSuppliersReport,
} from "./reports/useInventoryReports";
import {
  useCustomerReport,
  useRepeatCustomersReport,
} from "./reports/useCustomerReports";
import {
  useStaffReport,
  useExpensesReport,
  useRoomsReport,
  useRecipesReport,
  usePromotionsReport,
} from "./reports/useFinancialReports";

export type { ReportCategory, CategoryReportConfig, PayLaterOrderSummary, ReportData };
export { REPORT_CATEGORIES };

export const getFilteredReportCategories = (businessCategory?: BusinessCategory): CategoryReportConfig[] => {
  return REPORT_CATEGORIES.filter((cat) =>
    isReportCategoryVisible(cat.id, businessCategory)
  );
};

export const useReportsData = (
  dateRange?: DateRange,
  businessCategory?: BusinessCategory
) => {
  const { restaurantId } = useRestaurantId();

  const startDate = dateRange?.from
    ? startOfDay(dateRange.from).toISOString()
    : startOfDay(subDays(new Date(), 30)).toISOString();
  const endDate = dateRange?.to
    ? endOfDay(dateRange.to).toISOString()
    : endOfDay(new Date()).toISOString();

  const orders = useOrderReport(restaurantId, startDate, endDate);
  const menu = useMenuReport(restaurantId, startDate, endDate);
  const inventory = useInventoryReport(restaurantId);
  const customers = useCustomerReport(restaurantId);
  const staff = useStaffReport(restaurantId, startDate, endDate);
  const suppliers = useSuppliersReport(restaurantId);
  const expenses = useExpensesReport(restaurantId, startDate, endDate);
  const rooms = useRoomsReport(restaurantId, startDate, endDate);
  const recipes = useRecipesReport(restaurantId);
  const promotions = usePromotionsReport(restaurantId);
  const repeatCustomers = useRepeatCustomersReport(
    restaurantId,
    startDate,
    endDate
  );

  const reports: Record<ReportCategory, ReportData> = {
    orders,
    menu,
    inventory,
    customers,
    staff,
    suppliers,
    expenses,
    rooms,
    recipes,
    promotions,
    repeat_customers: repeatCustomers,
  };

  const getReport = (category: ReportCategory): ReportData => {
    return reports[category];
  };

  const allReports = Object.values(reports);
  const isLoading = allReports.some((r) => r.isLoading);
  const hasError = allReports.some((r) => r.error !== null);

  const visibleCategories = REPORT_CATEGORIES.filter((cat) =>
    isReportCategoryVisible(cat.id, businessCategory)
  );

  return {
    reports,
    getReport,
    isLoading,
    hasError,
    categories: visibleCategories,
    allCategories: REPORT_CATEGORIES,
  };
};

export default useReportsData;
