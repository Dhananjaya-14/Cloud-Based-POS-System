import express from "express";
import {
  requireAuth,
  requireBranchAdminOrAdmin,
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
router.use(requireBranchAdminOrAdmin); 

router.get("/", getBranchProducts);
router.get("/:id", getBranchProductById);
router.post("/", createBranchProduct);
router.put("/:id", updateBranchProduct);
router.delete("/:id", deleteBranchProduct);

export default router;
