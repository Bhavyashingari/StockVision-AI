import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import Channel from "../model/ChannelModel.js";
import User from "../model/UserModel.js";

export const createChannel = async (request, response, next) => {
  try {
    const { name, members: memberIdsForChannel } = request.body; // memberIdsForChannel are expected to be MongoDB _ids
    const clerkUserId = request.auth?.userId;

    if (!clerkUserId) {
      return response.status(401).json({ message: "User not authenticated." });
    }

    const adminUser = await User.findOne({ clerkUserId: clerkUserId });
    if (!adminUser) {
      return response.status(404).json({ message: "Admin user profile not found in local DB." });
    }
    const adminMongoId = adminUser._id;

    // Assuming 'members' in request.body are an array of MongoDB _ids of users to be added.
    // Validate these members if necessary.
    const validMembers = await User.find({ _id: { $in: memberIdsForChannel } });
    if (validMembers.length !== memberIdsForChannel.length) {
      return response
        .status(400)
        .json({ message: "Some members are not valid users or not found." });
    }

    const newChannel = new Channel({
      name,
      members: validMembers.map(member => member._id), // Store actual MongoDB _ids
      admin: adminMongoId,
      joinLink: uuidv4(),
    });

    await newChannel.save();

    return response.status(201).json({ channel: newChannel });
  } catch (error) {
    console.error("Error creating channel:", error);
    return response.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserChannels = async (req, res) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ message: "User not authenticated." });
    }

    const localUser = await User.findOne({ clerkUserId: clerkUserId });
    if (!localUser) {
      return res.status(404).json({ message: "User profile not found in local DB." });
    }
    const userMongoId = localUser._id;

    const channels = await Channel.find({
      $or: [{ admin: userMongoId }, { members: userMongoId }],
    }).sort({ updatedAt: -1 });

    return res.status(200).json({ channels });
  } catch (error) {
    console.error("Error getting user channels:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const joinChannelByLink = async (request, response, next) => {
  try {
    const { link } = request.params;
    const clerkUserId = request.auth?.userId;

    if (!clerkUserId) {
      return response.status(401).json({ message: "User not authenticated." });
    }

    const localUser = await User.findOne({ clerkUserId: clerkUserId });
    if (!localUser) {
      return response.status(404).json({ message: "User profile not found in local DB." });
    }
    const userMongoId = localUser._id;

    const channel = await Channel.findOne({ joinLink: link });

    if (!channel) {
      return response.status(404).json({ message: "Channel not found." });
    }

    if (
      channel.members.includes(userMongoId) || // Check against MongoDB _id
      channel.admin.equals(userMongoId) // Use .equals() for comparing ObjectId
    ) {
      // User is already a member or admin, just return channel info
      await channel.populate( // Repopulate to ensure latest data is sent
        "admin members",
        "firstName lastName email _id image color clerkUserId" // Added clerkUserId to populate
      );
      return response.status(200).json({ channel });
    }

    channel.members.push(userMongoId);
    await channel.save();

    await channel.populate(
      "admin members",
      "firstName lastName email _id image color clerkUserId" // Added clerkUserId to populate
    );

    return response.status(200).json({ channel }); // Return updated channel
  } catch (error) {
    console.error("Error joining channel by link:", error);
    return response.status(500).json({ message: "Internal Server Error" });
  }
};

export const getChannelMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId).populate({
      path: "messages",
      populate: {
        path: "sender",
        select: "firstName lastName email _id image color clerkUserId", // Added clerkUserId to populate
      },
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const messages = channel.messages;
    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Error getting channel messages:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
