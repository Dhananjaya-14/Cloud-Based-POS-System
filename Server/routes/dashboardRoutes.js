import express from "express";
const router = express.Router();
import {getCashierDashboardStats} from "../controllers/dashboardController.js";


router.get("/stats", getCashierDashboardStats);

export default router;