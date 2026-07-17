import express from "express";
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  patchOrder,
  updateOrderStatus,
  deleteOrder,
  checkOrderStock,
} from "../controllers/orderController.js";

import {
  requireAuth,
  requireRole,
  ROLES,
} from "../middleware/authMiddleware.js";

const router = express.Router();



// Read Orders
const canReadOrders = requireRole(
  [
    ROLES.KITCHEN_STAFF,
    ROLES.WAITER,
    ROLES.CASHIER,
    ROLES.BRANCH_ADMIN,
    ROLES.ADMIN,
  ],
  "Kitchen Staff, Waiter, Cashier, Branch Admin, or Admin",
);

// Create Orders
const canCreateOrder = requireRole(
  [ROLES.WAITER, ROLES.CASHIER, ROLES.BRANCH_ADMIN, ROLES.ADMIN],
  "Waiter, Cashier, Branch Admin, or Admin",
);

// Update Order Status
const canUpdateOrderStatus = requireRole(
  [ROLES.KITCHEN_STAFF, ROLES.CASHIER, ROLES.BRANCH_ADMIN, ROLES.ADMIN],
  "Kitchen Staff, Cashier, Branch Admin, or Admin",
);

// Edit Orders
const canEditOrder = requireRole(
  [ROLES.CASHIER, ROLES.BRANCH_ADMIN, ROLES.ADMIN],
  "Cashier, Branch Admin or Admin",
);

// Delete Orders
const canDeleteOrder = requireRole(
  [ROLES.WAITER, ROLES.CASHIER, ROLES.ADMIN],
  "Waiter, Cashier, or Admin",
);

router.get("/", requireAuth, canReadOrders, getAllOrders);

router.get("/:id", requireAuth, canReadOrders, getOrderById);

// POST /orders/check-stock — must be before POST "/"
router.post("/check-stock", requireAuth, canCreateOrder, checkOrderStock);

// POST /orders
router.post("/", requireAuth, canCreateOrder, createOrder);

router.patch(
  "/:id/status",
  requireAuth,
  canUpdateOrderStatus,
  updateOrderStatus,
);

router.put("/:id", requireAuth, canEditOrder, updateOrder);

router.patch("/:id", requireAuth, canEditOrder, patchOrder);

router.delete("/:id", requireAuth, canDeleteOrder, deleteOrder);

export default router;
