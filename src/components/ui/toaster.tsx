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
    if (variant === "destructive") return <XCircle className="h-4 w-4 text-white shrink-0 mt-0.5" />;
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
  };

  return (
    <ToastProvider duration={2500}>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              {getIcon(variant ?? undefined)}
              <div className="flex flex-col gap-0.5 min-w-0">
                {title && <ToastTitle className="text-xs font-bold leading-snug">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-[11px] leading-tight opacity-85 line-clamp-2">{description}</ToastDescription>
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
