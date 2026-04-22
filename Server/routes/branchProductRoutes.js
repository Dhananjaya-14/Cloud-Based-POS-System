import express from "express";
import { requireAuth, requireAdminOrBranchAdmin } from "../middleware/authMiddleware.js";
import {
  getBranchProducts,
  getBranchProductById,
  createBranchProduct,
  updateBranchProduct,
  deleteBranchProduct,
} from "../controllers/branchProductController.js";

const router = express.Router();

// Protect all branch_products endpoints
router.use(requireAuth);
router.use(requireAdminOrBranchAdmin);

router.get("/", getBranchProducts);
router.get("/:id", getBranchProductById);
router.post("/", createBranchProduct);
router.put("/:id", updateBranchProduct);
router.delete("/:id", deleteBranchProduct);

export default router;

