import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useToastStore, type ToastType } from "../../stores/toast-store";

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors: Record<ToastType, string> = {
  success: "border-green-500 bg-green-500/10 text-green-400",
  error: "border-red-500 bg-red-500/10 text-red-400",
  info: "border-blue-500 bg-blue-500/10 text-blue-400",
  warning: "border-yellow-500 bg-yellow-500/10 text-yellow-400",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2 px-3 py-2 rounded-lg border shadow-lg backdrop-blur-sm max-w-sm animate-slide-in ${colors[toast.type]}`}
          >
            <Icon size={16} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-text-secondary mt-0.5 truncate">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-text-secondary hover:text-text flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
