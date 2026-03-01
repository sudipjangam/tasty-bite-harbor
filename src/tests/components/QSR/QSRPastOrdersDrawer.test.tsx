import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { QSRPastOrdersDrawer } from "@/components/QSR/QSRPastOrdersDrawer";
import { PastOrder } from "@/hooks/usePastOrders";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user", role: "admin" },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
    toasts: [],
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrencyContext: () => ({
    symbol: "₹",
  }),
}));

const mockPastOrders: PastOrder[] = [
  {
    id: "1",
    source: "QSR-Table 1",
    status: "completed",
    items: [{ name: "Burger", quantity: 2, price: 150 }],
    orderType: "dine_in",
    customerName: "Table 1",
    serverName: "John",
    priority: "normal",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    total: 300,
    subtotal: 300,
    attendant: "John",
    discount: 0,
    discountType: "percentage",
  },
];

describe("QSRPastOrdersDrawer Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSearchChange = vi.fn();
  const mockOnDateFilterChange = vi.fn();
  const mockOnDeleteOrder = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    orders: mockPastOrders,
    searchQuery: "",
    onSearchChange: mockOnSearchChange,
    dateFilter: "today" as const,
    onDateFilterChange: mockOnDateFilterChange,
    onDeleteOrder: mockOnDeleteOrder,
    restaurantName: "Test Restaurant",
  };

  it("renders correctly when open", () => {
    renderWithProviders(<QSRPastOrdersDrawer {...defaultProps} />);

    expect(screen.getByText("Past Orders / Bill History")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search past orders..."),
    ).toBeInTheDocument();

    expect(screen.getByText("Table 1")).toBeInTheDocument();
  });

  it("handles search input", () => {
    renderWithProviders(<QSRPastOrdersDrawer {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Search past orders...");
    fireEvent.change(searchInput, { target: { value: "Burger" } });

    expect(mockOnSearchChange).toHaveBeenCalledWith("Burger");
  });

  it("displays total stats correctly", () => {
    renderWithProviders(<QSRPastOrdersDrawer {...defaultProps} />);

    expect(screen.getByText("Total Orders")).toBeInTheDocument();
    expect(screen.getAllByText("1")[0]).toBeInTheDocument(); // 1 order
    expect(screen.getAllByText(/300/)[0]).toBeInTheDocument(); // Total revenue
  });

  it("calls delete order when delete button is clicked", () => {
    renderWithProviders(<QSRPastOrdersDrawer {...defaultProps} />);

    const deleteButtons = screen.getAllByTitle("Delete Order");
    fireEvent.click(deleteButtons[0]);

    expect(mockOnDeleteOrder).toHaveBeenCalledTimes(1);
    expect(mockOnDeleteOrder).toHaveBeenCalledWith(mockPastOrders[0]);
  });
});
