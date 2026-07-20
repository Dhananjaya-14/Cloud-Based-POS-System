import express from "express";
import { getPackages, getPackageById, createPackage, updatePackage } from "../controllers/packageController.js";
import { requireAuth, requireSuperAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Anyone authenticated can list packages (needed for dropdowns in Super Admin UI)
router.get("/", requireAuth, getPackages);
router.get("/:id", requireAuth, getPackageById);

// Only Super Admin can create/edit packages
router.post("/", requireAuth, requireSuperAdmin, createPackage);
router.put("/:id", requireAuth, requireSuperAdmin, updatePackage);

export default router;
