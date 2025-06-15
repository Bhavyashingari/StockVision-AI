import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRoutes from "./routes/AuthRoutes.js";
import contactsRoutes from "./routes/ContactRoutes.js";
import messagesRoutes from "./routes/MessagesRoute.js";
import { initSocket } from "./socket.js"; // Changed import
import channelRoutes from "./routes/ChannelRoutes.js";
import userRoutes from "./routes/UserRoutes.js"; // Import userRoutes
import http from "http"; // Import http

// Load env variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8747;
const databaseURL = process.env.DATABASE_URL;

// ✅ FIXED: Use CORS with fallback and full support for credentials
app.use(
  cors({
    origin: process.env.ORIGIN || "http://localhost:5173", // allow Vercel frontend
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

// Static file serving
app.use("/uploads/profiles", express.static("uploads/profiles"));
app.use("/uploads/files", express.static("uploads/files"));

// Middleware
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/channel", channelRoutes);
app.use("/api/users", userRoutes); // Mount userRoutes

// ✅ NEW: Root route for health check
app.get("/", (req, res) => {
  res.send("✅ Backend is live at Render");
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO and get instances
const { io, userSocketMap } = initSocket(server);
app.set("io", io); // Make io accessible in request handlers via req.app.get('io')
app.set("userSocketMap", userSocketMap); // Make map accessible

// Start server listening
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// DB connection
mongoose
  .connect(databaseURL)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((err) => {
    console.log("❌ DB Connection Error:", err.message);
  });

// ✅ OPTIONAL: quick test route
app.get("/api/auth/test", (req, res) => {
  res.send("✅ API route working");
});
