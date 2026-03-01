import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { QSRActiveOrdersDrawer } from "@/components/QSR/QSRActiveOrdersDrawer";
import { ActiveKitchenOrder } from "@/types/qsr";

const mockOrders: ActiveKitchenOrder[] = [
  {
    id: "1",
    source: "QSR-Table 1",
    status: "preparing",
    items: [
      { name: "Burger", quantity: 2, price: 150 },
      { name: "Fries", quantity: 1, price: 80 },
    ],
    orderType: "dine_in",
    customerName: "Table 1",
    serverName: "John",
    priority: "normal",
    createdAt: new Date().toISOString(),
    itemCompletionStatus: [true, false],
    total: 380,
  },
  {
    id: "2",
    source: "QSR-Takeaway",
    status: "ready",
    items: [{ name: "Pizza", quantity: 1, price: 250 }],
    orderType: "takeaway",
    customerName: "Takeaway",
    serverName: "Jane",
    priority: "rush",
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
    itemCompletionStatus: [true],
    total: 250,
  },
];

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

describe("QSRActiveOrdersDrawer Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSearchChange = vi.fn();
  const mockOnDateFilterChange = vi.fn();
  const mockOnStatusFilterChange = vi.fn();
  const mockOnRecallOrder = vi.fn();
  const mockOnProceedToPayment = vi.fn();
  const mockOnToggleItemCompletion = vi.fn().mockResolvedValue(true);
  const mockOnDeleteOrder = vi.fn();
  const mockOnPriorityChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    orders: mockOrders,
    searchQuery: "",
    onSearchChange: mockOnSearchChange,
    dateFilter: "today" as const,
    onDateFilterChange: mockOnDateFilterChange,
    statusFilter: "all" as const,
    onStatusFilterChange: mockOnStatusFilterChange,
    onRecallOrder: mockOnRecallOrder,
    onProceedToPayment: mockOnProceedToPayment,
    onToggleItemCompletion: mockOnToggleItemCompletion,
    onDeleteOrder: mockOnDeleteOrder,
    onPriorityChange: mockOnPriorityChange,
    restaurantName: "Test Restaurant",
  };

  it("renders correctly when open", () => {
    renderWithProviders(<QSRActiveOrdersDrawer {...defaultProps} />);

    expect(screen.getByText("Active Kitchen Orders")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search orders...")).toBeInTheDocument();

    // Check if orders are rendered
    expect(screen.getByText("Table 1")).toBeInTheDocument();
    expect(screen.getByText("Takeaway")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderWithProviders(
      <QSRActiveOrdersDrawer {...defaultProps} isOpen={false} />,
    );

    expect(screen.queryByText("Active Kitchen Orders")).not.toBeInTheDocument();
  });

  it("handles search input", () => {
    renderWithProviders(<QSRActiveOrdersDrawer {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Search orders...");
    fireEvent.change(searchInput, { target: { value: "Burger" } });

    expect(mockOnSearchChange).toHaveBeenCalledWith("Burger");
  });

  it("handles date filter clicks", () => {
    renderWithProviders(<QSRActiveOrdersDrawer {...defaultProps} />);

    fireEvent.click(screen.getByText("Yesterday"));
    expect(mockOnDateFilterChange).toHaveBeenCalledWith("yesterday");
  });

  it("renders loading state", () => {
    renderWithProviders(
      <QSRActiveOrdersDrawer {...defaultProps} isLoading={true} orders={[]} />,
    );

    expect(screen.getByText("Loading orders...")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    renderWithProviders(
      <QSRActiveOrdersDrawer {...defaultProps} orders={[]} />,
    );

    expect(screen.getByText("No orders found")).toBeInTheDocument();
  });

  it("calls recall order when recall button is clicked", () => {
    renderWithProviders(<QSRActiveOrdersDrawer {...defaultProps} />);

    const recallButtons = screen.getAllByText("Recall");
    fireEvent.click(recallButtons[0]);

    expect(mockOnRecallOrder).toHaveBeenCalledTimes(1);
    expect(mockOnRecallOrder).toHaveBeenCalledWith(mockOrders[0]);
  });

  it("calls delete order when delete button is clicked", () => {
    renderWithProviders(<QSRActiveOrdersDrawer {...defaultProps} />);

    const deleteButtons = screen.getAllByTitle("Delete Order");
    fireEvent.click(deleteButtons[0]);

    expect(mockOnDeleteOrder).toHaveBeenCalledTimes(1);
    expect(mockOnDeleteOrder).toHaveBeenCalledWith(mockOrders[0]);
  });
});
