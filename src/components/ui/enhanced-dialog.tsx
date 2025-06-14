
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const EnhancedDialog = DialogPrimitive.Root;

const EnhancedDialogTrigger = DialogPrimitive.Trigger;

const EnhancedDialogPortal = DialogPrimitive.Portal;

const EnhancedDialogClose = DialogPrimitive.Close;

const EnhancedDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
EnhancedDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface EnhancedDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
  type?: "default" | "success" | "warning" | "error" | "info";
}

const EnhancedDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  EnhancedDialogContentProps
>(({ className, children, size = "md", type = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw] max-h-[95vh]"
  };

  const typeClasses = {
    default: "border-gray-200",
    success: "border-green-200 bg-green-50/50",
    warning: "border-yellow-200 bg-yellow-50/50",
    error: "border-red-200 bg-red-50/50",
    info: "border-blue-200 bg-blue-50/50"
  };

  return (
    <EnhancedDialogPortal>
      <EnhancedDialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-6 border bg-white p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl",
          sizeClasses[size],
          typeClasses[type],
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </EnhancedDialogPortal>
  );
});
EnhancedDialogContent.displayName = DialogPrimitive.Content.displayName;

const EnhancedDialogHeader = ({
  className,
  type,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { type?: "default" | "success" | "warning" | "error" | "info" }) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case "error":
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case "info":
        return <Info className="h-6 w-6 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col space-y-2 text-center sm:text-left",
        className
      )}
      {...props}
    >
      {type && type !== "default" && (
        <div className="flex items-center justify-center sm:justify-start mb-2">
          {getIcon()}
        </div>
      )}
      {children}
    </div>
  );
};
EnhancedDialogHeader.displayName = "EnhancedDialogHeader";

const EnhancedDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-4 border-t border-gray-100",
      className
    )}
    {...props}
  />
);
EnhancedDialogFooter.displayName = "EnhancedDialogFooter";

const EnhancedDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight text-gray-900",
      className
    )}
    {...props}
  />
));
EnhancedDialogTitle.displayName = DialogPrimitive.Title.displayName;

const EnhancedDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-gray-600 leading-relaxed", className)}
    {...props}
  />
));
EnhancedDialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  EnhancedDialog,
  EnhancedDialogPortal,
  EnhancedDialogOverlay,
  EnhancedDialogClose,
  EnhancedDialogTrigger,
  EnhancedDialogContent,
  EnhancedDialogHeader,
  EnhancedDialogFooter,
  EnhancedDialogTitle,
  EnhancedDialogDescription,
};
