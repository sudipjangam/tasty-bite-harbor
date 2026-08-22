import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CategoryBar from "@/components/Menu/CategoryBar";
import MobileMenuView, { MenuItem } from "@/components/Menu/MobileMenuView";
import { renderWithProviders } from "@/tests/utils/test-utils";

// Mock FeatureLock for simple isolated testing
vi.mock("@/components/Auth/FeatureLock", () => ({
  FeatureLock: ({ children }: any) => <>{children}</>,
}));

const mockItems: MenuItem[] = [
  {
    id: "item-1",
    name: "Veg Hakka Noodles",
    category: "Chinese Noodles",
    price: 150,
    image_url: "",
    is_available: true,
    is_veg: true,
    is_special: false,
  },
  {
    id: "item-2",
    name: "Chicken Biryani",
    category: "Main Course",
    price: 250,
    image_url: "",
    is_available: false,
    is_veg: false,
    is_special: true,
  },
];

const mockGroupedData: Record<string, MenuItem[]> = {
  "Chinese Noodles": [mockItems[0]],
  "Main Course": [mockItems[1]],
};

describe("CategoryBar", () => {
  it("renders diet filter pills and categories", () => {
    const setActiveCategory = vi.fn();
    render(
      <CategoryBar
        activeCategory="all"
        setActiveCategory={setActiveCategory}
        groupedItemsData={mockGroupedData}
        totalCount={2}
        vegCount={1}
        nonVegCount={1}
        specialCount={1}
      />,
    );

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Veg")).toBeInTheDocument();
    expect(screen.getByText("Non-Veg")).toBeInTheDocument();
    expect(screen.getByText("⭐ Specials")).toBeInTheDocument();
    expect(screen.getByText("Chinese Noodles")).toBeInTheDocument();
    expect(screen.getByText("Main Course")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Veg"));
    expect(setActiveCategory).toHaveBeenCalledWith("veg");
  });
});

describe("MobileMenuView", () => {
  it("renders items in list view and allows stock toggle", () => {
    const onToggle = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    renderWithProviders(
      <MobileMenuView
        items={mockItems}
        allItems={mockItems}
        activeCategory="all"
        setActiveCategory={vi.fn()}
        searchQuery=""
        setSearchQuery={vi.fn()}
        groupedItemsData={mockGroupedData}
        currencySymbol="₹"
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleAvailability={onToggle}
        onOpenAddModal={vi.fn()}
        onOpenAIImport={vi.fn()}
      />,
    );

    expect(screen.getByText(/Veg Hakka Noodles/i)).toBeInTheDocument();
    expect(screen.getByText(/Chicken Biryani/i)).toBeInTheDocument();
    expect(screen.getByText("Out of Stock")).toBeInTheDocument();

    // Toggle switch
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0);
    fireEvent.click(switches[0]);
    expect(onToggle).toHaveBeenCalledWith("item-1", true);
  });
});
