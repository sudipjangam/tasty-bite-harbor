import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { DailySummaryDialog } from "@/components/QuickServe/DailySummaryDialog";

// Mock Hooks
vi.mock("@/hooks/useRestaurantId", () => ({
  useRestaurantId: () => ({
    restaurantId: "test-restaurant",
    restaurantName: "Test Truck",
  }),
}));

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrencyContext: () => ({ symbol: "₹" }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn(), toasts: [], dismiss: vi.fn() }),
}));

// Provide some mock summary data so we don't need to mock tanstack Query fully
const mockSummaryData = {
  totalOrders: 15,
  totalRevenue: 3500,
  totalItemsSold: 32,
  paymentBreakdown: { cash: 1500, upi: 2000, card: 0, other: 0 },
  topItems: [
    { name: "Burger", quantity: 10, revenue: 1500 },
    { name: "Pizza", quantity: 8, revenue: 2000 },
  ],
  orderTypeBreakdown: { counter: 5, takeaway: 10, delivery: 0, dine_in: 0 },
  ncOrders: 1,
  ncAmount: 150,
  discountAmount: 100,
  averageOrderValue: 233,
  peakHour: "1:00 PM",
  totalExpenses: 500,
  expenseBreakdown: { ingredients: 500 },
  netProfit: 3000,
};

describe("DailySummaryDialog Component", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly when open with initial data", () => {
    renderWithProviders(
      <DailySummaryDialog
        isOpen={true}
        onClose={mockOnClose}
        initialData={mockSummaryData as any}
        reportDate={new Date("2026-03-01T12:00:00Z")}
      />,
    );

    expect(screen.getByText("Daily Summary")).toBeInTheDocument();

    // Check main metrics
    expect(screen.getByText("15")).toBeInTheDocument(); // totalOrders
    expect(screen.getByText("₹3500.00")).toBeInTheDocument(); // totalRevenue
    expect(screen.getByText("₹233")).toBeInTheDocument(); // averageOrderValue
    expect(screen.getByText("1:00 PM")).toBeInTheDocument(); // peakHour

    // Check Payment Breakdown
    expect(screen.getByText("cash")).toBeInTheDocument();
    expect(screen.getByText("₹1500.00")).toBeInTheDocument();
    expect(screen.getByText("upi")).toBeInTheDocument();
    expect(screen.getByText("₹2000.00")).toBeInTheDocument();

    // Check Top Items
    expect(screen.getByText("🏆 Top Items")).toBeInTheDocument();
    expect(screen.getByText(/1\. Burger/)).toBeInTheDocument();
    expect(screen.getByText("×10")).toBeInTheDocument();

    // Check P&L
    expect(screen.getByText("Profit & Loss")).toBeInTheDocument();
    expect(screen.getByText("+₹3500.00")).toBeInTheDocument(); // Revenue
    expect(screen.getByText("-₹500.00")).toBeInTheDocument(); // Expenses
    expect(screen.getByText("₹3000.00")).toBeInTheDocument(); // Net Profit

    // Buttons
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderWithProviders(
      <DailySummaryDialog isOpen={false} onClose={mockOnClose} />,
    );
    expect(screen.queryByText("Daily Summary")).not.toBeInTheDocument();
  });

  it("calls share Whatsapp when share is clicked (using window.open)", () => {
    // Spy on window.open
    const openSpy = vi.fn();
    global.window.open = openSpy;

    renderWithProviders(
      <DailySummaryDialog
        isOpen={true}
        onClose={mockOnClose}
        initialData={mockSummaryData as any}
        reportDate={new Date("2026-03-01T12:00:00Z")}
      />,
    );

    const shareBtn = screen.getByText("Share");
    fireEvent.click(shareBtn);

    expect(openSpy).toHaveBeenCalled();
    expect(openSpy.mock.calls[0][0]).toContain("wa.me");
    expect(openSpy.mock.calls[0][0]).toContain("Test%20Truck"); // truckName encoded
  });
});
