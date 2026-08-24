// Client/src/services/socket.js
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

let socket;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Socket event names
export const SOCKET_EVENTS = {
  NEW_PRODUCT_ADDED: "new_product_added",
  PRODUCT_UPDATED: "product_updated",
  PRODUCT_DELETED: "product_deleted",
  JOIN_BRANCH_ROOM: "join_branch_room",
  LEAVE_BRANCH_ROOM: "leave_branch_room",
  // User management events
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated",
  USER_DELETED: "user_deleted",
  JOIN_BRANCH_USER_ROOM: "join_branch_user_room",
  LEAVE_BRANCH_USER_ROOM: "leave_branch_user_room",
  // Inventory events
  INVENTORY_CREATED: "inventory:created",
  INVENTORY_UPDATED: "inventory:updated",
  INVENTORY_DELETED: "inventory:deleted",
  // Recipe events
  RECIPE_CREATED: "recipe:created",
  RECIPE_BULK_CREATED: "recipe:bulk_created",
  RECIPE_UPDATED: "recipe:updated",
  RECIPE_DELETED: "recipe:deleted",
  RECIPE_PRODUCT_CLEARED: "recipe:product_cleared",
  // Supplier events
  SUPPLIER_CREATED: "supplier:created",
  SUPPLIER_UPDATED: "supplier:updated",
  SUPPLIER_DELETED: "supplier:deleted",
  // Branch product events
  BRANCH_PRODUCT_ADDED: "branch_product_added",
  BRANCH_PRODUCT_UPDATED: "branch_product_updated",
  BRANCH_PRODUCT_DELETED: "branch_product_deleted",
  // PayHere payment events
  PAYHERE_PAYMENT_CONFIRMED: "payhere:payment_confirmed",
  // Company management events
  COMPANY_CREATED: "company:created",
  COMPANY_UPDATED: "company:updated",
  COMPANY_DELETED: "company:deleted",
  JOIN_COMPANY_ROOM: "join_company_room",
  LEAVE_COMPANY_ROOM: "leave_company_room",
  // Branch events
  BRANCH_CREATED: "branch:created",
  BRANCH_UPDATED: "branch:updated",
  BRANCH_DELETED: "branch:deleted",
  // Activity Log events
  ACTIVITY_LOG_CHANGED: "activity_log:changed",
  // Table events
  TABLE_UPDATED: "table:updated",
  // Order workflow events
  ORDER_SENT: "order:sent",
  ORDER_ACCEPTED: "order:accepted",
  ORDER_READY: "order:ready",
  ORDER_UPDATED: "order:updated",
};

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem("token");

    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: {
        token: token || null,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
    });

    if (import.meta.env.MODE !== "production") {
      socket.on("connect", () => {
        console.debug("✅ socket connected", socket.id);
        reconnectAttempts = 0;
        // Auto-join branch updates room
        socket.emit("join_branch_updates");
      });

      socket.on("disconnect", (reason) => {
        console.debug("❌ socket disconnected", reason);
      });

      socket.on("connect_error", (err) => {
        console.debug("⚠️ socket connect_error", err.message || err);
        reconnectAttempts++;
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error("❌ Max reconnection attempts reached");
        }
      });

      socket.onAny((event, ...args) => {
        console.debug("📡 socket event received", event, args);
      });
    }
  }

  return socket;
};

export const connectSocket = () => {
  const activeSocket = getSocket();

  // Update auth token before connecting
  const token = localStorage.getItem("token");
  activeSocket.auth = {
    token: token || null,
  };

  if (!activeSocket.connected) {
    activeSocket.connect();
  }

  return activeSocket;
};

export const disconnectSocket = () => {
  if (!socket) {
    return;
  }

  socket.disconnect();
  socket = undefined;
};

export const getSocketUrl = () => SOCKET_URL;

// Helper function to join branch updates room
export const joinBranchUpdatesRoom = () => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit("join_branch_updates");
    console.log("✅ Joined branch updates room");
  }
};

// Helper function to join company room
export const joinCompanyRoom = (companyId) => {
  const socket = getSocket();
  if (socket && socket.connected && companyId) {
    socket.emit(SOCKET_EVENTS.JOIN_COMPANY_ROOM, companyId);
    console.log(`✅ Joined company room ${companyId}`);
  }
};

