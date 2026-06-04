import React from "react";

const OrderReadyAlerts = ({ alerts, onDismiss }) => {
  if (!alerts?.length) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-[9999] flex w-[min(92vw,420px)] flex-col gap-2">
      {alerts.map((alert) => (
        <div
          key={alert.orderId}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
              !
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-900">Order Ready</p>
              <p className="mt-0.5 text-sm text-emerald-800">{alert.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(alert.orderId)}
              className="ml-1 rounded-md px-2 py-1 text-sm font-semibold text-emerald-900 hover:bg-emerald-200"
              aria-label={`Dismiss order ${alert.orderId} alert`}
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderReadyAlerts;
