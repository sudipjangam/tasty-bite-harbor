import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { QSOrderHistory } from "@/components/QuickServe/QSOrderHistory";

vi.mock("@/hooks/useRestaurantId", () => ({
  useRestaurantId: () => ({ restaurantId: "test-restaurant" }),
}));

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrencyContext: () => ({ symbol: "₹" }),
}));

const { mockPastOrders } = vi.hoisted(() => ({
  mockPastOrders: [
    {
      id: "o1",
      customer_name: "Alice",
      customer_phone: "1112223334",
      items: ["2x Burger @150"],
      total: 300,
      status: "completed",
      payment_status: "paid",
      created_at: new Date().toISOString(),
    },
  ],
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...(actual as any),
    useQuery: vi.fn(({ queryKey }) => {
      if (queryKey[0] === "quickserve-order-history") {
        return { data: mockPastOrders, isLoading: false };
      }
      return { data: [], isLoading: false };
    }),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: mockPastOrders, error: null }),
  },
}));

describe("QSOrderHistory Component", () => {
  const mockOnClose = vi.fn();
  const mockOnRecallOrder = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onRecallOrder: mockOnRecallOrder,
  };

  it("renders orders correctly", () => {
    renderWithProviders(<QSOrderHistory {...defaultProps} />);

    expect(screen.getByText("Today's Orders")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getAllByText("₹300.00").length).toBeGreaterThan(0);
  });

  it("expands order to show details and allows recalling", () => {
    renderWithProviders(<QSOrderHistory {...defaultProps} />);

    // Click on the order summary to expand
    fireEvent.click(screen.getByText("Alice"));

    // Check if details are shown
    expect(screen.getByText("Burger")).toBeInTheDocument();

    // Click repeat order
    const repeatBtn = screen.getByText("Repeat This Order");
    fireEvent.click(repeatBtn);

    expect(mockOnRecallOrder).toHaveBeenCalledWith(
      [{ name: "Burger", quantity: 2, price: 150 }],
      "Alice",
      "1112223334",
    );
    expect(mockOnClose).toHaveBeenCalled();
  });
});