// Helper function to leave company room
export const leaveCompanyRoom = (companyId) => {
  const socket = getSocket();
  if (socket && socket.connected && companyId) {
    socket.emit(SOCKET_EVENTS.LEAVE_COMPANY_ROOM, companyId);
    console.log(`Left company room ${companyId}`);
  }
};

// Helper function to join branch user room
export const joinBranchUserRoom = (branchId) => {
  const socket = getSocket();
  if (socket && socket.connected && branchId) {
    socket.emit(SOCKET_EVENTS.JOIN_BRANCH_USER_ROOM, branchId);
    console.log(`Joined user room for branch ${branchId}`);
  }
};

// Helper function to leave branch user room
export const leaveBranchUserRoom = (branchId) => {
  const socket = getSocket();
  if (socket && socket.connected && branchId) {
    socket.emit(SOCKET_EVENTS.LEAVE_BRANCH_USER_ROOM, branchId);
    console.log(`Left user room for branch ${branchId}`);
  }
};

// Helper function to join branch inventory room
export const joinBranchInventoryRoom = (branchId) => {
  const socket = getSocket();
  if (socket && socket.connected && branchId) {
    socket.emit(SOCKET_EVENTS.JOIN_BRANCH_ROOM, branchId);
    console.log(`Joined inventory room for branch ${branchId}`);
  }
};

// Helper function to leave branch inventory room
export const leaveBranchInventoryRoom = (branchId) => {
  const socket = getSocket();
  if (socket && socket.connected && branchId) {
    socket.emit(SOCKET_EVENTS.LEAVE_BRANCH_ROOM, branchId);
    console.log(`Left inventory room for branch ${branchId}`);
  }
};

// Helper function to subscribe to user updates (for super admins and admins)
export const subscribeToUserUpdates = (callbacks) => {
  const socket = getSocket();
  if (!socket) return () => { };

  const {
    onUserCreated,
    onUserUpdated,
    onUserDeleted
  } = callbacks;

  // Join branch updates room for super admins
  joinBranchUpdatesRoom();

  if (onUserCreated) {
    socket.on(SOCKET_EVENTS.USER_CREATED, onUserCreated);
  }
  if (onUserUpdated) {
    socket.on(SOCKET_EVENTS.USER_UPDATED, onUserUpdated);
  }
  if (onUserDeleted) {
    socket.on(SOCKET_EVENTS.USER_DELETED, onUserDeleted);
  }

  // Return unsubscribe function
  return () => {
    if (onUserCreated) {
      socket.off(SOCKET_EVENTS.USER_CREATED, onUserCreated);
    }
    if (onUserUpdated) {
      socket.off(SOCKET_EVENTS.USER_UPDATED, onUserUpdated);
    }
    if (onUserDeleted) {
      socket.off(SOCKET_EVENTS.USER_DELETED, onUserDeleted);
    }
  };
};

// Helper function to subscribe to company updates
export const subscribeToCompanyUpdates = (callbacks) => {
  const socket = getSocket();
  if (!socket) return () => { };

  const {
    onCompanyCreated,
    onCompanyUpdated,
    onCompanyDeleted
  } = callbacks;

  if (onCompanyCreated) {
    socket.on(SOCKET_EVENTS.COMPANY_CREATED, onCompanyCreated);
  }
  if (onCompanyUpdated) {
    socket.on(SOCKET_EVENTS.COMPANY_UPDATED, onCompanyUpdated);
  }
  if (onCompanyDeleted) {
    socket.on(SOCKET_EVENTS.COMPANY_DELETED, onCompanyDeleted);
  }

  // Return unsubscribe function
  return () => {
    if (onCompanyCreated) {
      socket.off(SOCKET_EVENTS.COMPANY_CREATED, onCompanyCreated);
    }
    if (onCompanyUpdated) {
      socket.off(SOCKET_EVENTS.COMPANY_UPDATED, onCompanyUpdated);
    }
    if (onCompanyDeleted) {
      socket.off(SOCKET_EVENTS.COMPANY_DELETED, onCompanyDeleted);
    }
  };
};

