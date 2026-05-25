import express from "express";
import {
  createWaiterOrder,
  deleteWaiterOrder,
  getMyOrders,
  getMyTables,
  getWaiterProfile,
} from "../controllers/waiterController.js";
import {
  requireAuth,
  requireWaiterOrAbove,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireWaiterOrAbove);

router.get("/profile", getWaiterProfile);
router.get("/my-tables", getMyTables);
router.get("/my-orders", getMyOrders);
router.post("/orders", createWaiterOrder);
router.delete("/orders/:id", deleteWaiterOrder);

export default router;
