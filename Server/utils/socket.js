import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { ROLES } from "../middleware/authMiddleware.js";

let io;

const BRANCH_UPDATE_ROOM = "branch-updates";
const KITCHEN_UPDATE_ROOM = "kitchen-updates";
export const ADMIN_PAYMENT_ROOM = "admin-payments";
export const ADMIN_SUPPLIER_PAYMENT_ROOM = "admin-supplier-payments";
export const ADMIN_PURCHASE_ORDER_ROOM = "admin-purchase-orders";

export const getCashierSocketRoom = (userId) => `cashier-updates:${userId}`;

// Socket event names
export const SOCKET_EVENTS = {
  NEW_PRODUCT_ADDED: "new_product_added",
  PRODUCT_UPDATED: "product_updated",
  PRODUCT_DELETED: "product_deleted",
  JOIN_BRANCH_ROOM: "join_branch_room",
  LEAVE_BRANCH_ROOM: "leave_branch_room",
};

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
      methods: ["GET", "POST"],
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

    // Join existing rooms based on role
    if ([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BRANCH_ADMIN].includes(roleId)) {
      socket.join(BRANCH_UPDATE_ROOM);
      // Admins should also receive real‑time payment updates
      socket.join(ADMIN_PAYMENT_ROOM);
    }

    if (roleId === ROLES.CASHIER && socket.user?.u_id) {
      socket.join(getCashierSocketRoom(socket.user.u_id));
    }

    if (roleId === ROLES.KITCHEN_STAFF) {
      socket.join(KITCHEN_UPDATE_ROOM);
    }

    // Join company-specific room
    if (socket.user?.com_id) {
      const companyRoom = `company_${socket.user.com_id}`;
      socket.join(companyRoom);
      console.log(`Socket ${socket.id} joined room: ${companyRoom}`);
    }

    // Join branch-specific room (for branch admins)
    socket.on(SOCKET_EVENTS.JOIN_BRANCH_ROOM, (branchId) => {
      if (branchId) {
        const branchRoom = `branch_${branchId}`;
        socket.join(branchRoom);
        console.log(`Socket ${socket.id} joined branch room: ${branchRoom}`);
      }
    });

    // Leave branch-specific room
    socket.on(SOCKET_EVENTS.LEAVE_BRANCH_ROOM, (branchId) => {
      if (branchId) {
        const branchRoom = `branch_${branchId}`;
        socket.leave(branchRoom);
        console.log(`Socket ${socket.id} left branch room: ${branchRoom}`);
      }
    });

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

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
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

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
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
