// purchaseItemRoutes.js
import express from "express";
import {
  getPurchaseItems,
  getPurchaseItemsByOrder,
  getPurchaseItemById,
  createPurchaseItem,
  updatePurchaseItem,
  deletePurchaseItem,
} from "../controllers/purchaseItemController.js";
import {
  requireAuth,
  requireRole,
  requireBranchAdminOrAdmin,
  ROLES,
} from "../middleware/authMiddleware.js";

const router = Router();

function Router() {
  return express.Router();
}

router.use(requireAuth);

// Anyone in kitchen staff, branch admin, or admin can list purchase items
router.get(
  "/",
  requireRole(
    [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.KITCHEN_STAFF],
    "Admin, Branch Admin, or Kitchen Staff",
  ),
  getPurchaseItems,
);

// Kitchen staff can VIEW items in an order (so they know what's coming in)
// but cannot create, edit, or delete them
router.get(
  "/order/:orderId",
  requireRole(
    [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.KITCHEN_STAFF],
    "Admin, Branch Admin, or Kitchen Staff",
  ),
  getPurchaseItemsByOrder,
);

router.get(
  "/:id",
  requireRole(
    [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.KITCHEN_STAFF],
    "Admin, Branch Admin, or Kitchen Staff",
  ),
  getPurchaseItemById,
);

// Only Admin and Branch Admin can manage items
router.post("/", requireBranchAdminOrAdmin, createPurchaseItem);
router.put("/:id", requireBranchAdminOrAdmin, updatePurchaseItem);
router.delete("/:id", requireBranchAdminOrAdmin, deletePurchaseItem);

export default router;

