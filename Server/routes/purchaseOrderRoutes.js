// purchaseOrderRoutes.js
import express from "express";
import {
  getPurchaseOrders,
  getPurchaseOrdersBySupplier,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
} from "../controllers/purchaseOrderController.js";
import {
  requireAuth,
  requireBranchAdminOrAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All purchase order routes — Admin and Branch Admin only
// Kitchen staff and cashiers have no business managing supplier orders
router.use(requireAuth, requireBranchAdminOrAdmin);

router.get("/", getPurchaseOrders);
router.get("/supplier/:supId", getPurchaseOrdersBySupplier);
router.get("/:id", getPurchaseOrderById);
router.post("/", createPurchaseOrder);
router.put("/:id", updatePurchaseOrder);
router.patch("/:id/status", updatePurchaseOrderStatus);
router.delete("/:id", deletePurchaseOrder);

export default router;
