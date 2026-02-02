import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Customer, CustomerLoyaltyTier } from "@/types/customer";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Star,
  Gift,
  Trash2,
  AlertCircle,
} from "lucide-react";
import LoyaltyBadge from "@/components/Customers/LoyaltyBadge";
import {
  validateEmail,
  validatePhone,
  handlePhoneInput,
} from "@/utils/formValidation";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSave: (customer: Partial<Customer>) => void;
  onDelete?: (customerId: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
}

const CustomerDialog: React.FC<CustomerDialogProps> = ({
  open,
  onOpenChange,
  customer,
  onSave,
  onDelete,
  isLoading = false,
  isDeleting = false,
}) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: "",
    email: "",
    phone: "",
    address: "",
    birthday: "",
    preferences: "",
    tags: [],
    loyalty_points: 0,
    loyalty_tier: "None" as CustomerLoyaltyTier,
  });
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        id: customer.id,
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        birthday: customer.birthday || "",
        preferences: customer.preferences || "",
        tags: customer.tags || [],
        loyalty_points: customer.loyalty_points || 0,
        loyalty_tier: customer.loyalty_tier || "None",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        birthday: "",
        preferences: "",
        tags: [],
        loyalty_points: 0,
        loyalty_tier: "None" as CustomerLoyaltyTier,
      });
    }
    setErrors({});
  }, [customer, open]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; phone?: string } = {};

    // Validate email if provided
    if (formData.email) {
      const emailValidation = validateEmail(formData.email, false);
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.error;
      }
    }

    // Validate phone if provided - using 10-digit requirement
    if (formData.phone) {
      const phoneValidation = validatePhone(formData.phone, false);
      if (!phoneValidation.isValid) {
        newErrors.phone = phoneValidation.error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (customer?.id && onDelete) {
      onDelete(customer.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    }
  };

  const isEditing = !!customer?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <DialogHeader className="space-y-4 pb-4 border-b border-white/20 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {isEditing ? "Edit Customer" : "Add New Customer"}
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400 mt-1">
                  {isEditing
                    ? "Update customer information and details."
                    : "Add a new customer to your database."}
                </DialogDescription>
              </div>
            </div>
            {/* Delete button for existing customers */}
            {isEditing && onDelete && (
              <AlertDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      Delete Customer?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete{" "}
                      <strong>{customer?.name}</strong>? This will also delete
                      all their notes, activities, and history. This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-500 hover:bg-red-600"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete Customer"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Name Field */}
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
            >
              <User className="h-4 w-4 text-purple-500" />
              Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter customer name"
              className="bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-purple-300 transition-all duration-200"
            />
          </div>

          {/* Email and Phone Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
              >
                <Mail className="h-4 w-4 text-purple-500" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="customer@email.com"
                className={`bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-purple-300 transition-all duration-200 ${
                  errors.email ? "border-red-500" : ""
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
              >
                <Phone className="h-4 w-4 text-purple-500" />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    phone: handlePhoneInput(e.target.value),
                  });
                  if (errors.phone) setErrors({ ...errors, phone: undefined });
                }}
                placeholder="10-digit phone number"
                maxLength={10}
                className={`bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600  rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-purple-300 transition-all duration-200 ${
                  errors.phone ? "border-red-500" : ""
                }`}
              />
              {errors.phone && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          {/* Address Field */}
          <div className="space-y-2">
            <Label
              htmlFor="address"
              className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
            >
              <MapPin className="h-4 w-4 text-purple-500" />
              Address
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Enter customer address"
              className="bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-purple-300 transition-all duration-200 min-h-[80px] resize-none"
            />
          </div>

          {/* Birthday Field */}
          <div className="space-y-2">
            <Label
              htmlFor="birthday"
              className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
            >
              <Calendar className="h-4 w-4 text-purple-500" />
              Birthday
            </Label>
            <Input
              id="birthday"
              type="date"
              value={formData.birthday}
              onChange={(e) =>
                setFormData({ ...formData, birthday: e.target.value })
              }
              className="bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-purple-300 transition-all duration-200"
            />
          </div>

          {/* Loyalty Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="loyalty_points"
                className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
              >
                <Gift className="h-4 w-4 text-purple-500" />
                Loyalty Points
              </Label>
              <Input
                id="loyalty_points"
                type="number"
                value={formData.loyalty_points}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    loyalty_points: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0"
                min="0"
                className="bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-purple-300 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="loyalty_tier"
                className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
              >
                <Star className="h-4 w-4 text-purple-500" />
                Loyalty Tier
              </Label>
              <Select
                value={formData.loyalty_tier}
                onValueChange={(value: CustomerLoyaltyTier) =>
                  setFormData({ ...formData, loyalty_tier: value })
                }
              >
                <SelectTrigger className="bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-purple-300 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Platinum">Platinum</SelectItem>
                  <SelectItem value="Diamond">Diamond</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preferences Field */}
          <div className="space-y-2">
            <Label
              htmlFor="preferences"
              className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
            >
              <FileText className="h-4 w-4 text-purple-500" />
              Preferences
            </Label>
            <Textarea
              id="preferences"
              value={formData.preferences}
              onChange={(e) =>
                setFormData({ ...formData, preferences: e.target.value })
              }
              placeholder="Customer preferences, dietary restrictions, etc."
              className="bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-purple-300 transition-all duration-200 min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* Modern Footer */}
        <DialogFooter className="gap-3 pt-4 border-t border-white/20 dark:border-gray-700/50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 rounded-xl px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name || isLoading}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl px-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </div>
            ) : isEditing ? (
              "Update Customer"
            ) : (
              "Add Customer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;
