import express from "express";
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  patchOrder,
  updateOrderStatus,
  deleteOrder,
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
  [ROLES.CASHIER, ROLES.BRANCH_ADMIN, ROLES.ADMIN],
  "Cashier, Branch Admin, or Admin",
);

// Update Order Status
const canUpdateOrderStatus = requireRole(
  [ROLES.KITCHEN_STAFF, ROLES.CASHIER, ROLES.BRANCH_ADMIN, ROLES.ADMIN],
  "Kitchen Staff, Cashier, Branch Admin, or Admin",
);

// Edit Orders
const canEditOrder = requireRole(
  [ROLES.BRANCH_ADMIN, ROLES.ADMIN],
  "Branch Admin or Admin",
);

// Delete Orders
const canDeleteOrder = requireRole([ROLES.ADMIN], "Admin");

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

// GET /orders
router.get("/", requireAuth, canReadOrders, getAllOrders);

// GET /orders/:id
router.get("/:id", requireAuth, canReadOrders, getOrderById);

// POST /orders
router.post("/", requireAuth, canCreateOrder, createOrder);

// Must be before "/:id"
router.patch(
  "/:id/status",
  requireAuth,
  canUpdateOrderStatus,
  updateOrderStatus,
);

// PUT /orders/:id
router.put("/:id", requireAuth, canEditOrder, updateOrder);

// PATCH /orders/:id
router.patch("/:id", requireAuth, canEditOrder, patchOrder);

// DELETE /orders/:id
router.delete("/:id", requireAuth, canDeleteOrder, deleteOrder);

export default router;
