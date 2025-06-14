
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Mail, Phone, User, Calendar, Clock, MessageSquare } from "lucide-react";
import type { StaffMember } from "@/types/staff";

interface ProfileTabProps {
  staff: StaffMember;
  formatDate: (dateString: string) => string;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ staff, formatDate }) => {
  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <User className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>
            Primary contact details for this staff member
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/30">
                <Mail className="h-5 w-5 text-purple-600" />
                <div>
                  <Label className="text-xs text-gray-500 font-medium">Email Address</Label>
                  <div className="text-sm font-semibold text-gray-800">
                    {staff.email || "Not provided"}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/30">
                <Phone className="h-5 w-5 text-purple-600" />
                <div>
                  <Label className="text-xs text-gray-500 font-medium">Phone Number</Label>
                  <div className="text-sm font-semibold text-gray-800">
                    {staff.phone || "Not provided"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-emerald-700">
            <Phone className="h-5 w-5" />
            Emergency Contact
          </CardTitle>
          <CardDescription>
            Emergency contact information for urgent situations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/30">
                <User className="h-5 w-5 text-emerald-600" />
                <div>
                  <Label className="text-xs text-gray-500 font-medium">Contact Name</Label>
                  <div className="text-sm font-semibold text-gray-800">
                    {staff.emergency_contact_name || "Not provided"}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/30">
                <Phone className="h-5 w-5 text-emerald-600" />
                <div>
                  <Label className="text-xs text-gray-500 font-medium">Contact Phone</Label>
                  <div className="text-sm font-semibold text-gray-800">
                    {staff.emergency_contact_phone || "Not provided"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-indigo-700">
            <Calendar className="h-5 w-5" />
            Employment Details
          </CardTitle>
          <CardDescription>
            Job role, employment status, and work schedule information
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/30">
                <User className="h-5 w-5 text-indigo-600" />
                <div>
                  <Label className="text-xs text-gray-500 font-medium">Position</Label>
                  <div className="text-sm font-semibold text-gray-800">
                    {staff.position || "Not specified"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/30">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <div>
                  <Label className="text-xs text-gray-500 font-medium">Employment Status</Label>
                  <div className="text-sm font-semibold text-gray-800 capitalize">
                    {staff.status || "Active"}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/30">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <div>
                  <Label className="text-xs text-gray-500 font-medium">Start Date</Label>
                  <div className="text-sm font-semibold text-gray-800">
                    {staff.start_date ? formatDate(staff.start_date) : "Not specified"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/30">
                <Clock className="h-5 w-5 text-indigo-600" />
                <div>
                  <Label className="text-xs text-gray-500 font-medium">Preferred Shift</Label>
                  <div className="text-sm font-semibold text-gray-800">
                    {staff.Shift || "Not assigned"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <MessageSquare className="h-5 w-5" />
            Availability & Notes
          </CardTitle>
          <CardDescription>
            Additional notes and availability preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="p-4 bg-white/60 rounded-xl border border-white/30 min-h-[100px]">
            <p className="text-gray-700 leading-relaxed">
              {staff.availability_notes || "No availability notes provided"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
