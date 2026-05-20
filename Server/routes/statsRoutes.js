import express from "express";
import { getOverview, getBranchStats } from "../controllers/statsController.js";
const router = express.Router();
router.get("/overview", getOverview);
router.get("/branches", getBranchStats);
export default router;