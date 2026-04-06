import express from "express";
import {
  getPurchaseItemsByOrder,
  getPurchaseItemById,
  createPurchaseItem,
  updatePurchaseItem,
  deletePurchaseItem,
} from "../controllers/purchaseItemController.js";

const router = express.Router();

router.get("/order/:orderId", getPurchaseItemsByOrder);
router.get("/:id", getPurchaseItemById);
router.post("/", createPurchaseItem);
router.put("/:id", updatePurchaseItem);
router.delete("/:id", deletePurchaseItem);

export default router;