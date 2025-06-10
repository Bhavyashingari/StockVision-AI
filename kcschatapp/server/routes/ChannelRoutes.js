import { Router } from "express";
import {
  createChannel,
  getChannelMessages,
  getUserChannels,
  joinChannelByLink,
} from "../controllers/ChannelControllers.js";
import { ensureAuthenticated } from "../middlewares/AuthMiddleware.js"; // Import ensureAuthenticated

const channelRoutes = Router();

channelRoutes.post("/create-channel", ensureAuthenticated, createChannel);
channelRoutes.get("/get-user-channels", ensureAuthenticated, getUserChannels);
channelRoutes.get(
  "/get-channel-messages/:channelId",
  ensureAuthenticated,
  getChannelMessages
);
channelRoutes.get("/join/:link", ensureAuthenticated, joinChannelByLink);

export default channelRoutes;
