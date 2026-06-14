import express from "express";
import {
    getSalesSummaryReport,
    getProductSalesReport
} from "../controllers/reportController.js";

const router = express.Router();

router.post("/sales", getSalesSummaryReport);
router.post("/productsales",getProductSalesReport);

export default router;