// Helper function to listen for product updates
export const subscribeToProductUpdates = (companyId, callbacks) => {
  const socket = getSocket();
  if (!socket) return () => { };

  const {
    onProductAdded,
    onProductUpdated,
    onProductDeleted
  } = callbacks;

  // Join company room first
  if (companyId) {
    joinCompanyRoom(companyId);
  }

  if (onProductAdded) {
    socket.on(SOCKET_EVENTS.NEW_PRODUCT_ADDED, onProductAdded);
  }
  if (onProductUpdated) {
    socket.on(SOCKET_EVENTS.PRODUCT_UPDATED, onProductUpdated);
  }
  if (onProductDeleted) {
    socket.on(SOCKET_EVENTS.PRODUCT_DELETED, onProductDeleted);
  }

  // Return unsubscribe function
  return () => {
    if (onProductAdded) {
      socket.off(SOCKET_EVENTS.NEW_PRODUCT_ADDED, onProductAdded);
    }
    if (onProductUpdated) {
      socket.off(SOCKET_EVENTS.PRODUCT_UPDATED, onProductUpdated);
    }
    if (onProductDeleted) {
      socket.off(SOCKET_EVENTS.PRODUCT_DELETED, onProductDeleted);
    }
  };
};

// Helper function to listen for recipe events
export const subscribeToRecipeUpdates = (productId, callbacks) => {
  const socket = getSocket();
  if (!socket) return () => { };

  const {
    onRecipeCreated,
    onRecipeBulkCreated,
    onRecipeUpdated,
    onRecipeDeleted,
    onRecipeProductCleared
  } = callbacks;

  if (onRecipeCreated) {
    socket.on(SOCKET_EVENTS.RECIPE_CREATED, onRecipeCreated);
  }
  if (onRecipeBulkCreated) {
    socket.on(SOCKET_EVENTS.RECIPE_BULK_CREATED, onRecipeBulkCreated);
  }
  if (onRecipeUpdated) {
    socket.on(SOCKET_EVENTS.RECIPE_UPDATED, onRecipeUpdated);
  }
  if (onRecipeDeleted) {
    socket.on(SOCKET_EVENTS.RECIPE_DELETED, onRecipeDeleted);
  }
  if (onRecipeProductCleared) {
    socket.on(SOCKET_EVENTS.RECIPE_PRODUCT_CLEARED, onRecipeProductCleared);
  }

  // Return unsubscribe function
  return () => {
    if (onRecipeCreated) {
      socket.off(SOCKET_EVENTS.RECIPE_CREATED, onRecipeCreated);
    }
    if (onRecipeBulkCreated) {
      socket.off(SOCKET_EVENTS.RECIPE_BULK_CREATED, onRecipeBulkCreated);
    }
    if (onRecipeUpdated) {
      socket.off(SOCKET_EVENTS.RECIPE_UPDATED, onRecipeUpdated);
    }
    if (onRecipeDeleted) {
      socket.off(SOCKET_EVENTS.RECIPE_DELETED, onRecipeDeleted);
    }
    if (onRecipeProductCleared) {
      socket.off(SOCKET_EVENTS.RECIPE_PRODUCT_CLEARED, onRecipeProductCleared);
    }
  };
};

// Helper function to listen for supplier events
export const subscribeToSupplierUpdates = (callbacks) => {
  const socket = getSocket();
  if (!socket) return () => { };

  const {
    onSupplierCreated,
    onSupplierUpdated,
    onSupplierDeleted
  } = callbacks;

  if (onSupplierCreated) {
    socket.on(SOCKET_EVENTS.SUPPLIER_CREATED, onSupplierCreated);
  }
  if (onSupplierUpdated) {
    socket.on(SOCKET_EVENTS.SUPPLIER_UPDATED, onSupplierUpdated);
  }
  if (onSupplierDeleted) {
    socket.on(SOCKET_EVENTS.SUPPLIER_DELETED, onSupplierDeleted);
  }

  // Return unsubscribe function
  return () => {
    if (onSupplierCreated) {
      socket.off(SOCKET_EVENTS.SUPPLIER_CREATED, onSupplierCreated);
    }
    if (onSupplierUpdated) {
      socket.off(SOCKET_EVENTS.SUPPLIER_UPDATED, onSupplierUpdated);
    }
    if (onSupplierDeleted) {
      socket.off(SOCKET_EVENTS.SUPPLIER_DELETED, onSupplierDeleted);
    }
  };
};

