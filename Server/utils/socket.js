// Server/utils/socket.js
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
  ACTIVITY_LOG_CHANGED: "activity_log:changed",
  // Table events
  TABLE_UPDATED: "table:updated",
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

// Helper function to get branch user room name
export const getBranchUserRoom = (branchId) => `branch_users_${branchId}`;

// Helper function to get branch inventory room name
export const getBranchInventoryRoom = (branchId) => `branch_${branchId}`;

// Helper function to get company room name
export const getCompanyRoom = (companyId) => `company_${companyId}`;

// Helper function to emit company events
export const emitCompanyEvent = (eventName, companyData, companyId = null) => {
  if (!io) return false;
  
  if (companyId) {
    const room = getCompanyRoom(companyId);
    io.to(room).emit(eventName, companyData);
    console.log(`Emitted ${eventName} to company room ${room}`, companyData);
  } else {
    // Emit to all connected clients (for super admins)
    io.emit(eventName, companyData);
    console.log(`Emitted ${eventName} to all clients`, companyData);
  }
  
  return true;
};

// Helper function to emit branch product events
export const emitBranchProductEvent = (branchId, eventName, data) => {
  if (!io) return false;
  const room = getBranchInventoryRoom(branchId);
  io.to(room).emit(eventName, data);
  console.log(`Emitted ${eventName} to room ${room}`, data);
  return true;
};

// Helper function to emit user events to branch
export const emitUserEventToBranch = (branchId, eventName, userData) => {
  if (!io) return false;
  const room = getBranchUserRoom(branchId);
  io.to(room).emit(eventName, userData);
  console.log(`Emitted ${eventName} to room ${room}`, userData);
  return true;
};

