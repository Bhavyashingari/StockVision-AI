import express from "express";
import { updateDmSettings } from "../controllers/UserController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const userRoutes = express.Router();

userRoutes.put("/settings/dm", verifyToken, updateDmSettings);

export default userRoutes;
