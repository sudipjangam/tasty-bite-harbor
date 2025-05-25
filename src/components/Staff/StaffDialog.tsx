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
import type { StaffMember, StaffRole } from "@/types/staff";

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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

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
      setPhotoPreview(staff.photo_url || null);
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
    setPhotoPreview(null);
    setFile(null);
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
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `staff-photos/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('staff-photos')
      .upload(filePath, file);
    
    if (uploadError) {
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      return null;
    }
    
    const { data } = supabase.storage
      .from('staff-photos')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
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
        };
        
        if (isEditMode && staff) {
          // Update existing staff
          const { error } = await supabase
            .from("staff")
            .update(staffWithPhoto)
            .eq("id", staff.id);
          
          if (error) throw error;
          return { success: true };
        } else {
          // Add new staff
          const { error } = await supabase
            .from("staff")
            .insert([{ ...staffWithPhoto, restaurant_id: restaurantId }]);
          
          if (error) throw error;
          return { success: true };
        }
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
    };
    
    saveStaffMutation.mutate(staffData);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? `Edit ${staff?.first_name} ${staff?.last_name}` : "Add New Staff Member"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the staff member's information below."
              : "Fill in the details below to add a new staff member."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div className="flex flex-col items-center space-y-2">
            <Label htmlFor="photo" className="cursor-pointer">
              <Avatar className="h-24 w-24">
                {photoPreview ? (
                  <AvatarImage src={photoPreview} />
                ) : (
                  <AvatarFallback className="text-xl">
                    {firstName && lastName ? getInitials(firstName, lastName) : "?"}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="mt-2 text-center text-sm text-muted-foreground">
                Click to upload photo
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
              <Input
                id="emergencyContactName"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
              <Input
                id="emergencyContactPhone"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div>
              <Label htmlFor="shift">Shift</Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Afternoon">Afternoon</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                  <SelectItem value="Night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="availabilityNotes">Availability Notes</Label>
            <Textarea
              id="availabilityNotes"
              value={availabilityNotes}
              onChange={(e) => setAvailabilityNotes(e.target.value)}
              placeholder="Enter availability preferences or other notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveStaffMutation.isPending}>
              {saveStaffMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
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
