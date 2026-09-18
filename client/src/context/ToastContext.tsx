import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

type ToastListener = (item: ToastItem) => void;
const listeners: Set<ToastListener> = new Set();

export const toast = {
  success: (msg: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    listeners.forEach((l) => l({ id, message: msg, type: 'success' }));
  },
  error: (msg: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    listeners.forEach((l) => l({ id, message: msg, type: 'error' }));
  },
  info: (msg: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    listeners.forEach((l) => l({ id, message: msg, type: 'info' }));
  },
};

const ToastContext = createContext<{ toast: typeof toast }>({ toast });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: ToastListener = (newToast) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-fade-in transition-all ${
              t.type === 'success'
                ? 'bg-[#0B4036] text-white border-[#C8A45D]/40'
                : t.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#C8A45D] shrink-0" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-blue-300 shrink-0" />}
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-white/60 hover:text-white shrink-0 p-0.5"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  return useContext(ToastContext);
};
