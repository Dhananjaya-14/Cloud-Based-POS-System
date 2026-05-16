import express from "express";
import { requireAuth, requireBranchAdminOrAdmin } from "../middleware/authMiddleware.js";
import {
  getRecipes,
  getRecipeById,
  getRecipesByProduct,
  createRecipe,
  createRecipeBulk,
  updateRecipe,
  deleteRecipe,
  deleteRecipeByProduct,
} from "../controllers/recipeController.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireBranchAdminOrAdmin);

// ── Static routes first (before /:id) ────────
router.get("/product/:pro_id", getRecipesByProduct);
router.post("/bulk", createRecipeBulk);
router.delete("/product/:pro_id", deleteRecipeByProduct);

// ── Standard CRUD ─────────────────────────────
router.get("/", getRecipes);
router.get("/:id", getRecipeById);
router.post("/", createRecipe);
router.put("/:id", updateRecipe);
router.delete("/:id", deleteRecipe);

export default router;
