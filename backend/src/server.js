import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/database.js';
import routes from './routes/index.js';

const app = express();

// Connect Database
connectDB();

// CORS Middleware - MUST BE BEFORE HELMET
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // FIXED: Added PATCH
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Helmet Middleware with proper configuration for static files
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving with CORS headers
app.use("/uploads", (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static("uploads"));

// Routes
app.use(process.env.API_PREFIX || '/api/v1', routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API: http://localhost:${PORT}${process.env.API_PREFIX || '/api/v1'}`);
  console.log(`📁 Static files: http://localhost:${PORT}/uploads`);
});