import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheckBig, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: {
    icon: CircleCheckBig,
    accent: '#22c55e',
    border: 'border-emerald-200/70',
    badge: 'bg-emerald-500/12 text-emerald-700',
  },
  error: {
    icon: CircleAlert,
    accent: '#ef4444',
    border: 'border-rose-200/70',
    badge: 'bg-rose-500/12 text-rose-700',
  },
  info: {
    icon: Info,
    accent: '#0ea5e9',
    border: 'border-sky-200/70',
    badge: 'bg-sky-500/12 text-sky-700',
  },
};

function ToastItem({ toast, onDismiss }) {
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const Icon = style.icon;

  return (
    <div className={`toast-slide-down pointer-events-auto overflow-hidden rounded-[1.6rem] border ${style.border} bg-white/95 shadow-[0_22px_60px_rgba(2,8,23,0.24)] backdrop-blur`}>
      <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
        <div
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${style.accent}1a`, color: style.accent }}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${style.badge}`}>
            {toast.type}
          </span>
          <p className="mt-2 text-sm font-semibold sm:text-base" style={{ color: '#16a34a' }}>
            {toast.title}
          </p>
          {toast.description ? (
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {toast.description}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timeoutId = timeoutsRef.current.get(id);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(({ title, description = '', type = 'info', duration = 4200 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setToasts((current) => [...current, { id, title, description, type }].slice(-4));

    const timeoutId = window.setTimeout(() => {
      dismissToast(id);
    }, duration);

    timeoutsRef.current.set(id, timeoutId);
    return id;
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
        <div className="w-full max-w-xl space-y-3">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider.');
  }

  return context;
}
