import express from "express";
import {
  requireAuth,
  requireAdmin,
  requireCashierOrAbove,
  requireWaiterOrAbove,
} from "../middleware/authMiddleware.js";
import {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../controllers/branchController.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", requireCashierOrAbove, getBranches);
router.get("/:id", requireWaiterOrAbove, getBranchById);
router.post("/", requireAdmin, createBranch);
router.put("/:id", requireAdmin, updateBranch);
router.delete("/:id", requireAdmin, deleteBranch);

export default router;
