import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import MobilePaymentDialog from "@/components/Orders/POS/MobilePaymentDialog";
import PaymentDialog from "@/components/Orders/POS/PaymentDialog";

let mockIsOnline = false;
const mockEnqueueWrite = vi.fn().mockResolvedValue("q-1");
const mockSaveLocalOrder = vi.fn().mockResolvedValue(undefined);
const mockGetLocalOrderByAnyId = vi.fn().mockResolvedValue(undefined);
const mockGetCachedRestaurant = vi.fn().mockResolvedValue(null);
const mockGetCachedPaymentSettings = vi.fn().mockResolvedValue(null);
const mockGetCachedByRestaurant = vi.fn().mockResolvedValue([]);
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });

let mockRestaurantQueryResult: Record<string, { data: any; error: any }> = {};
let mockPaymentSettingsResult: { data: any; error: any } = { data: null, error: null };
let mockCurrentRestaurantId: string | null = "branch-1";

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
    isOnline: mockIsOnline,
    pendingCount: 0,
    triggerSync: vi.fn(),
    refreshCount: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "staff-retained-1", email: "cashier@test.com" },
    loading: false,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    isRole: () => true,
  }),
}));

vi.mock("@/hooks/useAccessControl", () => ({
  useAccessControl: () => ({ hasAccess: () => false }),
}));

vi.mock("@/hooks/useRestaurantId", () => ({
  useRestaurantId: () => ({
    restaurantId: mockCurrentRestaurantId,
    restaurantName: "Branch One",
  }),
}));

vi.mock("@/hooks/useCRMSync", () => ({
  useCRMSync: () => ({ syncCustomerToCRM: vi.fn().mockResolvedValue(null) }),
}));

vi.mock("@/hooks/useBillSharing", () => ({
  useBillSharing: () => ({
    getBillUrl: vi.fn(),
    shareViaWhatsApp: vi.fn(),
    shareViaWebShareAPI: vi.fn(),
    isWebShareSupported: false,
  }),
}));

vi.mock("@/hooks/useSpeechAnnouncement", () => ({
  useSpeechAnnouncement: () => ({ announcePayment: vi.fn() }),
}));

vi.mock("@/hooks/usePaymentNotification", () => ({
  usePaymentNotification: () => ({
    notifyPaymentSuccess: vi.fn(),
    requestPermission: vi.fn(),
  }),
}));

vi.mock("@/utils/syncManager", () => ({
  enqueueWrite: (...args: any[]) => mockEnqueueWrite(...args),
}));

vi.mock("@/utils/offlineDB", () => ({
  getLocalOrder: (...args: any[]) => mockGetLocalOrderByAnyId(...args),
  getLocalOrderByAnyId: (...args: any[]) => mockGetLocalOrderByAnyId(...args),
  saveLocalOrder: (...args: any[]) => mockSaveLocalOrder(...args),
  commitLocalOrderAndWritesAtomic: async (order: any, writes: any[]) => {
    if (order) await mockSaveLocalOrder(order);
    for (const w of writes) {
      await mockEnqueueWrite(w.type, w.payload, w.operation ?? "insert");
    }
  },
  getCachedRestaurant: (...args: any[]) => mockGetCachedRestaurant(...args),
  getCachedPaymentSettings: (...args: any[]) =>
    mockGetCachedPaymentSettings(...args),
  getCachedByRestaurant: (...args: any[]) => mockGetCachedByRestaurant(...args),
}));

