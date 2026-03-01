import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { QSRMenuGrid } from "@/components/QSR/QSRMenuGrid";
import { QSRMenuItem } from "@/hooks/useQSRMenuItems";

const mockMenuItems: QSRMenuItem[] = [
  {
    id: "1",
    name: "Classic Burger",
    price: 150,
    category: "Burgers",
    is_veg: false,
    image_url: "",
    is_available: true,
  },
  {
    id: "2",
    name: "Veggie Wrap",
    price: 120,
    category: "Wraps",
    is_veg: true,
    image_url: "",
    is_available: true,
  },
  {
    id: "3",
    name: "French Fries",
    price: 80,
    category: "Sides",
    is_veg: true,
    image_url: "",
    is_available: true,
  },
];

const mockCategories = [
  { id: "burgers", name: "Burgers", emoji: "🍔" },
  { id: "wraps", name: "Wraps", emoji: "🌯" },
  { id: "sides", name: "Sides", emoji: "🍟" },
];

describe("QSRMenuGrid Component", () => {
  const mockOnAddItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    menuItems: mockMenuItems,
    categories: mockCategories,
    onAddItem: mockOnAddItem,
    cartItemCounts: {},
    isLoading: false,
  };

  it("renders all menu items initially", () => {
    renderWithProviders(<QSRMenuGrid {...defaultProps} />);

    expect(screen.getByText("Classic Burger")).toBeInTheDocument();
    expect(screen.getByText("Veggie Wrap")).toBeInTheDocument();
    expect(screen.getByText("French Fries")).toBeInTheDocument();
  });

  it("renders categories correctly", () => {
    renderWithProviders(<QSRMenuGrid {...defaultProps} />);

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Burgers")).toBeInTheDocument();
    expect(screen.getByText("Wraps")).toBeInTheDocument();
    expect(screen.getByText("Sides")).toBeInTheDocument();
  });

  it("filters items when a category is selected", () => {
    renderWithProviders(<QSRMenuGrid {...defaultProps} />);

    // Click on 'Wraps' category
    fireEvent.click(screen.getByText("Wraps"));

    // Veggie Wrap should be visible, others shouldn't
    expect(screen.getByText("Veggie Wrap")).toBeInTheDocument();
    expect(screen.queryByText("Classic Burger")).not.toBeInTheDocument();
    expect(screen.queryByText("French Fries")).not.toBeInTheDocument();
  });

  it("filters items based on text search", () => {
    renderWithProviders(<QSRMenuGrid {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Search items...");

    // Type 'Fries'
    fireEvent.change(searchInput, { target: { value: "Fries" } });

    expect(screen.getByText("French Fries")).toBeInTheDocument();
    expect(screen.queryByText("Classic Burger")).not.toBeInTheDocument();
    expect(screen.queryByText("Veggie Wrap")).not.toBeInTheDocument();
  });

  it("calls onAddItem when an item is clicked", () => {
    renderWithProviders(<QSRMenuGrid {...defaultProps} />);

    const burgerButton = screen.getByText("Classic Burger");
    fireEvent.click(burgerButton);

    expect(mockOnAddItem).toHaveBeenCalledTimes(1);
    expect(mockOnAddItem).toHaveBeenCalledWith(mockMenuItems[0]);
  });

  it("displays correct cart badges when cartItemCounts is provided", () => {
    const propsWithCart = {
      ...defaultProps,
      cartItemCounts: { "1": 3, "2": 1 },
    };

    const { container } = renderWithProviders(
      <QSRMenuGrid {...propsWithCart} />,
    );

    // We can't query by text easily because the number is in a generic div
    // Let's assert based on the existence of the badge text
    expect(screen.getByText("3")).toBeInTheDocument(); // 3 burgers
    expect(screen.getByText("1")).toBeInTheDocument(); // 1 wrap
  });

  it("renders skeleton loader when isLoading is true", () => {
    renderWithProviders(<QSRMenuGrid {...defaultProps} isLoading={true} />);

    // Menu items should not be visible
    expect(screen.queryByText("Classic Burger")).not.toBeInTheDocument();
    expect(screen.queryByText("Quick Menu Select")).not.toBeInTheDocument();
  });
});
