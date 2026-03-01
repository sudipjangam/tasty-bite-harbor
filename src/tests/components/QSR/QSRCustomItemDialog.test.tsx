import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { QSRCustomItemDialog } from "@/components/QSR/QSRCustomItemDialog";

describe("QSRCustomItemDialog Component", () => {
  const mockOnClose = vi.fn();
  const mockOnAddItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onAddItem: mockOnAddItem,
  };

  it("renders correctly when open", () => {
    renderWithProviders(<QSRCustomItemDialog {...defaultProps} />);

    expect(screen.getByText("Add Custom Item")).toBeInTheDocument();
    expect(screen.getByLabelText("Item Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Price (₹)")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Add to Order")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    renderWithProviders(
      <QSRCustomItemDialog {...defaultProps} isOpen={false} />,
    );

    expect(screen.queryByText("Add Custom Item")).not.toBeInTheDocument();
  });

  it("validates input and disables submit button when empty", () => {
    renderWithProviders(<QSRCustomItemDialog {...defaultProps} />);

    const submitButton = screen.getByText("Add to Order");

    // Initially disabled because inputs are empty
    expect(submitButton).toBeDisabled();

    // Fill name but not price
    fireEvent.change(screen.getByLabelText("Item Name"), {
      target: { value: "Burger" },
    });
    expect(submitButton).toBeDisabled();

    // Fill price but not name
    fireEvent.change(screen.getByLabelText("Item Name"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Price (₹)"), {
      target: { value: "150" },
    });
    expect(submitButton).toBeDisabled();

    // Fill both
    fireEvent.change(screen.getByLabelText("Item Name"), {
      target: { value: "Burger" },
    });
    expect(submitButton).not.toBeDisabled();
  });

  it("adds custom item to cart and resets form on submit", () => {
    renderWithProviders(<QSRCustomItemDialog {...defaultProps} />);

    // Fill form
    fireEvent.change(screen.getByLabelText("Item Name"), {
      target: { value: "Custom Pizza" },
    });
    fireEvent.change(screen.getByLabelText("Price (₹)"), {
      target: { value: "250" },
    });

    // Change quantity to 3 (starts at 1)
    const plusButtons = screen
      .getAllByRole("button")
      .filter((b) => b.innerHTML.includes("lucide-plus"));
    fireEvent.click(plusButtons[0]);
    fireEvent.click(plusButtons[0]);

    // Submit
    fireEvent.click(screen.getByText("Add to Order"));

    expect(mockOnAddItem).toHaveBeenCalledTimes(1);
    expect(mockOnAddItem).toHaveBeenCalledWith({
      name: "Custom Pizza",
      price: 250,
      quantity: 3,
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("shows live preview of total cost", () => {
    renderWithProviders(<QSRCustomItemDialog {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Item Name"), {
      target: { value: "Test Item" },
    });
    fireEvent.change(screen.getByLabelText("Price (₹)"), {
      target: { value: "50" },
    });

    // Quantity 1 preview
    expect(screen.getByText("1x Test Item")).toBeInTheDocument();
    expect(screen.getByText("₹50.00")).toBeInTheDocument();

    // Quantity 2 preview
    const plusButtons = screen
      .getAllByRole("button")
      .filter((b) => b.innerHTML.includes("lucide-plus"));
    fireEvent.click(plusButtons[0]);

    expect(screen.getByText("2x Test Item")).toBeInTheDocument();
    expect(screen.getByText("₹100.00")).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", () => {
    renderWithProviders(<QSRCustomItemDialog {...defaultProps} />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnAddItem).not.toHaveBeenCalled();
  });
});
