import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (title: string, message?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((title: string, message?: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="pointer-events-auto shadow-xl rounded-md bg-raised border border-line p-4 min-w-[300px] max-w-[400px] flex items-start gap-3"
            >
              {t.type === "success" && (
                <div className="shrink-0 w-5 h-5 rounded-full bg-va/20 flex items-center justify-center mt-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-va" />
                </div>
              )}
              {t.type === "error" && (
                <div className="shrink-0 w-5 h-5 rounded-full bg-nva/20 flex items-center justify-center mt-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-nva" />
                </div>
              )}
              {t.type === "info" && (
                <div className="shrink-0 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                </div>
              )}
              
              <div className="flex-1">
                <div className="font-semibold text-sm text-ink">{t.title}</div>
                {t.message && <div className="text-xs text-ink-dim mt-1">{t.message}</div>}
              </div>
              
              <button 
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="shrink-0 text-ink-faint hover:text-ink transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
