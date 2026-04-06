import express from "express";
import {
  getRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  getLowStockMaterials,
  adjustStock,
} from "../controllers/rawMaterialController.js";

const router = express.Router();

// ── Collection routes ──────────────────────────────────────────────────────
router.get("/", getRawMaterials);
router.get("/low-stock", getLowStockMaterials);
router.post("/", createRawMaterial);

// ── Single item routes ─────────────────────────────────────────────────────
router.get("/:id", getRawMaterialById);
router.put("/:id", updateRawMaterial);
router.patch("/:id/stock", adjustStock);
router.delete("/:id", deleteRawMaterial);

export default router;
