import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { QSRPosMain } from "@/components/QSR/QSRPosMain";

const mockEnqueueWrite = vi.fn().mockResolvedValue("q-1");
const mockSaveLocalOrder = vi.fn().mockResolvedValue(undefined);
const mockGetLocalOrdersByRestaurant = vi.fn().mockResolvedValue([]);
const mockGetLocalOrder = vi.fn().mockResolvedValue(undefined);
const mockUpdateTableStatus = vi.fn().mockResolvedValue(undefined);
const mockPrintKOT = vi.fn().mockResolvedValue(undefined);

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

vi.mock("@/utils/syncManager", () => ({
  enqueueWrite: (...args: any[]) => mockEnqueueWrite(...args),
  generateOfflineOrderNumber: () => "OFFLINE-123456",
  hasPendingKitchenOrderInsert: vi.fn().mockResolvedValue(false),
  removeQueuedWritesForOrder: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/utils/offlineDB", () => ({
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
  deleteLocalOrder: vi.fn().mockResolvedValue(undefined),
  LOCAL_ORDERS_EVENT: "swadeshi:local-orders-changed",
}));

vi.mock("@/services/thermalPrinterService", () => ({
  thermalPrinterService: {
    isConnected: () => false,
    getDeviceName: () => null,
    onConnectionChange: () => () => {},
    tryAutoReconnect: vi.fn().mockResolvedValue(false),
    printKOT: (...args: any[]) => mockPrintKOT(...args),
  },
}));

vi.mock("@/components/QSR/QSRModeSelector", () => ({
  QSRModeSelector: ({ selectedMode, onModeChange }: any) => (
    <div data-testid="qsr-mode-selector">
      <button onClick={() => onModeChange("dine_in")}>Dine In</button>
      <button onClick={() => onModeChange("takeaway")}>Takeaway</button>
      <span data-testid="current-mode">{selectedMode}</span>
    </div>
  ),
}));

vi.mock("@/components/QSR/QSRTableGrid", () => ({
  QSRTableGrid: ({ onSelectTable }: any) => (
    <div data-testid="qsr-table-grid">
      <button
        onClick={() =>
          onSelectTable({ id: "t1", name: "Table 1", capacity: 4, status: "available" })
        }
      >
        Table 1
      </button>
      <button
        onClick={() =>
          onSelectTable({
            id: "t2",
            name: "Table 2",
            capacity: 4,
            status: "occupied",
            activeOrderId: "ko-local-2",
          })
        }
      >
        Table 2 Occupied
      </button>
    </div>
  ),
}));

vi.mock("@/components/QSR/QSRMenuGrid", () => ({
  QSRMenuGrid: ({ onAddItem }: any) => (
    <div data-testid="qsr-menu-grid">
      <button
        onClick={() =>
          onAddItem({
            id: "m1",
            name: "Masala Dosa",
            price: 120,
            category: "South Indian",
            is_available: true,
          })
        }
      >
        Add Dosa
      </button>
    </div>
  ),
}));

vi.mock("@/components/QSR/QSROrderPad", () => ({
  QSROrderPad: ({
    items,
    onSendToKitchen,
    onHoldOrder,
    onProceedToPayment,
  }: any) => (
    <div data-testid="qsr-order-pad">
      <span data-testid="cart-count">{(items || []).length}</span>
      <button onClick={onSendToKitchen}>Send to Kitchen</button>
      <button onClick={onHoldOrder}>Hold Order</button>
      <button onClick={onProceedToPayment}>Proceed to Payment</button>
    </div>
  ),
}));

