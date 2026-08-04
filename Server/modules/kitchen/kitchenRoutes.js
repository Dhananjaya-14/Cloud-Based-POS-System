import express from "express";
import { updateKitchenOrderStatus } from "./kitchenController.js";
import { requireAuth } from "../../middleware/authMiddleware.js"
import { requireModule } from "../../middleware/saasMiddleware.js";
;

const router = express.Router();

router.use(requireAuth);
router.use(requireModule("has_kitchen"));

// Kitchen updates order status (accepts order, marks ready)
router.patch("/orders/:id/status", updateKitchenOrderStatus);

export default router;
