
import React from "react";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/types/auth";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

/**
 * Component to display user role as a styled badge
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className }) => {
  const getRoleConfig = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return {
          label: 'Owner',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 hover:bg-red-100'
        };
      case 'admin':
        return {
          label: 'Admin',
          variant: 'destructive' as const,
          className: 'bg-orange-100 text-orange-800 hover:bg-orange-100'
        };
      case 'manager':
        return {
          label: 'Manager',
          variant: 'default' as const,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
        };
      case 'chef':
        return {
          label: 'Chef',
          variant: 'secondary' as const,
          className: 'bg-purple-100 text-purple-800 hover:bg-purple-100'
        };
      case 'waiter':
        return {
          label: 'Waiter',
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-100'
        };
      case 'staff':
        return {
          label: 'Staff',
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-100'
        };
      case 'viewer':
        return {
          label: 'Viewer',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100'
        };
      default:
        return {
          label: role,
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100'
        };
    }
  };

  const config = getRoleConfig(role);

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
};
