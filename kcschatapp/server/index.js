import "dotenv/config"; // Ensure this is at the very top
import express from "express";
// import dotenv from "dotenv"; // dotenv.config() moved to import 'dotenv/config'
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRoutes from "./routes/AuthRoutes.js";
import contactsRoutes from "./routes/ContactRoutes.js";
import messagesRoutes from "./routes/MessagesRoute.js";
import setupSocket from "./socket.js";
import channelRoutes from "./routes/ChannelRoutes.js";
import webhookRoutes from "./routes/WebhookRoutes.js"; // Import Webhook routes
import { attachAuthInfo } from "./middlewares/AuthMiddleware.js";

// dotenv.config(); // Moved to import 'dotenv/config'

const app = express();
const port = process.env.PORT;
const databaseURL = process.env.DATABSE_URL;

app.use(
  cors({
    origin: [process.env.ORIGIN],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use("/uploads/profiles", express.static("uploads/profiles"));
app.use("/uploads/files", express.static("uploads/files"));

app.use(cookieParser());

// IMPORTANT: Webhook route must come BEFORE express.json()
// as it needs the raw body for signature verification.
app.use("/api/webhooks", webhookRoutes);

// Regular body parsing for other routes
app.use(express.json());

// Attach Clerk auth information to all matching requests (after webhooks and json parsing)
app.use(attachAuthInfo);

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/channel", channelRoutes);

const server = app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

setupSocket(server);

mongoose
  .connect(databaseURL)
  .then(() => {
    console.log("DB Connetion Successfull");
  })
  .catch((err) => {
    console.log(err.message);
  });
