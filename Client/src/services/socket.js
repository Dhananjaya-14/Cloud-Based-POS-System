import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

let socket;

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