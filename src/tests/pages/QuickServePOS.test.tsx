import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../utils/test-utils";
import QuickServePOS from "@/pages/QuickServePOS";

// Mock Hooks
vi.mock("@/hooks/useRestaurantId", () => ({
  useRestaurantId: () => ({ restaurantId: "test-restaurant-id" }),
}));

vi.mock("@/hooks/useQSRMenuItems", () => ({
  useQSRMenuItems: () => ({
    menuItems: [
      {
        id: "m1",
        name: "Burger",
        price: 150,
        categoryId: "c1",
        isAvailable: true,
      },
    ],
    categories: [{ id: "c1", name: "Fast Food" }],
    isLoading: false,
    soldOutCount: 0,
    toggleAvailability: vi.fn(),
    restoreAllItems: vi.fn(),
    isToggling: false,
    isRestoring: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn(), toasts: [], dismiss: vi.fn() }),
}));

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrencyContext: () => ({ symbol: "₹" }),
}));

// Mock react-query
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...(actual as any),
    useQuery: vi.fn(({ queryKey }) => {
      if (queryKey[0] === "quickserve-todays-revenue") return { data: 500 };
      if (queryKey[0] === "quickserve-todays-count") return { data: 5 };
      return { data: null };
    }),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

// Mock child components to verify interactions
vi.mock("@/components/QuickServe/QSMenuGrid", () => ({
  QSMenuGrid: ({ onAddItem }: any) => (
    <div data-testid="qs-menu-grid">
      <button
        onClick={() => onAddItem({ id: "m1", name: "Burger", price: 150 })}
      >
        Add Burger
      </button>
    </div>
  ),
}));

vi.mock("@/components/QuickServe/QSOrderPanel", () => ({
  QSOrderPanel: ({ items, onProceedToPayment, onClear }: any) => (
    <div data-testid="qs-order-panel">
      <div>Order Items: {items.length}</div>
      <button onClick={onProceedToPayment}>Pay</button>
      <button onClick={onClear}>Clear</button>
    </div>
  ),
}));

vi.mock("@/components/QuickServe/QSActiveOrders", () => ({
  QSActiveOrders: ({ isOpen }: any) =>
    isOpen ? <div data-testid="active-orders-drawer" /> : null,
}));

vi.mock("@/components/QuickServe/QSOrderHistory", () => ({
  QSOrderHistory: ({ isOpen }: any) =>
    isOpen ? <div data-testid="history-drawer" /> : null,
}));

vi.mock("@/components/QuickServe/DailySummaryDialog", () => ({
  DailySummaryDialog: ({ isOpen }: any) =>
    isOpen ? <div data-testid="end-day-dialog" /> : null,
}));

vi.mock("@/components/QuickServe/QSPaymentSheet", () => ({
  QSPaymentSheet: ({ isOpen, onSuccess }: any) =>
    isOpen ? (
      <div data-testid="payment-sheet">
        <button onClick={onSuccess}>Complete Payment</button>
      </div>
    ) : null,
}));

describe("QuickServePOS Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header with live stats", () => {
    renderWithProviders(<QuickServePOS />);

    expect(screen.getByText("QuickServe")).toBeInTheDocument();

    // Check mocked stats
    expect(screen.getByText("5")).toBeInTheDocument(); // todaysOrderCount
    expect(screen.getByText("₹500")).toBeInTheDocument(); // todaysRevenue
  });

  it("allows adding items to the order", () => {
    renderWithProviders(<QuickServePOS />);

    expect(screen.getByText("Order Items: 0")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Add Burger"));

    expect(screen.getByText("Order Items: 1")).toBeInTheDocument();
  });

  it("clears order items when clear is clicked", () => {
    renderWithProviders(<QuickServePOS />);

    fireEvent.click(screen.getByText("Add Burger"));
    expect(screen.getByText("Order Items: 1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Clear"));
    expect(screen.getByText("Order Items: 0")).toBeInTheDocument();
  });

  it("tangles Active Orders panel state", () => {
    renderWithProviders(<QuickServePOS />);

    expect(
      screen.queryByTestId("active-orders-drawer"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Active"));

    expect(screen.getByTestId("active-orders-drawer")).toBeInTheDocument();
  });

  it("tangles History panel state", () => {
    renderWithProviders(<QuickServePOS />);

    expect(screen.queryByTestId("history-drawer")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("History"));

    expect(screen.getByTestId("history-drawer")).toBeInTheDocument();
  });

  it("tangles End Day panel state", () => {
    renderWithProviders(<QuickServePOS />);

    expect(screen.queryByTestId("end-day-dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("End Day"));

    expect(screen.getByTestId("end-day-dialog")).toBeInTheDocument();
  });

  it("opens payment sheet and handles success", () => {
    renderWithProviders(<QuickServePOS />);

    fireEvent.click(screen.getByText("Add Burger"));
    expect(screen.getByText("Order Items: 1")).toBeInTheDocument();

    expect(screen.queryByTestId("payment-sheet")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Pay"));
    expect(screen.getByTestId("payment-sheet")).toBeInTheDocument();

    // Complete Payment
    fireEvent.click(screen.getByText("Complete Payment"));

    expect(screen.queryByTestId("payment-sheet")).not.toBeInTheDocument();
    expect(screen.getByText("Order Items: 0")).toBeInTheDocument(); // cart cleared
  });
});
