import express from "express";
import {
  createWaiterOrder,
  deleteWaiterOrder,
  getMyOrders,
  getMyTables,
  getWaiterProfile,
} from "./waiterController.js";
import {
  requireAuth,
  requireWaiterOrAbove
} from "../../middleware/authMiddleware.js"
import { requireModule } from "../../middleware/saasMiddleware.js";
;

const router = express.Router();

router.use(requireAuth);
router.use(requireWaiterOrAbove);
router.use(requireModule("has_waiter"));

router.get("/profile", getWaiterProfile);
router.get("/my-tables", getMyTables);
router.get("/my-orders", getMyOrders);
router.post("/orders", createWaiterOrder);
router.delete("/orders/:id", deleteWaiterOrder);

export default router;
