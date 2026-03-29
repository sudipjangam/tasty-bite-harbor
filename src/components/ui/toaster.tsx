import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  const getIcon = (variant?: string) => {
    if (variant === "destructive") return <XCircle className="h-5 w-5 text-white shrink-0" />;
    return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />;
  };

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3">
              {getIcon(variant ?? undefined)}
              <div className="grid gap-0.5">
                {title && <ToastTitle className="text-sm font-bold">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-xs opacity-80">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
