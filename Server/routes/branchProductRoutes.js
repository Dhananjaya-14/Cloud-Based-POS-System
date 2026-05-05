import express from "express";
import {
  requireAuth,
  requireBranchAdminOrAdmin,
  requireCashierOrAbove,
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
router.get("/", requireCashierOrAbove, getBranchProducts);
router.get("/:id", requireCashierOrAbove, getBranchProductById);
router.post("/", requireBranchAdminOrAdmin, createBranchProduct);
router.put("/:id", requireBranchAdminOrAdmin, updateBranchProduct);
router.delete("/:id", requireBranchAdminOrAdmin, deleteBranchProduct);

export default router;
