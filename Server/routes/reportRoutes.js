import express from "express";
import {getSalesSummaryReport} from "../controllers/reportController.js";

const router = express.Router();

router.post("/sales", getSalesSummaryReport);

export default router;