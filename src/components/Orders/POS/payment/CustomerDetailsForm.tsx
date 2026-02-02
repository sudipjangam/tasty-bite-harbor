/**
 * CustomerDetailsForm - Extracted from PaymentDialog
 * Handles customer name, phone, and email input with optional bill sending toggle
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { handlePhoneInput } from "@/utils/formValidation";

interface CustomerDetailsFormProps {
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  sendBillToEmail: boolean;
  onNameChange: (value: string) => void;
  onMobileChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSendBillToggle: (checked: boolean) => void;
}

const CustomerDetailsForm = ({
  customerName,
  customerMobile,
  customerEmail,
  sendBillToEmail,
  onNameChange,
  onMobileChange,
  onEmailChange,
  onSendBillToggle,
}: CustomerDetailsFormProps) => {
  return (
    <div className="space-y-4">
      {/* Toggle for enabling customer details */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="sendBillToEmail"
          checked={sendBillToEmail}
          onCheckedChange={(checked) => onSendBillToggle(checked as boolean)}
        />
        <Label
          htmlFor="sendBillToEmail"
          className="text-sm font-medium cursor-pointer"
        >
          Save Customer Details & Send Bill
        </Label>
      </div>

      {/* Customer details form (shown when toggle is enabled) */}
      {sendBillToEmail && (
        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="space-y-1">
            <Label htmlFor="customerName" className="text-sm">
              Customer Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter customer name"
              className="bg-white dark:bg-gray-900"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="customerMobile" className="text-sm">
              Mobile Number
            </Label>
            <Input
              id="customerMobile"
              value={customerMobile}
              onChange={(e) => onMobileChange(handlePhoneInput(e.target.value))}
              placeholder="10-digit mobile number"
              type="tel"
              className="bg-white dark:bg-gray-900"
              maxLength={10}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="customerEmail" className="text-sm">
              Email Address (optional)
            </Label>
            <Input
              id="customerEmail"
              value={customerEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="Enter email address"
              type="email"
              className="bg-white dark:bg-gray-900"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailsForm;
