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

const router = express.Router();

router.get("/",          getAllOrders);
router.get("/:id",       getOrderById);
router.post("/",         createOrder);
router.put("/:id",       updateOrder);
router.patch("/:id",     patchOrder);
router.patch("/:id/status", updateOrderStatus);
router.delete("/:id",    deleteOrder);

export default router;