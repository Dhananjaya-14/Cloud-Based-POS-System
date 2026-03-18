import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "POS API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/branches", branchRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});

