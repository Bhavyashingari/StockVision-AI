import { Router } from "express";
import {
  getUserInfo,
  login,
  signup,
  logout,
  updateProfile,
  addProfileImage,
  removeProfileImage,
  // login, // Will be handled by Clerk or a new sync/creation flow
  // signup, // Will be handled by Clerk or a new sync/creation flow
  // logout, // Clerk SDKs usually handle logout; this might be removed or changed
} from "../controllers/AuthController.js";
import { ensureAuthenticated } from "../middlewares/AuthMiddleware.js"; // Import ensureAuthenticated
import multer from "multer";

const authRoutes = Router();
const upload = multer({ dest: "uploads/profiles/" });

// authRoutes.post("/signup", signup); // Likely handled by Clerk or webhook
// authRoutes.post("/login", login);   // Likely handled by Clerk or webhook
// authRoutes.post("/logout", logout); // Client SDKs and Clerk session management take care of this.
                                    // If specific server-side cleanup needed, this could be ensureAuthenticated.

authRoutes.get("/userinfo", ensureAuthenticated, getUserInfo);
authRoutes.post("/update-profile", ensureAuthenticated, updateProfile);
authRoutes.post(
  "/add-profile-image",
  ensureAuthenticated,
  upload.single("profile-image"),
  addProfileImage
);
authRoutes.delete("/remove-profile-image", ensureAuthenticated, removeProfileImage);

export default authRoutes;
