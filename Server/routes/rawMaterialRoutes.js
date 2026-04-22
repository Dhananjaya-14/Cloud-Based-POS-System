import express from "express";
import {
  getRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  getLowStockMaterials,
  adjustStock,
} from "../controllers/rawMaterialController.js";
import {
  requireAuth,
  requireRole,
  ROLES,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply auth to all routes
router.use(requireAuth);

// ── Collection routes ──────────────────────────────────────────────────────

// Any authenticated staff can view materials
router.get(
  "/",
  requireRole(
    [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.CASHIER, ROLES.KITCHEN_STAFF],
    "Staff",
  ),
  getRawMaterials,
);

// Kitchen staff and managers can view low-stock alerts
router.get(
  "/low-stock",
  requireRole(
    [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.KITCHEN_STAFF],
    "Kitchen Staff or Admin",
  ),
  getLowStockMaterials,
);

// Only admins can create new raw materials
router.post(
  "/",
  requireRole([ROLES.ADMIN, ROLES.BRANCH_ADMIN], "Admin or Branch Admin"),
  createRawMaterial,
);

// ── Single item routes ─────────────────────────────────────────────────────

// Any authenticated staff can view a single material
router.get(
  "/:id",
  requireRole(
    [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.CASHIER, ROLES.KITCHEN_STAFF],
    "Staff",
  ),
  getRawMaterialById,
);

// Only admins can fully update a material's details
router.put(
  "/:id",
  requireRole([ROLES.ADMIN, ROLES.BRANCH_ADMIN], "Admin or Branch Admin"),
  updateRawMaterial,
);

// Kitchen staff can adjust stock (after delivery or usage)
router.patch(
  "/:id/stock",
  requireRole(
    [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.KITCHEN_STAFF],
    "Kitchen Staff or Admin",
  ),
  adjustStock,
);

// Admin and Branch Admin can delete — destructive operation
router.delete(
  "/:id",
  requireRole([ROLES.ADMIN, ROLES.BRANCH_ADMIN], "Admin or Branch Admin"),
  deleteRawMaterial
);

export default router;