vi.mock("@/components/Orders/POS/AdaptivePaymentDialog", () => ({
  default: ({ isOpen, onSuccess, orderItems }: any) =>
    isOpen ? (
      <div data-testid="mock-payment-dialog">
        <button
          onClick={() =>
            onSuccess({
              method: "cash",
              paymentStatus: "paid",
              total: 120,
              subtotal: 120,
              items: orderItems,
              offlineQueued: true,
            })
          }
        >
          Complete Cash Offline
        </button>
      </div>
    ) : null,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "staff-1",
      first_name: "Ravi",
      last_name: "Kumar",
      email: "ravi@test.com",
    },
    loading: false,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    isRole: () => true,
  }),
}));

vi.mock("@/hooks/useRestaurantId", () => ({
  useRestaurantId: () => ({
    restaurantId: "rest-1",
    restaurantName: "Test Kitchen",
  }),
}));

vi.mock("@/hooks/useQSRMenuItems", () => ({
  useQSRMenuItems: () => ({
    menuItems: [
      {
        id: "m1",
        name: "Masala Dosa",
        price: 120,
        category: "South Indian",
        is_available: true,
      },
    ],
    categories: [{ id: "south-indian", name: "South Indian", emoji: "🥞" }],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useQSRTables", () => ({
  useQSRTables: () => ({
    tables: [
      { id: "t1", name: "Table 1", capacity: 4, status: "available" },
      {
        id: "t2",
        name: "Table 2",
        capacity: 4,
        status: "occupied",
        activeOrderId: "ko-local-2",
      },
    ],
    isLoading: false,
    refetch: vi.fn(),
    updateTableStatus: mockUpdateTableStatus,
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
      single: vi.fn().mockResolvedValue({ data: { name: "Test Kitchen" } }),
    })),
  },
}));

