import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";

import {
  getDeliveries,
  getDeliveryById,
  createDelivery,
  updateDelivery,
  deleteDelivery,
} from "../controllers/deliveryController.js";

const router = express.Router();

// protect routes
router.use(requireAuth);

router.get("/", getDeliveries);
router.get("/:id", getDeliveryById);
router.post("/", createDelivery);
router.put("/:id", updateDelivery);
router.delete("/:id", deleteDelivery);

export default router;