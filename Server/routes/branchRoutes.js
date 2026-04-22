import express from "express";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";
import {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../controllers/branchController.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get("/", getBranches);
router.get("/:id", getBranchById);
router.post("/", createBranch);
router.put("/:id", updateBranch);
router.delete("/:id", deleteBranch);

export default router;