// Helper function to listen for inventory events
export const subscribeToInventoryUpdates = (branchId, callbacks) => {
  const socket = getSocket();
  if (!socket) return () => { };

  const {
    onInventoryCreated,
    onInventoryUpdated,
    onInventoryDeleted
  } = callbacks;

  // Join the branch room first
  if (branchId) {
    joinBranchInventoryRoom(branchId);
  }

  if (onInventoryCreated) {
    socket.on(SOCKET_EVENTS.INVENTORY_CREATED, onInventoryCreated);
  }
  if (onInventoryUpdated) {
    socket.on(SOCKET_EVENTS.INVENTORY_UPDATED, onInventoryUpdated);
  }
  if (onInventoryDeleted) {
    socket.on(SOCKET_EVENTS.INVENTORY_DELETED, onInventoryDeleted);
  }

  // Return unsubscribe function
  return () => {
    if (onInventoryCreated) {
      socket.off(SOCKET_EVENTS.INVENTORY_CREATED, onInventoryCreated);
    }
    if (onInventoryUpdated) {
      socket.off(SOCKET_EVENTS.INVENTORY_UPDATED, onInventoryUpdated);
    }
    if (onInventoryDeleted) {
      socket.off(SOCKET_EVENTS.INVENTORY_DELETED, onInventoryDeleted);
    }
    if (branchId) {
      leaveBranchInventoryRoom(branchId);
    }
  };
};

// Helper function to listen for branch product events (specifically for branch admins)
export const subscribeToBranchProductUpdates = (branchId, callbacks) => {
  const socket = getSocket();
  if (!socket) return () => { };

  const {
    onBranchProductAdded,
    onBranchProductUpdated,
    onBranchProductDeleted
  } = callbacks;

  // Join the branch room first
  if (branchId) {
    joinBranchInventoryRoom(branchId);
  }

  if (onBranchProductAdded) {
    socket.on(SOCKET_EVENTS.BRANCH_PRODUCT_ADDED, onBranchProductAdded);
  }
  if (onBranchProductUpdated) {
    socket.on(SOCKET_EVENTS.BRANCH_PRODUCT_UPDATED, onBranchProductUpdated);
  }
  if (onBranchProductDeleted) {
    socket.on(SOCKET_EVENTS.BRANCH_PRODUCT_DELETED, onBranchProductDeleted);
  }

  // Return unsubscribe function
  return () => {
    if (onBranchProductAdded) {
      socket.off(SOCKET_EVENTS.BRANCH_PRODUCT_ADDED, onBranchProductAdded);
    }
    if (onBranchProductUpdated) {
      socket.off(SOCKET_EVENTS.BRANCH_PRODUCT_UPDATED, onBranchProductUpdated);
    }
    if (onBranchProductDeleted) {
      socket.off(SOCKET_EVENTS.BRANCH_PRODUCT_DELETED, onBranchProductDeleted);
    }
    if (branchId) {
      leaveBranchInventoryRoom(branchId);
    }
  };
};

// Helper function to listen for PayHere payment events
export const subscribeToPayHereUpdates = (orderId, callbacks) => {
  const socket = getSocket();
  if (!socket) return () => { };

  const {
    onPaymentConfirmed,
  } = callbacks;

  // Join a room specific to this order
  if (orderId && socket.connected) {
    socket.emit("join_order_room", orderId);
    console.log(`Joined order room for order ${orderId}`);
  }

  if (onPaymentConfirmed) {
    socket.on(SOCKET_EVENTS.PAYHERE_PAYMENT_CONFIRMED, onPaymentConfirmed);
  }

  // Return unsubscribe function
  return () => {
    if (onPaymentConfirmed) {
      socket.off(SOCKET_EVENTS.PAYHERE_PAYMENT_CONFIRMED, onPaymentConfirmed);
    }
    if (orderId && socket.connected) {
      socket.emit("leave_order_room", orderId);
    }
  };
};

// Helper function to listen for order events
export const subscribeToOrderUpdates = (branchId, callbacks) => {
  const socket = getSocket();
  if (!socket) return () => { };

  const {
    onOrderSent,
    onOrderAccepted,
    onOrderReady,
    onOrderUpdated
  } = callbacks;

  // Join the branch room first
  if (branchId) {
    joinBranchInventoryRoom(branchId);
  }

  if (onOrderSent) {
    socket.on(SOCKET_EVENTS.ORDER_SENT, onOrderSent);
  }
  if (onOrderAccepted) {
    socket.on(SOCKET_EVENTS.ORDER_ACCEPTED, onOrderAccepted);
  }
  if (onOrderReady) {
    socket.on(SOCKET_EVENTS.ORDER_READY, onOrderReady);
  }
  if (onOrderUpdated) {
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, onOrderUpdated);
  }

  // Return unsubscribe function
  return () => {
    if (onOrderSent) {
      socket.off(SOCKET_EVENTS.ORDER_SENT, onOrderSent);
    }
    if (onOrderAccepted) {
      socket.off(SOCKET_EVENTS.ORDER_ACCEPTED, onOrderAccepted);
    }
    if (onOrderReady) {
      socket.off(SOCKET_EVENTS.ORDER_READY, onOrderReady);
    }
    if (onOrderUpdated) {
      socket.off(SOCKET_EVENTS.ORDER_UPDATED, onOrderUpdated);
    }
    if (branchId) {
      leaveBranchInventoryRoom(branchId);
    }
  };
};

