import { Router } from "express";
import { getMessages, uploadFile } from "../controllers/MessagesController.js";
import { ensureAuthenticated } from "../middlewares/AuthMiddleware.js"; // Updated import
import multer from "multer";

const messagesRoutes = Router();
const upload = multer({ dest: "uploads/files/" });
messagesRoutes.post("/get-messages", ensureAuthenticated, getMessages); // Updated middleware
messagesRoutes.post(
  "/upload-file",
  ensureAuthenticated, // Updated middleware
  upload.single("file"),
  uploadFile
);

export default messagesRoutes;
