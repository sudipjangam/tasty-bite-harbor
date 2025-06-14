
import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserCheck, UserX, AlertTriangle } from "lucide-react";

interface StaffStatusDialogProps {
  isInactive: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const StaffStatusDialog: React.FC<StaffStatusDialogProps> = ({
  isInactive,
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md bg-background border-border shadow-2xl">
        <AlertDialogHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-r from-primary/10 to-primary/5">
            {isInactive ? (
              <UserCheck className="w-8 h-8 text-green-600" />
            ) : (
              <UserX className="w-8 h-8 text-red-600" />
            )}
          </div>
          <AlertDialogTitle className={`text-xl font-semibold text-center ${
            isInactive ? "text-green-600" : "text-red-600"
          }`}>
            {isInactive ? "Activate Staff Member" : "Deactivate Staff Member"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground">
            {isInactive 
              ? "This will make the staff member active again. They will appear in all active staff lists and be able to access the system."
              : "This will deactivate the staff member. They will no longer appear in active staff lists and won't be able to access the system."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 pt-6">
          <AlertDialogCancel className="flex-1 border-border hover:bg-muted">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`flex-1 ${
              isInactive 
                ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white" 
                : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            } shadow-lg`}
          >
            {isInactive ? (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                Activate
              </>
            ) : (
              <>
                <UserX className="w-4 h-4 mr-2" />
                Deactivate
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
