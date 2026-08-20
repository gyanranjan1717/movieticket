import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dns from 'node:dns';
import dotenv from "dotenv";
dotenv.config();

// Force Cloudflare / Google DNS to bypass ISP blocking (e.g. TMDB)
try {
  dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8']);
} catch (e) {
  console.warn("DNS setServers warning:", e.message);
}

import connectDB from './configs/db.js';
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./configs/swagger.js";
import { initSocket } from "./configs/socket.js";

import authRouter from './routes/authRoutes.js';
import showRouter from './routes/showRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import userRouter from './routes/userRoutes.js';
import recommendationRouter from './routes/recommendationRoutes.js';
import reviewRouter from './routes/reviewRoutes.js';
import tmdbRouter from './routes/tmdbRoutes.js';
import { stripeWebhooks } from './controllers/stripeWebhooks.js';

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

// Initialize Socket.io WebSockets
initSocket(server);

await connectDB();

// Stripe Webhooks (Raw Body parser before express.json)
app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

// Security Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      clientUrl,
      "http://localhost:5173",
      "http://localhost:3000",
      "https://itsshowtimecom.vercel.app"
    ];

    if (
      allowedOrigins.includes(origin) || 
      origin.endsWith(".vercel.app") || 
      origin.includes("localhost")
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// Health Check Endpoint
app.get("/", (req, res) => {
    const serverUrl = process.env.SERVER_URL || `http://localhost:${port}`;
    res.json({
      success: true,
      message: "ShowTime Backend Server is running smoothly with WebSockets & Helmet Security",
      swaggerDocs: `${serverUrl}/api-docs`
    });
});

// Swagger OpenAPI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Inngest Event Endpoint
app.use('/api/inngest', serve({ client: inngest, functions }));

// Application Routes
app.use('/api/auth', authRouter);
app.use('/api/show', showRouter);
app.use('/api/booking', bookingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/recommendations", recommendationRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/tmdb", tmdbRouter);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "production" ? "An error occurred" : err.message,
  });
});

server.listen(port, () => {
    const serverUrl = process.env.SERVER_URL || `http://localhost:${port}`;
    console.log(`Server listening at ${serverUrl}`);
    console.log(`Swagger Documentation available at ${serverUrl}/api-docs`);
    console.log(`WebSockets running on port ${port}`);
});
