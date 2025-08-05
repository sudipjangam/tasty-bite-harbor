import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Camera, User, UserPlus, Loader2, FileText } from "lucide-react";
import type { StaffMember, StaffRole, Document } from "@/types/staff";
import DocumentUpload from "./DocumentUpload";

interface StaffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staff?: StaffMember;
  restaurantId: string | null;
  onSuccess: () => void;
  roles?: StaffRole[];
}

const StaffDialog: React.FC<StaffDialogProps> = ({
  isOpen,
  onClose,
  staff,
  restaurantId,
  onSuccess,
  roles = [],
}) => {
  const isEditMode = !!staff;
  const { toast } = useToast();
  
  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shift, setShift] = useState("Morning");
  const [status, setStatus] = useState<string>("active");
  const [photoUrl, setPhotoUrl] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [availabilityNotes, setAvailabilityNotes] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [salary, setSalary] = useState("");
  const [salaryType, setSalaryType] = useState("monthly");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Set form values when editing an existing staff member
  useEffect(() => {
    if (staff) {
      setFirstName(staff.first_name || "");
      setLastName(staff.last_name || "");
      setPosition(staff.position || "");
      setEmail(staff.email || "");
      setPhone(staff.phone || "");
      setShift(staff.Shift || "Morning");
      setStatus(staff.status || "active");
      setPhotoUrl(staff.photo_url || "");
      setEmergencyContactName(staff.emergency_contact_name || "");
      setEmergencyContactPhone(staff.emergency_contact_phone || "");
      setStartDate(staff.start_date ? staff.start_date.split('T')[0] : "");
      setAvailabilityNotes(staff.availability_notes || "");
      setRoleIds(staff.role_ids || []);
      setSalary(staff.salary?.toString() || "");
      setSalaryType(staff.salary_type || "monthly");
      setPhotoPreview(staff.photo_url || null);
      setDocuments(staff.documents || []);
    } else {
      // Reset form for new staff
      resetForm();
    }
  }, [staff]);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setPosition("");
    setEmail("");
    setPhone("");
    setShift("Morning");
    setStatus("active");
    setPhotoUrl("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setStartDate("");
    setAvailabilityNotes("");
    setRoleIds([]);
    setSalary("");
    setSalaryType("monthly");
    setPhotoPreview(null);
    setFile(null);
    setDocuments([]);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Upload photo if provided
  const uploadPhoto = async () => {
    if (!file) return null;
    
    try {
      const { uploadImage } = await import('@/utils/imageUpload');
      const imageUrl = await uploadImage(file, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });
      
      toast({
        title: "Photo uploaded successfully",
        description: "Staff photo has been uploaded and resized to passport size.",
      });
      
      return imageUrl;
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
      return null;
    }
  };

  // Save staff mutation
  const saveStaffMutation = useMutation({
    mutationFn: async (staffData: any) => {
      try {
        let photoURL = photoUrl;
        
        // Upload photo if a file is selected
        if (file) {
          const uploadedUrl = await uploadPhoto();
          if (uploadedUrl) {
            photoURL = uploadedUrl;
          }
        }
        
        // Prepare staff data
        const staffWithPhoto = {
          ...staffData,
          photo_url: photoURL,
          documents: documents,
        };
        
        let staffId = staff?.id;
        
        if (isEditMode && staff) {
          // Update existing staff
          const { error } = await supabase
            .from("staff")
            .update(staffWithPhoto)
            .eq("id", staff.id);
          
          if (error) throw error;
          staffId = staff.id;
        } else {
          // Add new staff
          const { data: newStaff, error } = await supabase
            .from("staff")
            .insert([{ ...staffWithPhoto, restaurant_id: restaurantId }])
            .select('id')
            .single();
          
          if (error) throw error;
          staffId = newStaff.id;
        }
        
        return { success: true };
      } catch (error: any) {
        console.error("Error saving staff:", error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditMode ? "Staff updated" : "Staff added",
        description: isEditMode
          ? "Staff information has been updated successfully."
          : "New staff member has been added successfully.",
      });
      resetForm();
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to save staff: ${error.message}`,
        variant: "destructive",
      });
    },
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!firstName || !lastName) {
      toast({
        title: "Missing information",
        description: "Please enter first and last name.",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number if provided
    if (phone) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
        toast({
          title: "Invalid phone number",
          description: "Phone number must be exactly 10 digits.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return;
      }
    }
    
    const staffData = {
      first_name: firstName,
      last_name: lastName,
      position,
      email,
      phone,
      Shift: shift,
      status,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      start_date: startDate || null,
      availability_notes: availabilityNotes,
      role_ids: roleIds.length > 0 ? roleIds : null,
      salary: salary ? parseFloat(salary) : null,
      salary_type: salaryType,
      documents: documents,
    };
    
    saveStaffMutation.mutate(staffData);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl">
              {isEditMode ? <User className="h-6 w-6 text-white" /> : <UserPlus className="h-6 w-6 text-white" />}
            </div>

            <div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {isEditMode ? `Edit ${staff?.first_name} ${staff?.last_name}` : "Add New Staff Member"}
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                {isEditMode
                  ? "Update the staff member's information below."
                  : "Fill in the details below to add a new staff member."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div className="flex flex-col items-center space-y-4">
            <Label htmlFor="photo" className="cursor-pointer group">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-gradient-to-r from-purple-200 to-indigo-200 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  {photoPreview ? (
                    <AvatarImage src={photoPreview} className="object-cover" />
                  ) : (
                    <AvatarFallback className="text-2xl bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700">
                      {firstName && lastName ? getInitials(firstName, lastName) : <Camera className="h-8 w-8" />}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="mt-3 text-center">
                <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-xl font-medium hover:from-purple-200 hover:to-indigo-200 transition-all duration-300">
                  <Camera className="h-4 w-4 mr-2" />
                  {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </span>
              </div>
            </Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Personal Information */}
          <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Job Information */}
          <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Job Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position" className="text-sm font-medium text-gray-700">Position</Label>
                <Input
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                />
              </div>
              <div>
                <Label htmlFor="status" className="text-sm font-medium text-gray-700">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-xl">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      setPhone(value);
                    }
                  }}
                  className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                  placeholder="10-digit phone number"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyContactName" className="text-sm font-medium text-gray-700">Emergency Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                />
              </div>
              <div>
                <Label htmlFor="emergencyContactPhone" className="text-sm font-medium text-gray-700">Emergency Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Salary Information */}
          <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Salary Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="salary" className="text-sm font-medium text-gray-700">Salary Amount</Label>
                <Input
                  id="salary"
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="Enter salary amount"
                  className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                />
              </div>
              <div>
                <Label htmlFor="salaryType" className="text-sm font-medium text-gray-700">Salary Type</Label>
                <Select value={salaryType} onValueChange={setSalaryType}>
                  <SelectTrigger className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30">
                    <SelectValue placeholder="Select salary type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-xl">
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Work Schedule */}
          <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Work Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                  className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                />
              </div>
              <div>
                <Label htmlFor="shift" className="text-sm font-medium text-gray-700">Shift</Label>
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30">
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-xl">
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Afternoon">Afternoon</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Availability Notes */}
          <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Additional Information</h3>
            <div>
              <Label htmlFor="availabilityNotes" className="text-sm font-medium text-gray-700">Availability Notes</Label>
              <Textarea
                id="availabilityNotes"
                value={availabilityNotes}
                onChange={(e) => setAvailabilityNotes(e.target.value)}
                placeholder="Enter availability preferences or other notes..."
                rows={3}
                className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200 resize-none"
              />
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Staff Documents
            </h3>
            <DocumentUpload
              documents={documents}
              onDocumentsChange={setDocuments}
            />
          </div>

          <DialogFooter className="flex gap-3 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="bg-white/80 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-all duration-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saveStaffMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
            >
              {saveStaffMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                isEditMode ? "Update Staff" : "Add Staff"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StaffDialog;
