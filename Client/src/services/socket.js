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
  }
};

// Helper function to leave branch user room
export const leaveBranchUserRoom = (branchId) => {
  const socket = getSocket();
  if (socket && socket.connected && branchId) {
    socket.emit(SOCKET_EVENTS.LEAVE_BRANCH_USER_ROOM, branchId);
  }
};