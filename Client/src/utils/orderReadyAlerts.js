const STORAGE_KEY_PREFIX = "cashier_order_ready_alerts";

const getStorageKey = (userId) => `${STORAGE_KEY_PREFIX}_${userId || "unknown"}`;

const parseAlerts = (rawValue) => {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        orderId: item?.orderId,
        type: item?.type === "rejected" ? "rejected" : "ready",
        message: String(item?.message || ""),
        createdAt: Number(item?.createdAt || Date.now()),
      }))
      .filter((item) => item.orderId != null && item.message);
  } catch {
    return [];
  }
};

export const loadOrderReadyAlerts = (userId) => {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = localStorage.getItem(getStorageKey(userId));
  return parseAlerts(stored);
};

export const saveOrderReadyAlerts = (userId, alerts) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(getStorageKey(userId), JSON.stringify(alerts || []));
};

const addOrderAlert = (currentAlerts, order, type) => {
  if (!order?.or_id) {
    return currentAlerts;
  }

  const orderId = Number(order.or_id);
  const exists = currentAlerts.some((item) => Number(item.orderId) === orderId);
  if (exists) {
    return currentAlerts;
  }

  const orderNumber = String(orderId).padStart(5, "0");
  const isRejected = type === "rejected";

  return [
    {
      orderId,
      type,
      message: isRejected
        ? `Order #${orderNumber} has been rejected by the kitchen.`
        : `Order #${orderNumber} is ready for pickup.`,
      createdAt: Date.now(),
    },
    ...currentAlerts,
  ];
};

export const addOrderReadyAlert = (currentAlerts, order) =>
  addOrderAlert(currentAlerts, order, "ready");

export const addOrderRejectedAlert = (currentAlerts, order) =>
  addOrderAlert(currentAlerts, order, "rejected");

export const dismissOrderReadyAlert = (currentAlerts, orderId) => {
  const target = Number(orderId);
  return currentAlerts.filter((item) => Number(item.orderId) !== target);
};
