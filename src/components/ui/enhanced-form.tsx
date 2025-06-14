
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const EnhancedForm = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

const EnhancedFormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
);

const EnhancedFormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
});
EnhancedFormItem.displayName = "EnhancedFormItem";

const EnhancedFormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    required?: boolean;
  }
>(({ className, required, children, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        error && "text-red-600",
        className
      )}
      htmlFor={formItemId}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
  );
});
EnhancedFormLabel.displayName = "EnhancedFormLabel";

const EnhancedFormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      className={cn(
        error && "border-red-300 focus:border-red-500 focus:ring-red-500"
      )}
      {...props}
    />
  );
});
EnhancedFormControl.displayName = "EnhancedFormControl";

const EnhancedFormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    type?: "default" | "info" | "warning";
  }
>(({ className, type = "default", children, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  const getIcon = () => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn(
        "text-sm text-gray-600 flex items-center gap-1",
        type === "info" && "text-blue-600",
        type === "warning" && "text-yellow-600",
        className
      )}
      {...props}
    >
      {getIcon()}
      {children}
    </p>
  );
});
EnhancedFormDescription.displayName = "EnhancedFormDescription";

const EnhancedFormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    type?: "error" | "success";
  }
>(({ className, children, type = "error", ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) {
    return null;
  }

  const getIcon = () => {
    if (type === "success") {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn(
        "text-sm font-medium flex items-center gap-1",
        type === "error" && "text-red-600",
        type === "success" && "text-green-600",
        className
      )}
      {...props}
    >
      {getIcon()}
      {body}
    </p>
  );
});
EnhancedFormMessage.displayName = "EnhancedFormMessage";

export {
  useFormField,
  EnhancedForm,
  EnhancedFormItem,
  EnhancedFormLabel,
  EnhancedFormControl,
  EnhancedFormDescription,
  EnhancedFormMessage,
  EnhancedFormField,
};
