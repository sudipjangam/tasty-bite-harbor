import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { QSPaymentSheet } from "@/components/QuickServe/QSPaymentSheet";
import { QSOrderItem } from "@/components/QuickServe/QSOrderPanel";
import QuickServePOS from "@/pages/QuickServePOS";

const mockEnqueueWrite = vi.fn().mockResolvedValue("q-1");
const mockSaveLocalOrder = vi.fn().mockResolvedValue(undefined);
const mockGetLocalOrdersByRestaurant = vi.fn().mockResolvedValue([]);
const mockGetLocalOrder = vi.fn().mockResolvedValue(undefined);
const mockGetCachedRestaurant = vi.fn().mockResolvedValue({
  id: "rest-qs-1",
  name: "Tasty QuickServe",
  address: "Main Road",
  phone: "9998887776",
  gstin: "27ABCDE1234F1Z5",
  upi_id: "qs@upi",
});
const mockGetCachedPaymentSettings = vi.fn().mockResolvedValue({
  restaurant_id: "rest-qs-1",
  upi_id: "qs@upi",
  upi_name: "Tasty QuickServe",
});
const mockPrintReceipt = vi.fn().mockResolvedValue(undefined);
const mockPrintKOT = vi.fn().mockResolvedValue(undefined);
let mockIsPrinterConnected = false;

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrencyContext: () => ({
    symbol: "₹",
    code: "INR",
    formatCurrency: (amt: number) => `₹${amt.toFixed(2)}`,
    formatCurrencyCompact: (amt: number) => `₹${amt}`,
  }),
  useOptionalCurrencyContext: () => ({
    symbol: "₹",
    code: "INR",
  }),
}));

vi.mock("@/contexts/NetworkStatusContext", () => ({
  useNetworkStatus: () => ({
    isOnline: false,
    pendingCount: 0,
    triggerSync: vi.fn(),
    refreshCount: vi.fn(),
  }),
}));

vi.mock("@/hooks/useRestaurantId", () => ({
  useRestaurantId: () => ({
    restaurantId: "rest-qs-1",
    restaurantName: "Tasty QuickServe",
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "staff-1",
      email: "cashier@example.com",
      first_name: "Aman",
      last_name: "Verma",
      role_has_full_access: true,
    },
    isRole: () => true,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn(), toasts: [], dismiss: vi.fn() }),
}));

vi.mock("@/hooks/useCRMSync", () => ({
  useCRMSync: () => ({ syncCustomerToCRM: vi.fn().mockResolvedValue(null) }),
}));

vi.mock("@/hooks/useBillSharing", () => ({
  useBillSharing: () => ({ getBillUrl: vi.fn().mockResolvedValue(null) }),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockqr"),
  },
}));

vi.mock("@/utils/syncManager", () => ({
  enqueueWrite: (...args: any[]) => mockEnqueueWrite(...args),
  allocateOfflineQuickServeToken: () => 42,
  recordQuickServeOrderNumber: vi.fn(),
}));

vi.mock("@/utils/offlineDB", () => ({
  getCachedRestaurant: (...args: any[]) => mockGetCachedRestaurant(...args),
  getCachedPaymentSettings: (...args: any[]) =>
    mockGetCachedPaymentSettings(...args),
  getLocalOrder: (...args: any[]) => mockGetLocalOrder(...args),
  getLocalOrdersByRestaurant: (...args: any[]) =>
    mockGetLocalOrdersByRestaurant(...args),
  saveLocalOrder: (...args: any[]) => mockSaveLocalOrder(...args),
  commitLocalOrderAndWritesAtomic: async (order: any, writes: any[]) => {
    if (order) await mockSaveLocalOrder(order);
    for (const w of writes) {
      await mockEnqueueWrite(w.type, w.payload, w.operation ?? "insert");
    }
  },
  LOCAL_ORDERS_EVENT: "swadeshi:local-orders-changed",
  SYNC_COMPLETED_EVENT: "swadeshi:sync-completed",
}));