// Helper function to emit branch events
export const emitBranchEvent = (eventName, branchData, branchId = null) => {
  if (!io) return false;
  
  // Always emit to the branch-updates room for super admins
  io.to(BRANCH_UPDATE_ROOM).emit(eventName, branchData);
  console.log(`Emitted ${eventName} to BRANCH_UPDATE_ROOM`, branchData);
  
  // Also emit to company-specific room if branch has company ID
  if (branchData?.com_id) {
    const companyRoom = getCompanyRoom(branchData.com_id);
    io.to(companyRoom).emit(eventName, branchData);
    console.log(`Emitted ${eventName} to company room ${companyRoom}`, branchData);
  }
  
  return true;
};

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
      console.error("Socket auth error:", error.message);
      return next(new Error("Unauthorized socket connection."));
    }
  });

  console.log("✓ Socket.IO initialized with CORS origin:", process.env.CLIENT_URL || "*");

  io.on("connection", (socket) => {
    const roleId = Number(socket.user?.role_id);
    const branchId = socket.user?.b_id;
    const companyId = socket.user?.com_id;

    console.log(`Socket connected: ${socket.id}, Role: ${roleId}, Branch: ${branchId}, Company: ${companyId}`);

    // Join existing rooms based on role
    if ([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BRANCH_ADMIN].includes(roleId)) {
      socket.join(BRANCH_UPDATE_ROOM);
      console.log(`Socket ${socket.id} joined BRANCH_UPDATE_ROOM`);
      
      // For branch admins, join their specific branch user room
      if (roleId === ROLES.BRANCH_ADMIN && branchId) {
        const branchUserRoom = getBranchUserRoom(branchId);
        socket.join(branchUserRoom);
        console.log(`Branch admin ${socket.user?.u_id} joined user room: ${branchUserRoom}`);

        // Also auto-join inventory room for branch admins
        const branchRoom = getBranchInventoryRoom(branchId);
        socket.join(branchRoom);
        console.log(`Branch admin ${socket.user?.u_id} auto-joined inventory room: ${branchRoom}`);
      }
    }

    if (roleId === ROLES.CASHIER && socket.user?.u_id) {
      socket.join(getCashierSocketRoom(socket.user.u_id));
    }

    if (roleId === ROLES.KITCHEN_STAFF) {
      socket.join(KITCHEN_UPDATE_ROOM);
    }

    // Join company-specific room
    if (socket.user?.com_id) {
      const companyRoom = getCompanyRoom(socket.user.com_id);
      socket.join(companyRoom);
      console.log(`Socket ${socket.id} joined company room: ${companyRoom}`);
    }

    // Listen for explicit join company room requests
    socket.on(SOCKET_EVENTS.JOIN_COMPANY_ROOM, (companyId) => {
      if (companyId) {
        const companyRoom = getCompanyRoom(companyId);
        socket.join(companyRoom);
        console.log(`Socket ${socket.id} explicitly joined company room: ${companyRoom}`);
        socket.emit("company_room_joined", { companyId, room: companyRoom });
      }
    });

    // Listen for leaving company room
    socket.on(SOCKET_EVENTS.LEAVE_COMPANY_ROOM, (companyId) => {
      if (companyId) {
        const companyRoom = getCompanyRoom(companyId);
        socket.leave(companyRoom);
        console.log(`Socket ${socket.id} left company room: ${companyRoom}`);
        socket.emit("company_room_left", { companyId, room: companyRoom });
      }
    });

    // Listen for joining branch-specific rooms for inventory
    socket.on(SOCKET_EVENTS.JOIN_BRANCH_ROOM, (branchId) => {
      if (branchId) {
        const branchRoom = getBranchInventoryRoom(branchId);
        socket.join(branchRoom);
        console.log(`Socket ${socket.id} joined inventory room: ${branchRoom}`);
        socket.emit("branch_room_joined", { branchId, room: branchRoom });
      }
    });

    // Join branch user room (for real-time user updates)
    socket.on(SOCKET_EVENTS.JOIN_BRANCH_USER_ROOM, (branchId) => {
      if (branchId) {
        const branchUserRoom = getBranchUserRoom(branchId);
        socket.join(branchUserRoom);
        console.log(`Socket ${socket.id} joined user room: ${branchUserRoom}`);
      }
    });

    // Leave branch-specific room
    socket.on(SOCKET_EVENTS.LEAVE_BRANCH_ROOM, (branchId) => {
      if (branchId) {
        const branchRoom = getBranchInventoryRoom(branchId);
        socket.leave(branchRoom);
        console.log(`Socket ${socket.id} left inventory room: ${branchRoom}`);
        socket.emit("branch_room_left", { branchId, room: branchRoom });
      }
    });

    // Leave branch user room
    socket.on(SOCKET_EVENTS.LEAVE_BRANCH_USER_ROOM, (branchId) => {
      if (branchId) {
        const branchUserRoom = getBranchUserRoom(branchId);
        socket.leave(branchUserRoom);
        console.log(`Socket ${socket.id} left user room: ${branchUserRoom}`);
      }
    });

    // Listen for order room joining (for PayHere payment confirmation)
    socket.on("join_order_room", (orderId) => {
      if (orderId) {
        const orderRoom = `order_${orderId}`;
        socket.join(orderRoom);
        console.log(`Socket ${socket.id} joined order room: ${orderRoom}`);
      }
    });

    // Listen for leaving order room
    socket.on("leave_order_room", (orderId) => {
      if (orderId) {
        const orderRoom = `order_${orderId}`;
        socket.leave(orderRoom);
        console.log(`Socket ${socket.id} left order room: ${orderRoom}`);
      }
    });

    // Listen for explicit join branch update room
    socket.on("join_branch_updates", () => {
      socket.join(BRANCH_UPDATE_ROOM);
      console.log(`Socket ${socket.id} explicitly joined BRANCH_UPDATE_ROOM`);
      socket.emit("branch_updates_joined", { room: BRANCH_UPDATE_ROOM });
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
    console.warn(`Socket.io not initialized, cannot emit ${eventName}`);
    return false;
  }

  // Debug logging when not in production
  if (process.env.NODE_ENV !== "production") {
    try {
      const roomInfo = options.room ? ` to room=${options.room}` : " to all";
      console.log(`Socket emit -> ${eventName}${roomInfo}`, JSON.stringify(payload, null, 2));
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

// Helper function to emit PayHere payment confirmed event
export const emitPayHerePaymentConfirmed = (orderId, paymentData) => {
  if (!io) {
    return false;
  }

  const orderRoom = `order_${orderId}`;
  io.to(orderRoom).emit(SOCKET_EVENTS.PAYHERE_PAYMENT_CONFIRMED, {
    orderId,
    ...paymentData,
    confirmedAt: new Date().toISOString(),
  });

  // Also emit to the branch room for broader notification
  const branchRoom = getBranchInventoryRoom(paymentData.branchId);
  if (branchRoom) {
    io.to(branchRoom).emit(SOCKET_EVENTS.PAYHERE_PAYMENT_CONFIRMED, {
      orderId,
      ...paymentData,
      confirmedAt: new Date().toISOString(),
    });
  }

  console.log(`Emitted PAYHERE_PAYMENT_CONFIRMED for order ${orderId}`);
  return true;
};

export const BRANCH_SOCKET_ROOM = BRANCH_UPDATE_ROOM;
export const KITCHEN_SOCKET_ROOM = KITCHEN_UPDATE_ROOM;

export default {
  initializeSocket,
  getSocketIO,
  getIO,
  emitSocketEvent,
  emitPayHerePaymentConfirmed,
  getCashierSocketRoom,
  getBranchUserRoom,
  getBranchInventoryRoom,
  getCompanyRoom,
  emitCompanyEvent,
  emitBranchProductEvent,
  emitUserEventToBranch,
  emitBranchEvent,
  SOCKET_EVENTS,
  BRANCH_SOCKET_ROOM,
  KITCHEN_SOCKET_ROOM,
};
