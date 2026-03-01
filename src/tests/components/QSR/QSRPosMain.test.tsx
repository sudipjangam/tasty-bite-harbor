import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { QSRPosMain } from "@/components/QSR/QSRPosMain";

// Mock the child components to simplify testing of the main container
vi.mock("@/components/QSR/QSRModeSelector", () => ({
  QSRModeSelector: ({ selectedMode, onModeChange }: any) => (
    <div data-testid="qsr-mode-selector">
      <button onClick={() => onModeChange("dine_in")}>Dine In</button>
      <button onClick={() => onModeChange("takeaway")}>Takeaway</button>
      <button onClick={() => onModeChange("delivery")}>Delivery</button>
      <span data-testid="current-mode">{selectedMode}</span>
    </div>
  ),
}));

vi.mock("@/components/QSR/QSRMenuGrid", () => ({
  QSRMenuGrid: ({ onAddItem }: any) => (
    <div data-testid="qsr-menu-grid">
      <button
        onClick={() =>
          onAddItem({ id: "1", name: "Burger", price: 10, category: "Food" })
        }
      >
        Add Burger
      </button>
    </div>
  ),
}));

vi.mock("@/components/QSR/QSRTableGrid", () => ({
  QSRTableGrid: ({ onSelectTable }: any) => (
    <div data-testid="qsr-table-grid">
      <button
        onClick={() =>
          onSelectTable({ id: "t1", name: "Table 1", status: "available" })
        }
      >
        Table 1
      </button>
    </div>
  ),
}));

vi.mock("@/components/QSR/QSROrderPad", () => ({
  QSROrderPad: ({ items, onClearOrder }: any) => (
    <div data-testid="qsr-order-pad">
      <span data-testid="cart-count">{(items || []).length}</span>
      <button onClick={onClearOrder}>Clear</button>
    </div>
  ),
}));

vi.mock("@/components/QSR/QSRActiveOrdersDrawer", () => ({
  QSRActiveOrdersDrawer: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="active-orders-drawer">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/components/QSR/QSRPastOrdersDrawer", () => ({
  QSRPastOrdersDrawer: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="past-orders-drawer">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Mock hooks
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "test-user",
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
    },
    loading: false,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    isRole: () => true,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useRestaurantId", () => ({
  useRestaurantId: () => ({ restaurantId: "test-restaurant" }),
}));

vi.mock("@/hooks/useQSRMenuItems", () => ({
  useQSRMenuItems: () => ({
    menuItems: [{ id: "1", name: "Burger", price: 10, category: "Food" }],
    categories: ["Food"],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useQSRTables", () => ({
  useQSRTables: () => ({
    tables: [{ id: "t1", name: "Table 1", status: "available" }],
    isLoading: false,
    refetch: vi.fn(),
    updateTableStatus: vi.fn(),
  }),
}));

vi.mock("@/hooks/useActiveKitchenOrders", () => ({
  useActiveKitchenOrders: () => ({
    orders: [],
    isLoading: false,
    searchQuery: "",
    setSearchQuery: vi.fn(),
    dateFilter: "today",
    setDateFilter: vi.fn(),
    statusFilter: "all",
    setStatusFilter: vi.fn(),
    toggleItemCompletion: vi.fn(),
    handlePriorityChange: vi.fn(),
  }),
}));

vi.mock("@/hooks/usePastOrders", () => ({
  usePastOrders: () => ({
    orders: [],
    isLoading: false,
    searchQuery: "",
    setSearchQuery: vi.fn(),
    dateFilter: "today",
    setDateFilter: vi.fn(),
    customStartDate: null,
    setCustomStartDate: vi.fn(),
    customEndDate: null,
    setCustomEndDate: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { name: "Test Restaurant" } }),
    })),
  },
}));

describe("QSRPosMain Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the main layout correctly", () => {
    renderWithProviders(<QSRPosMain />);

    expect(screen.getByTestId("qsr-mode-selector")).toBeInTheDocument();
    // Initially dine_in mode without a selected table => shows table grid, not menu grid
    expect(screen.getByTestId("qsr-table-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("qsr-menu-grid")).not.toBeInTheDocument();
    expect(screen.getByTestId("qsr-order-pad")).toBeInTheDocument();
  });

  it("handles switching between order modes", () => {
    renderWithProviders(<QSRPosMain />);

    const currentMode = screen.getByTestId("current-mode");
    expect(currentMode).toHaveTextContent("dine_in");

    fireEvent.click(screen.getByText("Takeaway"));
    expect(currentMode).toHaveTextContent("takeaway");
    // After switching to takeaway, menu grid should be visible
    expect(screen.getByTestId("qsr-menu-grid")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Delivery"));
    expect(currentMode).toHaveTextContent("delivery");
  });

  it("opens and closes Active Orders drawer", () => {
    renderWithProviders(<QSRPosMain />);

    // Initially not present
    expect(
      screen.queryByTestId("active-orders-drawer"),
    ).not.toBeInTheDocument();

    // Open drawer
    const activeButton = screen.getByText("Active Orders"); // The button has text "Active Orders"
    fireEvent.click(activeButton);
    expect(screen.getByTestId("active-orders-drawer")).toBeInTheDocument();

    // Close drawer
    fireEvent.click(screen.getByText("Close"));
    expect(
      screen.queryByTestId("active-orders-drawer"),
    ).not.toBeInTheDocument();
  });

  it("handles adding items to order pad", () => {
    renderWithProviders(<QSRPosMain />);

    const cartCount = screen.getByTestId("cart-count");
    expect(cartCount).toHaveTextContent("0");

    // Switch to Takeaway mode so Menu Grid is visible
    fireEvent.click(screen.getByText("Takeaway"));

    // Now add the item
    fireEvent.click(screen.getByText("Add Burger"));
    expect(cartCount).toHaveTextContent("1");

    fireEvent.click(screen.getByText("Clear"));
    expect(cartCount).toHaveTextContent("0");
  });
});
