import express from "express";
import {
  getAllReturns,
  updateReturn,
  deleteReturn,
  fulfillReturn,
} from "../controllers/returnController.js";
import { requireAuth, requireBranchAdminOrAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireBranchAdminOrAdmin);

router.get("/", getAllReturns);
router.put("/:id", updateReturn);
router.delete("/:id", deleteReturn);
router.patch("/:id/fulfill", fulfillReturn);

export default router;