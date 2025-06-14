
import React from "react";
import { 
  EnhancedDialog,
  EnhancedDialogContent,
  EnhancedDialogHeader,
  EnhancedDialogTitle,
  EnhancedDialogDescription,
  EnhancedDialogFooter
} from "@/components/ui/enhanced-dialog";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { X } from "lucide-react";

interface StandardizedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  type?: "default" | "success" | "warning" | "error" | "info";
  showFooter?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'success' | 'danger';
  isLoading?: boolean;
}

/**
 * Standardized modal component with consistent styling and behavior
 */
export const StandardizedModal: React.FC<StandardizedModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  type = "default",
  showFooter = true,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  isLoading = false
}) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <EnhancedDialog open={open} onOpenChange={onOpenChange}>
      <EnhancedDialogContent size={size} type={type}>
        <EnhancedDialogHeader type={type}>
          <EnhancedDialogTitle>{title}</EnhancedDialogTitle>
          {description && (
            <EnhancedDialogDescription>{description}</EnhancedDialogDescription>
          )}
        </EnhancedDialogHeader>
        
        <div className="py-4">
          {children}
        </div>

        {showFooter && (
          <EnhancedDialogFooter>
            <StandardizedButton
              variant="secondary"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {cancelText}
            </StandardizedButton>
            {onConfirm && (
              <StandardizedButton
                variant={confirmVariant}
                onClick={onConfirm}
                loading={isLoading}
              >
                {confirmText}
              </StandardizedButton>
            )}
          </EnhancedDialogFooter>
        )}
      </EnhancedDialogContent>
    </EnhancedDialog>
  );
};
