// routes/deliveryRoutes.js
import express from "express";

// ─── Auth middleware ──────────────────────────────────────────────────────────
import {
  requireAuth,
  requireRole,
  ROLES,
} from "../middleware/authMiddleware.js";

// ─── Controller functions + validation arrays ─────────────────────────────────
import {
  getDeliveriesValidation,
  getDeliveries,
  getDeliveryByIdValidation,
  getDeliveryById,
  createDeliveryValidation,
  createDelivery,
  updateDeliveryValidation,
  updateDelivery,
  deleteDeliveryValidation,
  deleteDelivery,
  loadDelivery,
} from "../controllers/deliveryController.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// ROLE GROUPS
// ─────────────────────────────────────────────────────────────────────────────

// Read — everyone operational needs visibility
const canReadDelivery = requireRole(
  [ROLES.CASHIER, ROLES.BRANCH_ADMIN, ROLES.ADMIN],
  "Cashier, Branch Admin, or Admin",
);

// Create — Cashier initiates at point of sale
const canCreateDelivery = requireRole(
  [ROLES.CASHIER, ROLES.BRANCH_ADMIN, ROLES.ADMIN],
  "Cashier, Branch Admin, or Admin",
);

// Update — Branch Admin+ can reassign, change status, update ETA
const canUpdateDelivery = requireRole(
  [ROLES.BRANCH_ADMIN, ROLES.ADMIN],
  "Branch Admin or Admin",
);

// Delete — Admin only; hard delete of cancelled/failed records
const canDeleteDelivery = requireRole([ROLES.ADMIN], "Admin");

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /deliveries
router.get(
  "/",
  requireAuth,
  canReadDelivery,
  getDeliveriesValidation,
  getDeliveries,
);

// GET /deliveries/:id
router.get(
  "/:id",
  requireAuth,
  canReadDelivery,
  getDeliveryByIdValidation,
  getDeliveryById,
);

// POST /deliveries
router.post(
  "/",
  requireAuth,
  canCreateDelivery,
  createDeliveryValidation,
  createDelivery,
);

// PUT /deliveries/:id
// loadDelivery runs first so the state-machine validator can read
// req.delivery.delivery_status before deciding if the transition is valid
router.put(
  "/:id",
  requireAuth,
  canUpdateDelivery,
  loadDelivery,
  updateDeliveryValidation,
  updateDelivery,
);

// DELETE /deliveries/:id
// loadDelivery runs first so the terminal-status guard can fire
router.delete(
  "/:id",
  requireAuth,
  canDeleteDelivery,
  loadDelivery,
  deleteDeliveryValidation,
  deleteDelivery,
);

export default router;
