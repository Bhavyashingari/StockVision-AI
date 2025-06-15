import { Router } from "express";
import {
  getMessages,
  uploadFile,
  deleteMessage,
  editMessage,
} from "../controllers/MessagesController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import multer from "multer";

const messagesRoutes = Router();
const upload = multer({ dest: "uploads/files/" });
messagesRoutes.post("/get-messages", verifyToken, getMessages);
messagesRoutes.post(
  "/upload-file",
  verifyToken,
  upload.single("file"),
  uploadFile
);
messagesRoutes.delete("/:messageId", verifyToken, deleteMessage);
messagesRoutes.put("/:messageId", verifyToken, editMessage);

export default messagesRoutes;
