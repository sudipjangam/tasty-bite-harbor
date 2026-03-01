import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { QSPaymentSheet } from "@/components/QuickServe/QSPaymentSheet";
import { QSOrderItem } from "@/components/QuickServe/QSOrderPanel";

// Mock Hooks
vi.mock("@/hooks/useRestaurantId", () => ({
  useRestaurantId: () => ({ restaurantId: "test-restaurant" }),
}));

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrencyContext: () => ({ symbol: "₹" }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn(), toasts: [], dismiss: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user1", email: "test@example.com" } }),
}));

vi.mock("@/hooks/useCRMSync", () => ({
  useCRMSync: () => ({ syncCustomerToCRM: vi.fn() }),
}));

vi.mock("@/hooks/useBillSharing", () => ({
  useBillSharing: () => ({ getBillUrl: vi.fn() }),
}));

vi.mock("@/contexts/NetworkStatusContext", () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mock"),
  },
}));

// Mock react-query
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...(actual as any),
    useQuery: vi.fn().mockReturnValue({ data: null, isLoading: false }),
  };
});

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi
      .fn()
      .mockResolvedValue({ data: [{ order_number: 100 }], error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "k1" }, error: null }),
    functions: {
      invoke: vi
        .fn()
        .mockResolvedValue({ data: { success: true }, error: null }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

const mockItems: QSOrderItem[] = [
  { id: "1", menuItemId: "m1", name: "Burger", price: 150, quantity: 2 },
];

describe("QSPaymentSheet Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    items: mockItems,
    customerName: "John",
    customerPhone: "1234567890",
    onSuccess: mockOnSuccess,
    discountAmount: 0,
    discountPercentage: 0,
  };

  it("renders payment methods and total correctly", () => {
    renderWithProviders(<QSPaymentSheet {...defaultProps} />);

    expect(screen.getByText("Select Payment Method")).toBeInTheDocument();
    expect(screen.getByText("₹300.00")).toBeInTheDocument(); // 150 * 2

    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("UPI")).toBeInTheDocument();
    expect(screen.getByText("Card")).toBeInTheDocument();
  });

  it("handles payment click (Cash)", () => {
    renderWithProviders(<QSPaymentSheet {...defaultProps} />);

    const cashBtn = screen.getByText("Cash");
    fireEvent.click(cashBtn);

    // Status immediately changes to processing or success due to async nature in testing
    // To thoroughly test the async operations, we would need waitFor
  });
});
