import React, { useEffect, useState } from "react";

/**
 * Toast notification component for super-admin.
 *
 * Props:
 *   toasts  – array of { id, type, title, message }
 *             type: 'success' | 'error' | 'info'
 *   remove  – function(id) called when toast is dismissed
 */

const ICONS = {
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#16A34A" fillOpacity="0.15" />
      <path d="M6 10.5l3 3 5-6" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#EF4444" fillOpacity="0.15" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#0EA5E9" fillOpacity="0.15" />
      <path d="M10 9v5M10 7h.01" stroke="#0EA5E9" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

const COLORS = {
  success: { border: "#BBF7D0", bg: "#F0FDF4", title: "#15803D", bar: "#16A34A" },
  error:   { border: "#FECACA", bg: "#FEF2F2", title: "#DC2626", bar: "#EF4444" },
  info:    { border: "#BAE6FD", bg: "#F0F9FF", title: "#0369A1", bar: "#0EA5E9" },
};

const Toast = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const colors = COLORS[toast.type] || COLORS.info;

  useEffect(() => {
    // Slide in
    const inTimer = setTimeout(() => setVisible(true), 10);
    // Start slide-out just before removal
    const outTimer = setTimeout(() => setLeaving(true), 3600);
    // Trigger removal
    const removeTimer = setTimeout(() => onRemove(toast.id), 4000);
    return () => {
      clearTimeout(inTimer);
      clearTimeout(outTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 350);
  };

  return (
    <div
      style={{
        width: 340,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.05)",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        position: "relative",
        overflow: "hidden",
        transform: visible && !leaving ? "translateX(0)" : "translateX(calc(100% + 24px))",
        opacity: visible && !leaving ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
        marginBottom: 10,
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 3,
          background: colors.bar,
          borderRadius: "0 0 0 12px",
          animation: "toast-progress 4s linear forwards",
        }}
      />

      {/* Icon */}
      <div style={{ flexShrink: 0, marginTop: 1 }}>{ICONS[toast.type] || ICONS.info}</div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{ fontWeight: 700, fontSize: 14, color: colors.title, marginBottom: 2 }}>
            {toast.title}
          </div>
        )}
        {toast.message && (
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
            {toast.message}
          </div>
        )}
      </div>

      {/* Close */}
      <button
        onClick={handleClose}
        style={{
          flexShrink: 0, background: "transparent", border: "none",
          cursor: "pointer", padding: "2px 4px", color: "#9CA3AF",
          fontSize: 18, lineHeight: 1, marginTop: -2,
        }}
      >
        ×
      </button>

      {/* Global keyframe style injected once */}
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

/**
 * ToastContainer renders all toasts in the top-right corner.
 * Place once at the root of any page that uses toasts.
 */
export const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts.length) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "all" }}>
          <Toast toast={t} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
};

/**
 * useToast hook — returns { toasts, toast }
 *
 * Usage:
 *   const { toasts, toast } = useToast();
 *   toast.success("Branch Created", "Hill City branch was added successfully.");
 *   toast.error("Error", "Something went wrong.");
 *   toast.info("Info", "Some info message.");
 *
 *   // Render:
 *   <ToastContainer toasts={toasts} removeToast={...} />
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    removeToast,
    toast: {
      success: (title, message) => addToast("success", title, message),
      error:   (title, message) => addToast("error", title, message),
      info:    (title, message) => addToast("info", title, message),
    },
  };
};

export default Toast;
