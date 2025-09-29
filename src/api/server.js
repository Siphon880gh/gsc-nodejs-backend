#!/usr/bin/env node
import "dotenv/config";
import express from "express";
import cors from "cors";
import jwtRoutes from "./jwt-routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Use JWT routes
app.use("/", jwtRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "GSC API Server is running",
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    availableEndpoints: [
      "GET /health",
      "POST /api/auth/signup",
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "DELETE /api/auth/user",
      "GET /api/status",
      "GET /api/sites",
      "GET /api/sites/verified",
      "POST /api/sites/select",
      "GET /api/sites/current",
      "DELETE /api/sites/current",
      "POST /api/query/adhoc",
      "POST /api/query/preset",
      "GET /api/presets",
      "GET /api/schema"
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GSC API Server (JWT) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Authentication: POST /api/auth/login`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/status`);
});

export default app;
