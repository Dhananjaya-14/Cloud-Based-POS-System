import { Server } from "socket.io";

let io;

export const initializeSocket = (httpServer) => {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      credentials: true,
    },
  });

  console.log("✓ Socket.IO initialized with CORS origin:", process.env.CLIENT_URL || "*");

  io.on("connection", (socket) => {
    socket.emit("socket:ready", {
      message: "WebSocket connection established",
      socketId: socket.id,
    });

    socket.on("socket:ping", (payload, acknowledgement) => {
      const response = {
        ok: true,
        timestamp: new Date().toISOString(),
        payload: payload ?? null,
      };

      if (typeof acknowledgement === "function") {
        acknowledgement(response);
        return;
      }

      socket.emit("socket:pong", response);
    });
  });

  return io;
};

export const getSocketIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized yet.");
  }

  return io;
};

export const emitSocketEvent = (eventName, payload) => {
  if (!io) {
    return false;
  }

  io.emit(eventName, payload);
  return true;
};