describe("QSRPosMain Offline Billing & Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queues order, kitchen_order, and pos_transaction when settling a bill offline", async () => {
    renderWithProviders(<QSRPosMain />);

    fireEvent.click(screen.getByText("Takeaway"));
    fireEvent.click(screen.getByText("Add Dosa"));
    expect(screen.getByTestId("cart-count")).toHaveTextContent("1");

    fireEvent.click(screen.getByText("Proceed to Payment"));
    fireEvent.click(screen.getByText("Complete Cash Offline"));

    await waitFor(() => {
      expect(mockEnqueueWrite).toHaveBeenCalledTimes(3);
    });

    expect(mockEnqueueWrite.mock.calls[0][0]).toBe("order");
    expect(mockEnqueueWrite.mock.calls[0][1].status).toBe("completed");
    expect(mockEnqueueWrite.mock.calls[0][1].payment_method).toBe("cash");
    expect(mockEnqueueWrite.mock.calls[0][2]).toBe("insert");

    expect(mockEnqueueWrite.mock.calls[1][0]).toBe("kitchen_order");
    expect(mockEnqueueWrite.mock.calls[1][1].order_id).toBe(
      mockEnqueueWrite.mock.calls[0][1].id,
    );

    expect(mockEnqueueWrite.mock.calls[2][0]).toBe("pos_transaction");
    expect(mockEnqueueWrite.mock.calls[2][1].order_id).toBe(
      mockEnqueueWrite.mock.calls[0][1].id,
    );
    expect(mockEnqueueWrite.mock.calls[2][1].kitchen_order_id).toBe(
      mockEnqueueWrite.mock.calls[1][1].id,
    );

    expect(mockSaveLocalOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        paymentMethod: "cash",
        total: 120,
      }),
    );
  });

  it("queues dine-in order to kitchen, marks table occupied, and prints KOT while offline", async () => {
    renderWithProviders(<QSRPosMain />);

    fireEvent.click(screen.getByText("Table 1"));
    fireEvent.click(screen.getByText("Add Dosa"));
    fireEvent.click(screen.getByText("Send to Kitchen"));

    await waitFor(() => {
      expect(mockEnqueueWrite).toHaveBeenCalledTimes(2);
    });

    expect(mockEnqueueWrite.mock.calls[0][0]).toBe("order");
    expect(mockEnqueueWrite.mock.calls[0][1].status).toBe("pending");
    expect(mockEnqueueWrite.mock.calls[1][0]).toBe("kitchen_order");
    expect(mockEnqueueWrite.mock.calls[1][1].status).toBe("new");

    expect(mockSaveLocalOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "new",
        tableId: "t1",
        tableName: "Table 1",
      }),
    );
    expect(mockPrintKOT).toHaveBeenCalledTimes(1);
    expect(mockUpdateTableStatus).toHaveBeenCalledWith("t1", "occupied");
  });

  it("queues held order locally when holding offline", async () => {
    renderWithProviders(<QSRPosMain />);

    fireEvent.click(screen.getByText("Takeaway"));
    fireEvent.click(screen.getByText("Add Dosa"));
    fireEvent.click(screen.getByText("Hold Order"));

    await waitFor(() => {
      expect(mockEnqueueWrite).toHaveBeenCalledTimes(2);
    });

    expect(mockEnqueueWrite.mock.calls[0][0]).toBe("order");
    expect(mockEnqueueWrite.mock.calls[0][1].status).toBe("held");
    expect(mockEnqueueWrite.mock.calls[1][0]).toBe("kitchen_order");
    expect(mockEnqueueWrite.mock.calls[1][1].status).toBe("held");
    expect(mockSaveLocalOrder).toHaveBeenCalledWith(
      expect.objectContaining({ status: "held" }),
    );
  });

  it("recalls an occupied offline table order and frees table on post-pay offline settlement", async () => {
    mockGetLocalOrder.mockResolvedValueOnce({
      id: "ko-local-2",
      orderId: "ord-local-2",
      restaurant_id: "rest-1",
      source: "QSR-Table 2",
      tableId: "t2",
      tableName: "Table 2",
      orderType: "dine_in",
      status: "new",
      priority: "normal",
      items: [{ name: "Masala Dosa", quantity: 1, price: 120, printed_qty: 1 }],
      itemCompletionStatus: [false],
      total: 120,
      customerName: "Table 2",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderWithProviders(<QSRPosMain />);

    fireEvent.click(screen.getByText("Table 2 Occupied"));

    await waitFor(() => {
      expect(screen.getByTestId("cart-count")).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByText("Proceed to Payment"));
    fireEvent.click(screen.getByText("Complete Cash Offline"));

    await waitFor(() => {
      expect(mockUpdateTableStatus).toHaveBeenCalledWith("t2", "available");
    });
    // Post-pay does NOT re-create duplicate order/kitchen_order inside QSRPosMain
    expect(mockEnqueueWrite).not.toHaveBeenCalled();
  });

  it("does not select an occupied table when offline cached order is missing", async () => {
    mockGetLocalOrder.mockResolvedValueOnce(undefined);

    renderWithProviders(<QSRPosMain />);

    fireEvent.click(screen.getByText("Table 2 Occupied"));

    await waitFor(() => {
      expect(mockGetLocalOrder).toHaveBeenCalledWith("ko-local-2");
      expect(screen.getByTestId("qsr-table-grid")).toBeInTheDocument();
    });
  });

  it("queues deductInventory flag on pre-pay offline kitchen_order", async () => {
    renderWithProviders(<QSRPosMain />);

    fireEvent.click(screen.getByText("Takeaway"));
    fireEvent.click(screen.getByText("Add Dosa"));
    fireEvent.click(screen.getByText("Proceed to Payment"));
    fireEvent.click(screen.getByText("Complete Cash Offline"));

    await waitFor(() => {
      expect(mockEnqueueWrite).toHaveBeenCalledTimes(3);
    });

    expect(mockEnqueueWrite.mock.calls[0][0]).toBe("order");
    expect(mockEnqueueWrite.mock.calls[1][0]).toBe("kitchen_order");
    expect(mockEnqueueWrite.mock.calls[1][1]._deductInventory).toBe(true);
    expect(mockEnqueueWrite.mock.calls[2][0]).toBe("pos_transaction");
  });
});