vi.mock("@/services/thermalPrinterService", () => ({
  thermalPrinterService: {
    isConnected: () => mockIsPrinterConnected,
    onConnectionChange: () => () => {},
    tryAutoReconnect: vi.fn().mockResolvedValue(false),
    printReceipt: (...args: any[]) => mockPrintReceipt(...args),
    printKOT: (...args: any[]) => mockPrintKOT(...args),
  },
}));

vi.mock("@/services/nativePrinterBridge", () => ({
  nativePrinterBridge: {
    isConnected: () => mockIsPrinterConnected,
    onStatusChange: () => () => {},
  },
}));

vi.mock("@/hooks/useQSRMenuItems", () => ({
  useQSRMenuItems: () => ({
    menuItems: [
      {
        id: "m1",
        name: "Paneer Roll",
        price: 120,
        category: "Rolls",
        is_available: true,
      },
    ],
    categories: [{ id: "c1", name: "Rolls", emoji: "🌯" }],
    isLoading: false,
    soldOutCount: 0,
    toggleAvailability: vi.fn(),
    restoreAllItems: vi.fn(),
    isToggling: false,
    isRestoring: false,
  }),
}));

vi.mock("@/components/QuickServe/QSMenuGrid", () => ({
  QSMenuGrid: ({ onAddItem }: any) => (
    <div data-testid="qs-menu-grid">
      <button
        onClick={() =>
          onAddItem({
            id: "m1",
            name: "Paneer Roll",
            price: 120,
            category: "Rolls",
            is_available: true,
          })
        }
      >
        Add Paneer Roll
      </button>
    </div>
  ),
}));

