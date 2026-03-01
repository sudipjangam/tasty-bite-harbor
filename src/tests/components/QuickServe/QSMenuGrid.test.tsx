import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { QSMenuGrid } from "@/components/QuickServe/QSMenuGrid";
import { QSRMenuItem, QSRCategory } from "@/hooks/useQSRMenuItems";

// Mock CurrencyContext
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrencyContext: () => ({ symbol: "₹" }),
}));

const mockCategories: QSRCategory[] = [
  { id: "fast-food", name: "Fast Food", emoji: "🍔" },
  { id: "drinks", name: "Drinks", emoji: "🥤" },
];

const mockMenuItems: QSRMenuItem[] = [
  {
    id: "m1",
    name: "Burger",
    price: 150,
    category: "Fast Food",
    is_available: true,
    is_veg: false,
  },
  {
    id: "m2",
    name: "Pizza",
    price: 250,
    category: "Fast Food",
    is_available: true,
    is_veg: true,
  },
  {
    id: "m3",
    name: "Coke",
    price: 50,
    category: "Drinks",
    is_available: false,
    is_veg: true,
  }, // Sold out
];

describe("QSMenuGrid Component", () => {
  const mockOnAddItem = vi.fn();
  const mockOnToggleAvailability = vi.fn();
  const mockOnRestoreAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    menuItems: mockMenuItems,
    categories: mockCategories,
    isLoading: false,
    cartItemCounts: { m1: 2 },
    onAddItem: mockOnAddItem,
    onToggleAvailability: mockOnToggleAvailability,
    onRestoreAll: mockOnRestoreAll,
    soldOutCount: 1,
    isToggling: false,
    isRestoring: false,
  };

  it("renders loading state", () => {
    renderWithProviders(<QSMenuGrid {...defaultProps} isLoading={true} />);
    expect(screen.getByText("Loading menu...")).toBeInTheDocument();
  });

  it("renders categories and items correctly", () => {
    renderWithProviders(<QSMenuGrid {...defaultProps} />);

    // Check categories
    expect(screen.getByText("🍽️ All")).toBeInTheDocument();
    expect(screen.getByText("🍔 Fast Food")).toBeInTheDocument();

    // Check available items
    expect(screen.getByText("Burger")).toBeInTheDocument();
    expect(screen.getByText("₹150")).toBeInTheDocument();

    expect(screen.getByText("Pizza")).toBeInTheDocument();

    // Sold out item should not be rendered initially normally
    expect(screen.queryByText("Coke")).not.toBeInTheDocument();
  });

  it("filters items by category click", () => {
    renderWithProviders(<QSMenuGrid {...defaultProps} />);

    fireEvent.click(screen.getByText("🍔 Fast Food"));
    expect(screen.getByText("Burger")).toBeInTheDocument();
    expect(screen.getByText("Pizza")).toBeInTheDocument();
  });

  it("filters items by search query", () => {
    renderWithProviders(<QSMenuGrid {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Search menu...");
    fireEvent.change(searchInput, { target: { value: "Burg" } });

    expect(screen.getByText("Burger")).toBeInTheDocument();
    expect(screen.queryByText("Pizza")).not.toBeInTheDocument();
  });

  it("displays sold out items when toggle is clicked", () => {
    renderWithProviders(<QSMenuGrid {...defaultProps} />);

    const soldOutBtn = screen.getByRole("button", { name: "Sold Out (1)" });
    fireEvent.click(soldOutBtn);

    // Now Coke should be visible and available items hidden
    expect(screen.getByText("Coke")).toBeInTheDocument();
    expect(screen.queryByText("Burger")).not.toBeInTheDocument();
  });

  it("calls onAddItem when item is clicked", () => {
    renderWithProviders(<QSMenuGrid {...defaultProps} />);

    fireEvent.click(screen.getByText("Burger")); // Clicking the text itself

    expect(mockOnAddItem).toHaveBeenCalledTimes(1);
    expect(mockOnAddItem).toHaveBeenCalledWith(mockMenuItems[0]);
  });

  it("displays cart count indicating existing items in cart", () => {
    renderWithProviders(<QSMenuGrid {...defaultProps} />);

    // Check cart count for Burger (m1) is 2
    expect(screen.getByText("2")).toBeInTheDocument(); // Badge count
  });
});
