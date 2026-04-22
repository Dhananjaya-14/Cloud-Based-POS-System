import express from "express";
import { requireAuth, requireAdminOnly } from "../middleware/authMiddleware.js";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

const router = express.Router();

// Protect all product endpoints
router.use(requireAuth);
router.use(requireAdminOnly);

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;

