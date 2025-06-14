
import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Edit, ArrowLeft, User } from "lucide-react";
import type { StaffMember } from "@/types/staff";

interface StaffHeaderProps {
  staff: StaffMember;
  onBack: () => void;
  onEdit: (staff: StaffMember) => void;
  onActivateDeactivate: () => void;
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({
  staff,
  onBack,
  onEdit,
  onActivateDeactivate,
}) => {
  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-200 px-3 py-1">Active</Badge>;
      case 'on_leave':
        return <Badge className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200 px-3 py-1">On Leave</Badge>;
      case 'inactive':
        return <Badge className="bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200 px-3 py-1">Inactive</Badge>;
      default:
        return <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200 px-3 py-1">Active</Badge>;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div className="flex items-center gap-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
          className="bg-white/80 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 hover:text-purple-700 font-semibold px-4 py-2 rounded-xl transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>

        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-4 border-gradient-to-r from-purple-200 to-indigo-200 shadow-lg">
            <AvatarImage src={staff.photo_url || ''} alt={`${staff.first_name} ${staff.last_name}`} />
            <AvatarFallback className="text-xl bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 font-bold">
              {getInitials(staff.first_name, staff.last_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {staff.first_name} {staff.last_name}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-gray-600 text-lg font-medium">
                {staff.position || "No position assigned"}
              </span>
              {getStatusBadge(staff.status)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => onEdit(staff)}
          className="bg-white/80 border-2 border-indigo-200 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 text-indigo-700 hover:text-indigo-800 font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
        >
          <Edit className="h-4 w-4 mr-2" /> 
          Edit Profile
        </Button>
        
        <Button 
          onClick={onActivateDeactivate}
          className={staff.status === "inactive" 
            ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
            : "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          }
        >
          <User className="h-4 w-4 mr-2" />
          {staff.status === "inactive" ? "Activate" : "Deactivate"}
        </Button>
      </div>
    </div>
  );
};
