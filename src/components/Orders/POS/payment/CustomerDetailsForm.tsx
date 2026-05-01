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
  sendBillToEmail,
  onSendBillToggle,
}: CustomerDetailsFormProps) => {
  return (
    <div className="flex items-center space-x-3">
      <Checkbox
        id="sendBillToEmail"
        checked={sendBillToEmail}
        onCheckedChange={(checked) => onSendBillToggle(checked as boolean)}
      />
      <Label
        htmlFor="sendBillToEmail"
        className="text-sm font-medium cursor-pointer select-none"
      >
        📲 Send bill to customer
      </Label>
      {sendBillToEmail && (
        <span className="text-xs text-green-600 dark:text-green-400 font-medium ml-auto">
          ✓ Will send after payment
        </span>
      )}
    </div>
  );
};

export default CustomerDetailsForm;
