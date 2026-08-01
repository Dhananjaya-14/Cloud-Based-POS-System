import React from "react";

const OrderReadyAlerts = ({ alerts, onDismiss }) => {
  if (!alerts?.length) {
    return null;
  }

  const getTone = (type) => {
    if (type === "rejected") {
      return {
        wrapper: "border-rose-200 bg-rose-50",
        icon: "bg-rose-600",
        title: "Order Rejected",
        message: "text-rose-800",
        action: "text-rose-900 hover:bg-rose-200",
      };
    }

    return {
      wrapper: "border-emerald-200 bg-emerald-50",
      icon: "bg-emerald-600",
      title: "Order Ready",
      message: "text-emerald-800",
      action: "text-emerald-900 hover:bg-emerald-200",
    };
  };

  return (
    <div className="fixed top-20 right-4 z-[9999] flex w-[min(92vw,420px)] flex-col gap-2">
      {alerts.map((alert) => (
        (() => {
          const tone = getTone(alert.type);
          return (
        <div
          key={alert.orderId}
              className={`rounded-xl border px-4 py-3 shadow-lg ${tone.wrapper}`}
        >
          <div className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-white ${tone.icon}`}>
              !
            </span>
            <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{tone.title}</p>
                  <p className={`mt-0.5 text-sm ${tone.message}`}>{alert.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(alert.orderId)}
                  className={`ml-1 rounded-md px-2 py-1 text-sm font-semibold ${tone.action}`}
              aria-label={`Dismiss order ${alert.orderId} alert`}
            >
              x
            </button>
          </div>
        </div>
          );
        })()
      ))}
    </div>
  );
};

export default OrderReadyAlerts;
