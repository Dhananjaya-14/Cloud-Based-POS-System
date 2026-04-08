// server.js

// Load environment variables
import "dotenv/config";

// Import dependencies
import express from "express";
import cors from "cors";

// Import routes
import customerRoutes from "./routes/customerRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import branchProductRoutes from "./routes/branchProductRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import tableAssignmentRoutes from "./routes/tableAssignmentRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import terminalRoutes from "./routes/terminalRoutes.js";
import rawMaterialRoutes from "./routes/rawmaterialRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";
import purchaseItemRoutes from "./routes/purchaseItemRoutes.js";
import supplierPaymentRoutes from "./routes/supplierPaymentRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import orderItemRoutes from "./routes/orderItemRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";

// Initialize app
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  }),
);
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// API routes
app.use("/api/customers", customerRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/branch_products", branchProductRoutes);
app.use("/api/products", productRoutes);
app.use("/api/table-assignments", tableAssignmentRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/terminals", terminalRoutes);
app.use("/api/raw-materials", rawMaterialRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/purchase-items", purchaseItemRoutes);
app.use("/api/supplier-payments", supplierPaymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/order-items", orderItemRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/deliveries", deliveryRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
