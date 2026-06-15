// Client/src/services/socket.js
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

let socket;

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
};

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: {
        token: localStorage.getItem("token") || null,
      },
    });

    if (import.meta.env.MODE !== "production") {
      socket.on("connect", () => {
        console.debug("socket connected", socket.id);
      });

      socket.on("disconnect", (reason) => {
        console.debug("socket disconnected", reason);
      });

      socket.on("connect_error", (err) => {
        console.debug("socket connect_error", err.message || err);
      });

      socket.onAny((event, ...args) => {
        console.debug("socket event received", event, args);
      });
    }
  }

  return socket;
};

export const connectSocket = () => {
  const activeSocket = getSocket();

  activeSocket.auth = {
    token: localStorage.getItem("token") || null,
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

// Helper function to join company room (for recipe and supplier updates)
export const joinCompanyRoom = (companyId) => {
  const socket = getSocket();
  if (socket && socket.connected && companyId) {
    // Company room is automatically joined on connection based on user.com_id
    // This function is for explicit joining if needed
    console.log(`Company room ${companyId} should be auto-joined`);
  }
};

// Helper function to listen for recipe events
export const subscribeToRecipeUpdates = (productId, callbacks) => {
  const socket = getSocket();
  if (!socket) return () => {};

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
  if (!socket) return () => {};

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
  if (!socket) return () => {};

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