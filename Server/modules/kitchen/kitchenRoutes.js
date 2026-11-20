import express from "express";
import { updateKitchenOrderStatus } from "./kitchenController.js";
import { requireAuth, requireRole, ROLES } from "../../middleware/authMiddleware.js";
import { requireModule } from "../../middleware/saasMiddleware.js";

const router = express.Router();

// Only kitchen staff and branch/company admins may change kitchen status —
// it accepts/completes/cancels orders and moves ingredient stock.
// (Super Admin passes every role check automatically.)
const canUpdateKitchenStatus = requireRole(
  [ROLES.KITCHEN_STAFF, ROLES.BRANCH_ADMIN, ROLES.ADMIN],
  "Kitchen Staff, Branch Admin, or Admin",
);

router.use(requireAuth);
router.use(requireModule("has_kitchen"));

// Kitchen updates order status (accepts order, marks ready)
router.patch("/orders/:id/status", canUpdateKitchenStatus, updateKitchenOrderStatus);

export default router;
