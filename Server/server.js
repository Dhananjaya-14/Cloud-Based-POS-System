import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { testConnection } from './config/database.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Database connection test route
app.get('/api/test-db', async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      res.json({ 
        success: true, 
        message: 'Database connection successful!' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Database connection failed!' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Database connection error',
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 5000;

// Start server and test database connection
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('🔍 Testing database connection...');
  
  // Test database connection on server start
  await testConnection();
});

