import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Role {
  id: string;
  name: string;
  is_deletable: boolean;
  is_system?: boolean;
  has_full_access?: boolean;
}

interface DeleteRoleDialogProps {
  role: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const DeleteRoleDialog = ({
  role,
  open,
  onOpenChange,
  onSuccess,
}: DeleteRoleDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if current user is an admin
  const isCurrentUserAdmin = (() => {
    if (!user) return false;
    const userRole = (user.role_name_text || user.role || "").toLowerCase();
    return user.role_has_full_access || userRole.includes("admin");
  })();

  // Check if this is an admin-level role
  const isAdminRole =
    role.has_full_access || role.name.toLowerCase().includes("admin");

  const handleDelete = async () => {
    if (!role.is_deletable) {
      toast({
        title: "Cannot Delete",
        description: "System roles cannot be deleted",
        variant: "destructive",
      });
      return;
    }

    // Prevent non-admins from deleting admin-level roles
    if (!isCurrentUserAdmin && isAdminRole) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can delete admin-level roles.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in to perform this action.");
      }

      const { data, error } = await supabase.functions.invoke(
        "role-management",
        {
          body: JSON.stringify({
            action: "delete",
            id: role.id,
          }),
        }
      );

      if (error) throw error;

      if (data.success) {
        onSuccess();
      } else {
        throw new Error(data.error || "Failed to delete role");
      }
    } catch (error: any) {
      console.error("Error deleting role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Role</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the role "{role.name}"? This action
            cannot be undone. Users with this role will need to be assigned a
            different role.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
