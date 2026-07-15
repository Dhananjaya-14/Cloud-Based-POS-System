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
  addStock,
  getIngredientStatus,
} from "../controllers/branchProductController.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", requireWaiterOrAbove, getBranchProducts);
router.post("/", requireBranchAdminOrAdmin, createBranchProduct);
router.post("/:id/add-stock", requireBranchAdminOrAdmin, addStock);
router.put("/:id", requireBranchAdminOrAdmin, updateBranchProduct);
router.delete("/:id", requireBranchAdminOrAdmin, deleteBranchProduct);
router.get("/:id/ingredient-status", requireWaiterOrAbove, getIngredientStatus);
router.get("/:id", requireWaiterOrAbove, getBranchProductById);


export default router;