vi.mock("@/components/QSR/QSRPrinterDialog", () => ({
  QSRPrinterDialog: () => null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

const sampleItems: QSOrderItem[] = [
  { id: "i1", menuItemId: "m1", name: "Paneer Roll", price: 120, quantity: 2 },
];

describe("QuickServe POS Offline + Sync + Bill Print", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPrinterConnected = false;
    mockGetLocalOrder.mockResolvedValue(undefined);
    mockGetLocalOrdersByRestaurant.mockResolvedValue([]);
  });

  it("queues linked kitchen_order, order, and pos_transaction on offline Cash payment and prints bill", async () => {
    renderWithProviders(
      <QSPaymentSheet
        isOpen={true}
        onClose={vi.fn()}
        items={sampleItems}
        customerName="Rohan"
        customerPhone="9876543210"
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Cash"));

    await waitFor(() => {
      expect(screen.getByText("Order Saved Locally!")).toBeInTheDocument();
    });

    expect(mockEnqueueWrite).toHaveBeenCalledTimes(3);
    const [orderCall, koCall, txnCall] = mockEnqueueWrite.mock.calls;
    expect(orderCall[0]).toBe("order");
    expect(koCall[0]).toBe("kitchen_order");
    expect(txnCall[0]).toBe("pos_transaction");

    // FK integrity between order, kitchen_order, and pos_transaction
    expect(koCall[1].order_id).toBe(orderCall[1].id);
    expect(txnCall[1].order_id).toBe(orderCall[1].id);
    expect(txnCall[1].kitchen_order_id).toBe(koCall[1].id);
    expect(orderCall[1].order_number).toBe(42);
    expect(orderCall[1].payment_status).toBe("paid");

    expect(mockSaveLocalOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        id: orderCall[1].id,
        orderId: orderCall[1].id,
        source: "quickserve",
        orderNumber: 42,
        total: 240,
        paymentStatus: "paid",
        synced: false,
      }),
    );

    // Clicking Print Bill prints receipt via thermalPrinterService with cached metadata
    fireEvent.click(screen.getByText("Print Bill"));
    await waitFor(() => {
      expect(mockPrintReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurantName: "Tasty QuickServe",
          billNumber: "#042",
          netAmount: 240,
          upiId: "qs@upi",
        }),
      );
    });
  });

  it("supports Split Payment while offline without crashing", async () => {
    renderWithProviders(
      <QSPaymentSheet
        isOpen={true}
        onClose={vi.fn()}
        items={sampleItems}
        customerName="Meera"
        customerPhone=""
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Split Payment"));
    const inputs = screen.getAllByPlaceholderText("0");
    fireEvent.change(inputs[0], { target: { value: "100" } }); // Cash
    fireEvent.change(inputs[1], { target: { value: "140" } }); // UPI

    fireEvent.click(screen.getByText(/Confirm Split/));

    await waitFor(() => {
      expect(screen.getByText("Order Saved Locally!")).toBeInTheDocument();
    });

    const orderCall = mockEnqueueWrite.mock.calls.find((c) => c[0] === "order");
    const txnCall = mockEnqueueWrite.mock.calls.find(
      (c) => c[0] === "pos_transaction",
    );
    expect(orderCall?.[1].payment_method).toBe("split");
    expect(orderCall?.[1].split_payments).toEqual([
      { method: "cash", amount: 100 },
      { method: "upi", amount: 140 },
    ]);
    expect(txnCall?.[1].split_payments).toEqual([
      { method: "cash", amount: 100 },
      { method: "upi", amount: 140 },
    ]);
  });

  it("displays QR with pending status on offline UPI first and records paid only after confirmation", async () => {
    renderWithProviders(
      <QSPaymentSheet
        isOpen={true}
        onClose={vi.fn()}
        items={sampleItems}
        customerName="Karan"
        customerPhone="9123456789"
        existingOrder={{ id: "ord-existing-1", total: 240, orderNumber: 15 }}
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("UPI").closest("button")).not.toBeDisabled();
    });
    fireEvent.click(screen.getByText("UPI"));

    await waitFor(() => {
      expect(screen.getByText("Order Saved Locally!")).toBeInTheDocument();
    });

    // Before receipt confirmation: UPI QR stays visible and queued payment stays pending
    expect(screen.getByAltText("UPI Payment QR")).toBeInTheDocument();
    expect(mockEnqueueWrite).toHaveBeenCalledWith(
      "order",
      expect.objectContaining({
        id: "ord-existing-1",
        payment_status: "pending",
        payment_method: "upi",
      }),
      "update",
    );
    expect(mockEnqueueWrite).toHaveBeenCalledWith(
      "pos_transaction",
      expect.objectContaining({
        order_id: "ord-existing-1",
        amount: 240,
        payment_method: "upi",
        status: "pending",
      }),
      "insert",
    );

    mockEnqueueWrite.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Mark as Paid/i }));

    await waitFor(() => {
      expect(mockEnqueueWrite).toHaveBeenCalledWith(
        "order",
        expect.objectContaining({
          id: "ord-existing-1",
          payment_status: "paid",
          payment_method: "upi",
        }),
        "update",
      );
    });
    expect(mockEnqueueWrite).toHaveBeenCalledWith(
      "pos_transaction_clear_pending",
      { order_id: "ord-existing-1" },
      "delete",
    );
    expect(mockEnqueueWrite).toHaveBeenCalledWith(
      "pos_transaction",
      expect.objectContaining({
        order_id: "ord-existing-1",
        amount: 240,
        payment_method: "upi",
        status: "completed",
      }),
      "insert",
    );
  });

  it("sends QuickServe order to kitchen offline and prints KOT when thermal printer is connected", async () => {
    mockIsPrinterConnected = true;

    renderWithProviders(<QuickServePOS />);

    fireEvent.click(screen.getByText("Add Paneer Roll"));
    const kitchenBtn = screen.getAllByRole("button", { name: /Kitchen/i })[0];
    fireEvent.click(kitchenBtn);

    await waitFor(() => {
      expect(mockSaveLocalOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          source: "quickserve",
          status: "preparing",
          paymentStatus: "pending",
          orderNumber: 42,
          total: 120,
          synced: false,
        }),
      );
    });

    expect(mockEnqueueWrite.mock.calls[0][0]).toBe("order");
    expect(mockEnqueueWrite.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        source: "quickserve",
        payment_status: "pending",
        order_number: 42,
      }),
    );
    expect(mockEnqueueWrite.mock.calls[1][0]).toBe("kitchen_order");
    expect(mockEnqueueWrite.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        source: "QuickServe",
        status: "preparing",
        _deductInventory: true,
      }),
    );
    await waitFor(() => {
      expect(mockPrintKOT).toHaveBeenCalledWith(
        expect.objectContaining({
          tableName: "Token #042",
          orderType: "takeaway",
        }),
      );
    });
  });
});
