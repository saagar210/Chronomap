import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

let nextId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++nextId}`;
    const duration = toast.duration ?? (toast.type === "error" ? 6000 : 3000);
    set((s) => ({
      toasts: [...s.toasts.slice(-4), { ...toast, id, duration }],
    }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
