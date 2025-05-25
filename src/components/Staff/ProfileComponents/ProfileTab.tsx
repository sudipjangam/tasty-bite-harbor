
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { StaffMember } from "@/types/staff";

interface ProfileTabProps {
  staff: StaffMember;
  formatDate: (dateString: string) => string;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ staff, formatDate }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Profile</CardTitle>
        <CardDescription>
          View and manage information about this staff member.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Contact Information</h3>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="text-sm font-medium">{staff.email || "Not provided"}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <div className="text-sm font-medium">{staff.phone || "Not provided"}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-lg">Emergency Contact</h3>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <div className="text-sm font-medium">{staff.emergency_contact_name || "Not provided"}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <div className="text-sm font-medium">{staff.emergency_contact_phone || "Not provided"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-lg">Employment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Position</Label>
                <div className="text-sm font-medium">{staff.position || "Not specified"}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div className="text-sm font-medium">
                  {staff.status || "Active"}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Start Date</Label>
                <div className="text-sm font-medium">{staff.start_date ? formatDate(staff.start_date) : "Not specified"}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Shift</Label>
                <div className="text-sm font-medium">{staff.Shift || "Not assigned"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-lg">Availability & Notes</h3>
          <div className="p-3 bg-muted/50 rounded-md">
            {staff.availability_notes || "No availability notes provided"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
