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