import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import {
  QSOrderPanel,
  QSOrderItem,
} from "@/components/QuickServe/QSOrderPanel";

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrencyContext: () => ({ symbol: "₹" }),
}));

const mockItems: QSOrderItem[] = [
  { id: "1", menuItemId: "m1", name: "Burger", price: 150, quantity: 2 },
  {
    id: "2",
    menuItemId: "m2",
    name: "Pizza",
    price: 250,
    quantity: 1,
    isCustom: true,
  },
];

describe("QSOrderPanel Component", () => {
  const mockOnIncrement = vi.fn();
  const mockOnDecrement = vi.fn();
  const mockOnRemove = vi.fn();
  const mockOnClear = vi.fn();
  const mockOnProceedToPayment = vi.fn();
  const mockOnDiscountChange = vi.fn();
  const mockOnAddCustomItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    items: mockItems,
    onIncrement: mockOnIncrement,
    onDecrement: mockOnDecrement,
    onRemove: mockOnRemove,
    onClear: mockOnClear,
    onProceedToPayment: mockOnProceedToPayment,
    discountAmount: 0,
    discountPercentage: 0,
    onDiscountChange: mockOnDiscountChange,
    onAddCustomItem: mockOnAddCustomItem,
  };

  it("renders empty state correctly", () => {
    renderWithProviders(<QSOrderPanel {...defaultProps} items={[]} />);
    expect(screen.getByText("No items yet")).toBeInTheDocument();
  });

  it("renders items and calculates totals", () => {
    renderWithProviders(<QSOrderPanel {...defaultProps} />);

    expect(screen.getByText("Burger")).toBeInTheDocument();
    expect(screen.getByText("Pizza")).toBeInTheDocument();

    // Total calculation: (150 * 2) + (250 * 1) = 550
    const totalElements = screen.getAllByText(/550/);
    expect(totalElements.length).toBeGreaterThan(0);
  });

  it("handles item increment and decrement clicks", () => {
    renderWithProviders(<QSOrderPanel {...defaultProps} />);

    // Use getAllByRole as there are multiple Plus buttons, one for custom and one for items
    // Button order in DOM: Header Plus(CustomItem), Item1 Minus, Item1 Plus, Item2 Trash, Item2 Plus
    const [_, incrementBurger] = screen
      .getAllByRole("button", { name: "" })
      .filter((btn) => btn.innerHTML.includes("lucide-plus")); // just checking it renders, standard fireEvent.click gets tricky with icons, let's select by other means or assume there are multiple

    // Better way: We know there is a 2 (quantity) with a minus and plus next to it.
    // However, vitest fireEvent works on any element.
    const plusButtons = screen
      .getAllByRole("button")
      .filter((b) => b.innerHTML.includes("lucide-plus"));
    fireEvent.click(plusButtons[1]); // second plus is for first item
    expect(mockOnIncrement).toHaveBeenCalledWith("1");

    const minusButtons = screen
      .getAllByRole("button")
      .filter((b) => b.innerHTML.includes("lucide-minus"));
    fireEvent.click(minusButtons[0]);
    expect(mockOnDecrement).toHaveBeenCalledWith("1");

    // Trash icon for quantity = 1 (pizza)
    const trashButtons = screen
      .getAllByRole("button")
      .filter((b) => b.innerHTML.includes("lucide-trash"));
    fireEvent.click(trashButtons[1]); // first trash is clear all
    expect(mockOnRemove).toHaveBeenCalledWith("2");
  });

  it("calls clear order", () => {
    renderWithProviders(<QSOrderPanel {...defaultProps} />);

    const clearBtn = screen.getByText("Clear");
    fireEvent.click(clearBtn);
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  it("applies discounts correctly", () => {
    // 550 total - 50 discount = 500
    renderWithProviders(<QSOrderPanel {...defaultProps} discountAmount={50} />);

    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("-₹50.00")).toBeInTheDocument();

    // Pay button should show 500
    expect(screen.getByText(/Pay ₹500/)).toBeInTheDocument();
  });

  it("toggles discount input", () => {
    renderWithProviders(<QSOrderPanel {...defaultProps} />);

    const addDiscountBtn = screen.getByText("Add Discount");
    fireEvent.click(addDiscountBtn);

    expect(screen.getByPlaceholderText("Amount")).toBeInTheDocument();
  });
});
