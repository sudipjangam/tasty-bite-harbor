import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { ArrowRight, Building2, Mail, Phone, User, Loader2 } from "lucide-react";

interface InquiryFormProps {
  setAuthMode: React.Dispatch<React.SetStateAction<"signin" | "signup" | "inquiry" | "forgot" | "reset">>;
}

const BUSINESS_TYPES = [
  "Food Truck",
  "Cafe",
  "Hotel",
  "Restaurant",
  "Hotel + Restaurant",
  "Other",
];

export const InquiryForm: React.FC<InquiryFormProps> = ({ setAuthMode }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    businessName: "",
    businessType: "",
    otherBusinessType: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.mobile) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10,15}$/.test(formData.mobile)) {
      newErrors.mobile = "Enter a valid mobile number";
    }
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }
    if (!formData.businessName) newErrors.businessName = "Business name is required";
    if (!formData.businessType) newErrors.businessType = "Business type is required";
    if (formData.businessType === "Other" && !formData.otherBusinessType) {
      newErrors.otherBusinessType = "Please specify your business type";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({
        title: "Validation Error",
        description: "Please check the highlighted fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const customType =
      formData.businessType === "Other"
        ? formData.otherBusinessType
        : formData.businessType;

    try {
      const SUPABASE_URL = 'https://clmsoetktmvhazctlans.supabase.co';
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-inquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          mobile: formData.mobile,
          email: formData.email,
          businessName: formData.businessName,
          businessType: customType,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send inquiry');

      toast({
        title: "Inquiry Sent Successfully",
        description: "We have received your details and will get back to you shortly.",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      
      setFormData({
        firstName: "",
        lastName: "",
        mobile: "",
        email: "",
        businessName: "",
        businessType: "",
        otherBusinessType: "",
      });
      
      setTimeout(() => setAuthMode("signin"), 3000);
      
    } catch (error) {
      console.error("Error sending inquiry:", error);
      toast({
        title: "Failed to send inquiry",
        description: "An unexpected error occurred while sending your inquiry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 px-5 sm:px-8 pb-5 sm:pb-8">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="firstName"
              placeholder="First name"
              className={`pl-9 ${errors.firstName ? 'border-red-500' : ''}`}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </div>
          {errors.firstName && <span className="text-xs text-red-500">{errors.firstName}</span>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="lastName"
              placeholder="Last name"
              className={`pl-9 ${errors.lastName ? 'border-red-500' : ''}`}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          {errors.lastName && <span className="text-xs text-red-500">{errors.lastName}</span>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobile">Mobile Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="mobile"
            type="tel"
            placeholder="Mobile number"
            className={`pl-9 ${errors.mobile ? 'border-red-500' : ''}`}
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
          />
        </div>
        {errors.mobile && <span className="text-xs text-red-500">{errors.mobile}</span>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email ID</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="email"
            type="email"
            placeholder="Email address"
            className={`pl-9 ${errors.email ? 'border-red-500' : ''}`}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessName">Business Name</Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="businessName"
            placeholder="Business Name"
            className={`pl-9 ${errors.businessName ? 'border-red-500' : ''}`}
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
          />
        </div>
        {errors.businessName && <span className="text-xs text-red-500">{errors.businessName}</span>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessType">Business Type</Label>
        <Select
          value={formData.businessType}
          onValueChange={(val) => setFormData({ ...formData, businessType: val })}
        >
          <SelectTrigger className={errors.businessType ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select business type" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.businessType && <span className="text-xs text-red-500">{errors.businessType}</span>}
      </div>

      {formData.businessType === "Other" && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
          <Label htmlFor="otherBusinessType">Specify Business Type</Label>
          <Input
            id="otherBusinessType"
            placeholder="Please specify"
            className={errors.otherBusinessType ? 'border-red-500' : ''}
            value={formData.otherBusinessType}
            onChange={(e) => setFormData({ ...formData, otherBusinessType: e.target.value })}
          />
          {errors.otherBusinessType && <span className="text-xs text-red-500">{errors.otherBusinessType}</span>}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 sm:h-12 mt-4 sm:mt-6 bg-gradient-to-r from-[#2E3192] to-[#1a1f6e] hover:from-[#1a1f6e] hover:to-[#0d1045] text-white font-semibold rounded-xl"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending Inquiry...
          </>
        ) : (
          <>
            Send Inquiry
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setAuthMode("signin")}
          className="text-sm text-[#2E3192] hover:text-[#1a1f6e] font-medium transition-colors"
        >
          Back to sign in
        </button>
      </div>
    </form>
  );
};
