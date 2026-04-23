import express from "express";
import {
  createOrderItem,
  getAllOrderItems,
  getOrderItemsByOrderId,
  getOrderItemById,
  updateOrderItem,
  deleteOrderItem
} from "../controllers/orderItemController.js";

const router = express.Router();

router.post("/", createOrderItem);
router.get("/", getAllOrderItems);
router.get("/order/:order_id", getOrderItemsByOrderId);
router.get("/:id", getOrderItemById);
router.put("/:id", updateOrderItem);
router.delete("/:id", deleteOrderItem);

export default router;