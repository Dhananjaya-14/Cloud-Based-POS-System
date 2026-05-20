import express from "express";
import {
  createOrderItem,
  getAllOrderItems,
  getOrderItemsByOrderId,
  getOrderItemById,
  updateOrderItem,
  deleteOrderItem,
} from "../controllers/orderItemController.js";
import {
  requireAuth,
  requireRole,
  ROLES,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All order item routes require authentication
router.use(requireAuth);

// ─────────────────────────────────────────────
// GET /order-items
// Who: Kitchen Staff, Waiter, Cashier, Branch Admin, Admin  (+Super Admin via bypass)
// ─────────────────────────────────────────────
router.get(
  "/",
  requireRole(
    [
      ROLES.KITCHEN_STAFF,
      ROLES.WAITER,
      ROLES.CASHIER,
      ROLES.BRANCH_ADMIN,
      ROLES.ADMIN,
    ],
    "Kitchen Staff, Waiter, Cashier, Branch Admin, or Admin",
  ),
  getAllOrderItems,
);

// ─────────────────────────────────────────────
// GET /order-items/order/:order_id
// Who: Kitchen Staff, Waiter, Cashier, Branch Admin, Admin  (+Super Admin via bypass)
// ─────────────────────────────────────────────
router.get(
  "/order/:order_id",
  requireRole(
    [
      ROLES.KITCHEN_STAFF,
      ROLES.WAITER,
      ROLES.CASHIER,
      ROLES.BRANCH_ADMIN,
      ROLES.ADMIN,
    ],
    "Kitchen Staff, Waiter, Cashier, Branch Admin, or Admin",
  ),
  getOrderItemsByOrderId,
);

// ─────────────────────────────────────────────
// GET /order-items/:id
// Who: Kitchen Staff, Waiter, Cashier, Branch Admin, Admin  (+Super Admin via bypass)
// ─────────────────────────────────────────────
router.get(
  "/:id",
  requireRole(
    [
      ROLES.KITCHEN_STAFF,
      ROLES.WAITER,
      ROLES.CASHIER,
      ROLES.BRANCH_ADMIN,
      ROLES.ADMIN,
    ],
    "Kitchen Staff, Waiter, Cashier, Branch Admin, or Admin",
  ),
  getOrderItemById,
);

// ─────────────────────────────────────────────
// POST /order-items
// Who: Kitchen Staff, Waiter, Cashier, Branch Admin, Admin  (+Super Admin via bypass)
// ─────────────────────────────────────────────
router.post(
  "/",
  requireRole(
    [
      ROLES.KITCHEN_STAFF,
      ROLES.WAITER,
      ROLES.CASHIER,
      ROLES.BRANCH_ADMIN,
      ROLES.ADMIN,
    ],
    "Kitchen Staff, Waiter, Cashier, Branch Admin, or Admin",
  ),
  createOrderItem,
);

// ─────────────────────────────────────────────
// PUT /order-items/:id
// Who: Cashier, Branch Admin, Admin  (+Super Admin via bypass)
// ─────────────────────────────────────────────
router.put(
  "/:id",
  requireRole(
    [ROLES.CASHIER, ROLES.BRANCH_ADMIN, ROLES.ADMIN],
    "Cashier, Branch Admin, or Admin",
  ),
  updateOrderItem,
);

// ─────────────────────────────────────────────
// DELETE /order-items/:id
// Who: Cashier, Branch Admin, Admin  (+Super Admin via bypass)
// ─────────────────────────────────────────────
router.delete(
  "/:id",
  requireRole(
    [ROLES.CASHIER, ROLES.BRANCH_ADMIN, ROLES.ADMIN],
    "Cashier, Branch Admin, or Admin"
  ),
  deleteOrderItem,
);

export default router;
