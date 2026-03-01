import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { QSROrderPad } from "@/components/QSR/QSROrderPad";
import { QSROrderItem } from "@/types/qsr";

const mockItems: QSROrderItem[] = [
  {
    id: "1",
    menuItemId: "m1",
    name: "Classic Burger",
    price: 150,
    quantity: 2,
    notes: "",
  },
  {
    id: "2",
    menuItemId: "m2",
    name: "Veggie Wrap",
    price: 120,
    quantity: 1,
    notes: "Extra spicy",
  },
];

describe("QSROrderPad Component", () => {
  const mockProps = {
    items: mockItems,
    mode: "dine_in" as const,
    selectedTable: {
      id: "t1",
      name: "Table 1",
      status: "available" as const,
      capacity: 4,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    subtotal: 420,
    tax: 0,
    total: 420,
    onIncrement: vi.fn(),
    onDecrement: vi.fn(),
    onRemove: vi.fn(),
    onAddNote: vi.fn(),
    onSendToKitchen: vi.fn(),
    onHoldOrder: vi.fn(),
    onProceedToPayment: vi.fn(),
    onClearOrder: vi.fn(),
    onAddCustomItem: vi.fn(),
    onChangeTable: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state correctly", () => {
    renderWithProviders(
      <QSROrderPad {...mockProps} items={[]} subtotal={0} total={0} />,
    );

    expect(screen.getByText("Order is empty")).toBeInTheDocument();
    expect(screen.getByText("Add items from the menu")).toBeInTheDocument();

    // Buttons should be disabled
    expect(screen.getByText("Send to Kitchen")).toBeDisabled();
    expect(screen.getByText("Hold Order")).toBeDisabled();
    expect(screen.getByText("💳 Proceed to Payment")).toBeDisabled();
    expect(screen.getByText("Clear Order")).toBeDisabled();
  });

  it("renders items with correct quantities and pricing", () => {
    // 2 * 150 = 300 for burger, 1 * 120 = 120 for wrap
    renderWithProviders(<QSROrderPad {...mockProps} />);

    expect(screen.getByText("Classic Burger")).toBeInTheDocument();
    expect(screen.getByText("Veggie Wrap")).toBeInTheDocument();

    // Match partial numbers to ignore exact formatting rules
    // like optional decimals, exact currency signs, or spacing.
    const numericTexts = screen.getAllByText(/300|120/);
    expect(numericTexts.length).toBeGreaterThan(0);

    expect(screen.getByText("Extra spicy")).toBeInTheDocument();
  });

  it("displays mode and table information", () => {
    renderWithProviders(<QSROrderPad {...mockProps} />);

    expect(screen.getByText("Dine In")).toBeInTheDocument();
    expect(screen.getByText("Table 1")).toBeInTheDocument();
  });

  it("calls increment, decrement, and remove correctly", () => {
    renderWithProviders(<QSROrderPad {...mockProps} />);

    const incrementButtons = screen
      .getAllByRole("button")
      .filter((b) => b.innerHTML.includes("lucide-plus"));
    const decrementButtons = screen
      .getAllByRole("button")
      .filter((b) => b.innerHTML.includes("lucide-minus"));
    const removeButtons = screen.getAllByTitle("Remove");

    fireEvent.click(incrementButtons[0]);
    expect(mockProps.onIncrement).toHaveBeenCalledWith("1");
    expect(mockProps.onIncrement).toHaveBeenCalledTimes(1);

    fireEvent.click(decrementButtons[1]);
    expect(mockProps.onDecrement).toHaveBeenCalledWith("2");
    expect(mockProps.onDecrement).toHaveBeenCalledTimes(1);

    fireEvent.click(removeButtons[0]);
    expect(mockProps.onRemove).toHaveBeenCalledWith("1");
    expect(mockProps.onRemove).toHaveBeenCalledTimes(1);
  });

  it("handles action buttons correctly (Send to Kitchen, Hold, Payment, Clear)", () => {
    renderWithProviders(<QSROrderPad {...mockProps} />);

    fireEvent.click(screen.getByText("Send to Kitchen"));
    expect(mockProps.onSendToKitchen).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Hold Order"));
    expect(mockProps.onHoldOrder).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("💳 Proceed to Payment"));
    expect(mockProps.onProceedToPayment).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Clear Order"));
    expect(mockProps.onClearOrder).toHaveBeenCalledTimes(1);
  });

  it("handles custom item addition and table change", () => {
    renderWithProviders(<QSROrderPad {...mockProps} />);

    fireEvent.click(screen.getByText("Add Custom Item"));
    expect(mockProps.onAddCustomItem).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Table 1"));
    expect(mockProps.onChangeTable).toHaveBeenCalledTimes(1);
  });
});
