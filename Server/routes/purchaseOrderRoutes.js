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

const router = express.Router();


router.get("/", getPurchaseOrders);
router.get("/supplier/:supId", getPurchaseOrdersBySupplier);
router.get("/:id", getPurchaseOrderById);
router.post("/", createPurchaseOrder);
router.put("/:id", updatePurchaseOrder);
router.patch("/:id/status", updatePurchaseOrderStatus);
router.delete("/:id", deletePurchaseOrder);

export default router;