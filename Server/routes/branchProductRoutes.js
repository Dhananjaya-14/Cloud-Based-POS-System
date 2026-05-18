import express from "express";
import {
  requireAuth,
  requireBranchAdminOrAdmin,
  requireCashierOrAbove,
  requireWaiterOrAbove,
} from "../middleware/authMiddleware.js";
import {
  getBranchProducts,
  getBranchProductById,
  createBranchProduct,
  updateBranchProduct,
  deleteBranchProduct,
} from "../controllers/branchProductController.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", requireWaiterOrAbove, getBranchProducts);
router.get("/:id", requireWaiterOrAbove, getBranchProductById);
router.post("/", requireBranchAdminOrAdmin, createBranchProduct);
router.put("/:id", requireBranchAdminOrAdmin, updateBranchProduct);
router.delete("/:id", requireBranchAdminOrAdmin, deleteBranchProduct);

export default router;