vi.mock("@/services/thermalPrinterService", () => ({
  thermalPrinterService: {
    isConnected: () => false,
    printReceipt: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/nativePrinterBridge", () => ({
  nativePrinterBridge: {
    getStatus: () => ({ connected: false }),
    printReceipt: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/utils/resolveInvoiceTemplate", () => ({
  resolveInvoiceTemplate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: vi.fn((table: string) => {
      const state: { eqCol?: string; eqVal?: string } = {};
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn((col: string, val: string) => {
          state.eqCol = col;
          state.eqVal = val;
          return chain;
        }),
        ilike: vi.fn(() => chain),
        not: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => {
          if (table === "restaurants" && state.eqVal) {
            return mockRestaurantQueryResult[state.eqVal] || { data: null, error: null };
          }
          if (table === "payment_settings") {
            return mockPaymentSettingsResult;
          }
          return { data: null, error: null };
        }),
        then: (resolve: any, reject: any) =>
          Promise.resolve({ data: [], error: null }).then(resolve, reject),
      };
      return chain;
    }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

const sampleItems = [
  { id: "1", menuItemId: "m1", name: "Dosa", price: 100, quantity: 1 },
];

describe("Payment dialogs offline & review fixes", () => {
  let originalOnLineDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalOnLineDescriptor = Object.getOwnPropertyDescriptor(
      window.navigator,
      "onLine",
    );
    vi.clearAllMocks();
    localStorage.clear();
    mockIsOnline = false;
    mockCurrentRestaurantId = "branch-1";
    mockRestaurantQueryResult = {};
    mockPaymentSettingsResult = { data: null, error: null };
    mockGetLocalOrderByAnyId.mockResolvedValue(undefined);
    mockGetCachedRestaurant.mockResolvedValue(null);
    mockGetCachedPaymentSettings.mockResolvedValue(null);
    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalOnLineDescriptor) {
      Object.defineProperty(
        window.navigator,
        "onLine",
        originalOnLineDescriptor,
      );
    } else {
      delete (window.navigator as any).onLine;
    }
  });

  it("handles direct orders.id offline checkout without calling getSession or writing kitchen_order_id", async () => {
    renderWithProviders(
      <MobilePaymentDialog
        isOpen={true}
        onClose={vi.fn()}
        orderItems={sampleItems as any}
        orderId="ord-direct-1"
        linkedOrderId="ord-direct-1"
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Collect Payment/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cash/i }));

    await waitFor(() => {
      expect(screen.getByText("Saved Offline!")).toBeInTheDocument();
    });

    // Must not call supabase.auth.getSession while offline
    expect(mockGetSession).not.toHaveBeenCalled();

    expect(mockEnqueueWrite).toHaveBeenCalledWith(
      "kitchen_order",
      expect.objectContaining({ _updateByOrderId: "ord-direct-1", status: "completed" }),
      "update",
    );
    expect(mockEnqueueWrite).toHaveBeenCalledWith(
      "order",
      expect.objectContaining({
        id: "ord-direct-1",
        payment_status: "paid",
        payment_method: "cash",
      }),
      "update",
    );
    expect(mockEnqueueWrite).toHaveBeenCalledWith(
      "pos_transaction",
      expect.objectContaining({
        order_id: "ord-direct-1",
        kitchen_order_id: null,
        staff_id: "staff-retained-1",
      }),
      "insert",
    );
  });

  it("does not fall back to profile branch UPI or cached settings on empty online read", async () => {
    mockIsOnline = true;
    Object.defineProperty(window.navigator, "onLine", {
      value: true,
      configurable: true,
    });
    mockGetCachedPaymentSettings.mockResolvedValue({ upi_id: "stale-idb@upi" });
    mockRestaurantQueryResult = {
      "branch-1": { data: null, error: new Error("Network error") },
      "profile-branch-2": { data: { id: "profile-branch-2", upi_id: "wrong-profile@upi" }, error: null },
    };
    mockPaymentSettingsResult = { data: null, error: null };

    renderWithProviders(
      <MobilePaymentDialog
        isOpen={true}
        onClose={vi.fn()}
        orderItems={sampleItems as any}
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mockGetCachedRestaurant).toHaveBeenCalledWith("branch-1");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(localStorage.getItem("cached_restaurant_upi_id_branch-1")).toBeNull();
    // Successful empty payment_settings online read must not fall back to IDB cache
    expect(mockGetCachedPaymentSettings).not.toHaveBeenCalled();
  });

  it("preserves cashier customerName edits when slow getLocalOrder resolves later", async () => {
    let resolveLocal: (val: any) => void = () => {};
    mockGetLocalOrderByAnyId.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLocal = resolve;
      }),
    );

    renderWithProviders(
      <MobilePaymentDialog
        isOpen={true}
        onClose={vi.fn()}
        orderItems={sampleItems as any}
        orderId="ko-slow-1"
        onSuccess={vi.fn()}
      />,
    );

    const nameInput = screen.getByPlaceholderText("Customer Name (Optional)");
    fireEvent.change(nameInput, { target: { value: "Cashier Edited Name" } });

    await act(async () => {
      resolveLocal({
        id: "ko-slow-1",
        customerName: "Stale Local Name",
        customerPhone: "9999999999",
      });
    });

    expect(nameInput).toHaveValue("Cashier Edited Name");
    expect(screen.getByPlaceholderText("Mobile number (auto-lookup)")).toHaveValue("9999999999");
  });

  it("awaits parent persistence on !orderId offline checkout and migrates legacy queue in PaymentDialog", async () => {
    localStorage.setItem(
      "pos_offline_payments_queue",
      JSON.stringify([
        {
          orderId: "ko-legacy-1",
          payment_status: "paid",
          payment_method: "cash",
          total_amount: 180,
          customer_name: "Legacy Guest",
        },
      ]),
    );

    let resolveParent: () => void = () => {};
    const onSuccess = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveParent = resolve;
        }),
    );

    renderWithProviders(
      <PaymentDialog
        isOpen={true}
        onClose={vi.fn()}
        orderItems={sampleItems as any}
        onSuccess={onSuccess}
      />,
    );

    // Legacy queue migrated once and key cleared
    await waitFor(() => {
      expect(mockEnqueueWrite).toHaveBeenCalledWith(
        "order",
        expect.objectContaining({
          id: "ko-legacy-1",
          _resolveOrderIdFromKitchenOrderId: "ko-legacy-1",
          payment_status: "paid",
        }),
        "update",
      );
    });
    expect(localStorage.getItem("pos_offline_payments_queue")).toBeNull();

    // Advance from Bill Preview to Checkout step, then pay Cash
    fireEvent.click(screen.getByRole("button", { name: /Choose Payment Method/i }));
    fireEvent.click(screen.getByText("Cash").closest("button")!);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ offlineQueued: true, deferParentClose: true }),
      );
    });
    expect(screen.queryByText("Saved Offline!")).not.toBeInTheDocument();

    await act(async () => {
      resolveParent();
    });

    await waitFor(() => {
      expect(screen.getByText("Saved Offline!")).toBeInTheDocument();
    });
  });
});
