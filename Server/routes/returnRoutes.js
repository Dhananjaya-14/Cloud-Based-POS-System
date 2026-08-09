import express from "express";
import {
  getAllReturns,
  createReturn,
  updateReturn,
  deleteReturn,
} from "../controllers/returnController.js";
import { requireAuth, requireBranchAdminOrAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireBranchAdminOrAdmin);

router.get("/", getAllReturns);
router.post("/", createReturn);
router.put("/:id", updateReturn);
router.delete("/:id", deleteReturn);

export default router;