// Helper function to listen for activity log changes
export const subscribeToActivityLogUpdates = (callbacks) => {
  const socket = getSocket();
  if (!socket) return () => { };

  const {
    onActivityLogChanged
  } = callbacks;

  if (onActivityLogChanged) {
    socket.on(SOCKET_EVENTS.ACTIVITY_LOG_CHANGED, onActivityLogChanged);
  }

  // Return unsubscribe function
  return () => {
    if (onActivityLogChanged) {
      socket.off(SOCKET_EVENTS.ACTIVITY_LOG_CHANGED, onActivityLogChanged);
    }
  };
};

export const subscribeToTableUpdates = (branchId, callbacks) => {
  const socket = getSocket();
  if (!socket) return () => { };

  const { onTableUpdated } = callbacks;

  if (branchId) {
    joinBranchInventoryRoom(branchId);
  }

  if (onTableUpdated) {
    socket.on(SOCKET_EVENTS.TABLE_UPDATED, onTableUpdated);
  }

  return () => {
    if (onTableUpdated) {
      socket.off(SOCKET_EVENTS.TABLE_UPDATED, onTableUpdated);
    }
    if (branchId) {
      leaveBranchInventoryRoom(branchId);
    }
  };
};

// Helper function to listen for admin statistics updates
export const subscribeToAdminStatsUpdates = (callbacks) => {
  const socket = getSocket();
  if (!socket) return () => {};

  const {
    onOrderCreated,
    onOrderUpdated,
    onPaymentCompleted,
    onBranchChanged,
    onPurchaseOrderReceived
  } = callbacks;

  if (onOrderCreated) {
    socket.on("order:created", onOrderCreated);
  }
  if (onOrderUpdated) {
    socket.on("order:updated", onOrderUpdated);
  }
  if (onPaymentCompleted) {
    socket.on("payment:completed", onPaymentCompleted);
  }
  if (onBranchChanged) {
    socket.on("branch:created", onBranchChanged);
    socket.on("branch:updated", onBranchChanged);
    socket.on("branch:deleted", onBranchChanged);
  }
  if (onPurchaseOrderReceived) {
    socket.on("purchase_order:updated", onPurchaseOrderReceived);
  }

  // Return unsubscribe function
  return () => {
    if (onOrderCreated) {
      socket.off("order:created", onOrderCreated);
    }
    if (onOrderUpdated) {
      socket.off("order:updated", onOrderUpdated);
    }
    if (onPaymentCompleted) {
      socket.off("payment:completed", onPaymentCompleted);
    }
    if (onBranchChanged) {
      socket.off("branch:created", onBranchChanged);
      socket.off("branch:updated", onBranchChanged);
      socket.off("branch:deleted", onBranchChanged);
    }
    if (onPurchaseOrderReceived) {
      socket.off("purchase_order:updated", onPurchaseOrderReceived);
    }
  };
};

export default {
  getSocket,
  connectSocket,
  disconnectSocket,
  getSocketUrl,
  SOCKET_EVENTS,
  joinCompanyRoom,
  leaveCompanyRoom,
  joinBranchUserRoom,
  leaveBranchUserRoom,
  joinBranchInventoryRoom,
  leaveBranchInventoryRoom,
  joinBranchUpdatesRoom,
  subscribeToUserUpdates,
  subscribeToCompanyUpdates,
  subscribeToProductUpdates,
  subscribeToRecipeUpdates,
  subscribeToSupplierUpdates,
  subscribeToInventoryUpdates,
  subscribeToBranchProductUpdates,
  subscribeToPayHereUpdates,
  subscribeToOrderUpdates,
  subscribeToActivityLogUpdates,
  subscribeToTableUpdates,
  subscribeToAdminStatsUpdates,
};