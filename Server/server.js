// server.js

// Load environment variables from .env
import 'dotenv/config';

// Import dependencies
import express from 'express';
import cors from 'cors';

// Import routes
import customerRoutes from './routes/customerRoutes.js';
// (you can later add other routes like userRoutes, authRoutes, etc.)

// Import error handling middleware (if you have)
import { notFound, errorHandler } from './middleware/errorHandler.js';

// Initialize app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL, // only allow your frontend
  credentials: true,
}));
app.use(express.json()); // parse JSON bodies

// Example root route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// API Routes
app.use('/api/customers', customerRoutes);

// Error handling middleware
app.use(notFound);      // 404 handler
app.use(errorHandler);  // general error handler

// Get port from .env or default to 5000
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import tableAssignmentRoutes from "./routes/tableAssignmentRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "POS API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/products", productRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/table-assignments", tableAssignmentRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});
