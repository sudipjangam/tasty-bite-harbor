
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Customer } from "@/types/customer";
import { User, Mail, Phone, MapPin, Calendar, FileText } from "lucide-react";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSave: (customer: Partial<Customer>) => void;
  isLoading?: boolean;
}

const CustomerDialog: React.FC<CustomerDialogProps> = ({
  open,
  onOpenChange,
  customer,
  onSave,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: "",
    email: "",
    phone: "",
    address: "",
    birthday: "",
    preferences: "",
    tags: [],
  });

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
      });
    }
  }, [customer, open]);

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const isEditing = !!customer?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <DialogHeader className="space-y-4 pb-4 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {isEditing ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                {isEditing
                  ? "Update customer information and details."
                  : "Add a new customer to your database."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700 font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-purple-500" />
              Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter customer name"
              className="bg-white/50 border-white/30 rounded-xl focus:bg-white focus:border-purple-300 transition-all duration-200"
            />
          </div>
          
          {/* Email and Phone Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-purple-500" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="customer@email.com"
                className="bg-white/50 border-white/30 rounded-xl focus:bg-white focus:border-purple-300 transition-all duration-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700 font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-purple-500" />
                Phone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="bg-white/50 border-white/30 rounded-xl focus:bg-white focus:border-purple-300 transition-all duration-200"
              />
            </div>
          </div>
          
          {/* Address Field */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-gray-700 font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-500" />
              Address
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter customer address"
              className="bg-white/50 border-white/30 rounded-xl focus:bg-white focus:border-purple-300 transition-all duration-200 min-h-[80px] resize-none"
            />
          </div>
          
          {/* Birthday Field */}
          <div className="space-y-2">
            <Label htmlFor="birthday" className="text-gray-700 font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              Birthday
            </Label>
            <Input
              id="birthday"
              type="date"
              value={formData.birthday}
              onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              className="bg-white/50 border-white/30 rounded-xl focus:bg-white focus:border-purple-300 transition-all duration-200"
            />
          </div>
          
          {/* Preferences Field */}
          <div className="space-y-2">
            <Label htmlFor="preferences" className="text-gray-700 font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              Preferences
            </Label>
            <Textarea
              id="preferences"
              value={formData.preferences}
              onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
              placeholder="Customer preferences, dietary restrictions, etc."
              className="bg-white/50 border-white/30 rounded-xl focus:bg-white focus:border-purple-300 transition-all duration-200 min-h-[80px] resize-none"
            />
          </div>
        </div>
        
        {/* Modern Footer */}
        <DialogFooter className="gap-3 pt-4 border-t border-white/20">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-white/50 border-white/30 text-gray-700 hover:bg-white hover:border-gray-300 rounded-xl px-6"
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
            ) : (
              isEditing ? "Update Customer" : "Add Customer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;
