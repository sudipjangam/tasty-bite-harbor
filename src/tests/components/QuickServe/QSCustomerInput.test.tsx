import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import { QSCustomerInput } from "@/components/QuickServe/QSCustomerInput";

describe("QSCustomerInput Component", () => {
  const mockOnNameChange = vi.fn();
  const mockOnPhoneChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    customerName: "",
    customerPhone: "",
    onNameChange: mockOnNameChange,
    onPhoneChange: mockOnPhoneChange,
  };

  it("renders correctly with given values", () => {
    renderWithProviders(
      <QSCustomerInput
        {...defaultProps}
        customerName="John"
        customerPhone="12345"
      />,
    );

    expect(screen.getByPlaceholderText("Name")).toHaveValue("John");
    expect(screen.getByPlaceholderText("Phone")).toHaveValue("12345");
  });

  it("calls onNameChange when name is typed", () => {
    renderWithProviders(<QSCustomerInput {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText("Name");
    fireEvent.change(nameInput, { target: { value: "Jane" } });

    expect(mockOnNameChange).toHaveBeenCalledWith("Jane");
  });

  it("calls onPhoneChange and strips non-digits", () => {
    renderWithProviders(<QSCustomerInput {...defaultProps} />);

    const phoneInput = screen.getByPlaceholderText("Phone");

    // Typing mixed characters
    fireEvent.change(phoneInput, { target: { value: "123A456B789" } });
    // Should strip A and B, taking first 10 digits: "123456789"

    expect(mockOnPhoneChange).toHaveBeenCalledWith("123456789");

    // Typing more than 10 digits
    fireEvent.change(phoneInput, { target: { value: "1234567890123" } });
    expect(mockOnPhoneChange).toHaveBeenCalledWith("1234567890");
  });
});
