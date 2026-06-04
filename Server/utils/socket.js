import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { ROLES } from "../middleware/authMiddleware.js";

let io;

const BRANCH_UPDATE_ROOM = "branch-updates";
const KITCHEN_UPDATE_ROOM = "kitchen-updates";

export const getCashierSocketRoom = (userId) => `cashier-updates:${userId}`;

function extractSocketToken(socket) {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.length > 0) {
    return authToken;
  }

  const queryToken = socket.handshake.query?.token;
  if (typeof queryToken === "string" && queryToken.length > 0) {
    return queryToken;
  }

  const headerToken = socket.handshake.headers?.authorization;
  if (typeof headerToken === "string" && headerToken.length > 0) {
    return headerToken.startsWith("Bearer ") ? headerToken.slice(7) : headerToken;
  }

  return null;
}

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

  io.use((socket, next) => {
    try {
      const token = extractSocketToken(socket);

      if (!token) {
        return next(new Error("Unauthorized socket connection."));
      }

      if (!process.env.JWT_SECRET) {
        return next(new Error("JWT_SECRET is not configured."));
      }

      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch (error) {
      return next(new Error("Unauthorized socket connection."));
    }
  });

  console.log("✓ Socket.IO initialized with CORS origin:", process.env.CLIENT_URL || "*");

  io.on("connection", (socket) => {
    const roleId = Number(socket.user?.role_id);

    if ([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BRANCH_ADMIN].includes(roleId)) {
      socket.join(BRANCH_UPDATE_ROOM);
    }

    if (roleId === ROLES.CASHIER && socket.user?.u_id) {
      socket.join(getCashierSocketRoom(socket.user.u_id));
    }

    if (roleId === ROLES.KITCHEN_STAFF) {
      socket.join(KITCHEN_UPDATE_ROOM);
    }

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

export const emitSocketEvent = (eventName, payload, options = {}) => {
  if (!io) {
    return false;
  }

  // Debug logging when not in production
  if (process.env.NODE_ENV !== "production") {
    try {
      const roomInfo = options.room ? ` to room=${options.room}` : " to all";
      // eslint-disable-next-line no-console
      console.log(`Socket emit -> ${eventName}${roomInfo}`, payload);
    } catch (e) {
      // ignore logging errors
    }
  }

  if (options.room) {
    io.to(options.room).emit(eventName, payload);
    return true;
  }

  io.emit(eventName, payload);
  return true;
};

export const BRANCH_SOCKET_ROOM = BRANCH_UPDATE_ROOM;
export const KITCHEN_SOCKET_ROOM = KITCHEN_UPDATE_ROOM;
