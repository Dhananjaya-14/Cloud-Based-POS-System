import express from "express";
import {
  createWaste,
  getAllWaste,
  getWasteById,
  updateWaste,
  deleteWaste,
  getWastePercentage,
} from "../controllers/wasteController.js";

const router = express.Router();

router.post("/", createWaste);
router.get("/", getAllWaste);
router.get("/percentage", getWastePercentage);
router.get("/:id", getWasteById);
router.put("/:id", updateWaste);
router.delete("/:id", deleteWaste);

export default router;