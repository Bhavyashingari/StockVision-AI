import mongoose from "mongoose";
import Channel from "../model/ChannelModel.js";
import User from "../model/UserModel.js";
import Message from "../model/MessagesModel.js"; // Import Message model

export const createChannel = async (request, response, next) => {
  try {
    const { name, members } = request.body;
    const userId = request.userId;
    const admin = await User.findById(userId);
    if (!admin) {
      return response.status(400).json({ message: "Admin user not found." });
    }

    const validMembers = await User.find({ _id: { $in: members } });
    if (validMembers.length !== members.length) {
      return response
        .status(400)
        .json({ message: "Some members are not valid users." });
    }

    const newChannel = new Channel({
      name,
      members,
      admin: userId,
    });

    await newChannel.save();

    await newChannel.populate('members', 'firstName lastName _id image color');
    await newChannel.populate('admin', 'firstName lastName _id image color');

    return response.status(201).json({ channel: newChannel });
  } catch (error) {
    console.error("Error creating channel:", error);
    return response.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserChannels = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const channels = await Channel.find({
      $or: [{ admin: userId }, { members: userId }],
    })
    .populate('members', 'firstName lastName _id image color')
    .populate('admin', 'firstName lastName _id image color')
    .sort({ updatedAt: -1 });

    return res.status(200).json({ channels });
  } catch (error) {
    console.error("Error getting user channels:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const pinMessageInChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { messageId } = req.body; // If null/empty, implies unpin
    const userId = req.userId;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found." });
    }

    if (channel.admin.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "User not authorized to pin/unpin messages in this channel." });
    }

    if (messageId) {
      // Pinning a message
      const messageToPin = await Message.findById(messageId);
      if (!messageToPin) {
        return res.status(404).json({ message: "Message to pin not found." });
      }
      if (!messageToPin.channel || messageToPin.channel.toString() !== channelId) {
        return res.status(400).json({ message: "Message does not belong to this channel." });
      }
      channel.pinnedMessage = messageId;
    } else {
      // Unpinning the message
      channel.pinnedMessage = null;
    }

    await channel.save();

    // Populate data for response and WebSocket
    await channel.populate([
        { path: 'admin', select: 'firstName lastName email _id image color' },
        { path: 'members', select: 'firstName lastName email _id image color' }
    ]);

    if (channel.pinnedMessage) {
      await channel.populate({
        path: 'pinnedMessage',
        populate: { path: 'sender', select: 'firstName lastName _id image color' }
      });
    }

    const io = req.app.get("io");
    const userSocketMap = req.app.get("userSocketMap");

    const eventData = channel.toObject(); // Full channel data

    // Notify all members including the admin
    const allMemberIds = channel.members.map(m => m._id.toString());
    if (!allMemberIds.includes(channel.admin._id.toString())) {
        allMemberIds.push(channel.admin._id.toString());
    }

    allMemberIds.forEach(memberId => {
      const socketId = userSocketMap.get(memberId);
      if (socketId) {
        io.to(socketId).emit('channelUpdated', eventData);
      }
    });

    return res.status(200).json({ message: messageId ? "Message pinned successfully." : "Message unpinned successfully.", channel: eventData });

  } catch (error) {
    console.error("Error pinning/unpinning message:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addMembersToChannel = async (request, response, next) => {
  try {
    const { channelId } = request.params;
    const { memberIds } = request.body;
    const userId = request.userId;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return response.status(404).json({ message: "Channel not found." });
    }

    if (channel.admin.toString() !== userId) {
      return response
        .status(403)
        .json({ message: "User is not authorized to add members." });
    }

    const users = await User.find({ _id: { $in: memberIds } });

    if (users.length !== memberIds.length) {
      return response
        .status(400)
        .json({ message: "Some provided user IDs are invalid." });
    }

    channel.members = [...new Set([...channel.members, ...memberIds])];

    await channel.save();

    const updatedChannel = await Channel.findById(channelId)
      .populate("members", "firstName lastName _id image color")
      .populate("admin", "firstName lastName _id image color");

    return response.status(200).json({ channel: updatedChannel });
  } catch (error) {
    console.error("Error adding members to channel:", error);
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
        select: "firstName lastName email _id image color",
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
