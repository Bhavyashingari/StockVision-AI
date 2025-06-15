import { Server as SocketIOServer } from "socket.io";
import Message from "./model/MessagesModel.js";
import Channel from "./model/ChannelModel.js";
import User from "./model/UserModel.js"; // Import User model

let ioInstance;
let userSocketMapInstance = new Map();

export const initSocket = (server) => {
  ioInstance = new SocketIOServer(server, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const addChannelNotify = async (channel) => {
    if (channel && channel.members) {
      channel.members.forEach((member) => {
        const memberSocketId = userSocketMapInstance.get(member.toString());
        if (memberSocketId) {
          ioInstance.to(memberSocketId).emit("new-channel-added", channel);
        }
      });
    }
  };

  const sendMessage = async (message) => {
    const recipientId = message.recipient;
    const senderId = message.sender;

    // Fetch recipient's DM preference
    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      console.error(`Recipient user ${recipientId} not found.`);
      // Optionally notify sender that recipient doesn't exist
      const senderSocketIdOnError = userSocketMapInstance.get(senderId);
      if (senderSocketIdOnError) {
        ioInstance.to(senderSocketIdOnError).emit("sendMessageError", {
          message: "Recipient not found.",
          recipientId: recipientId,
          tempId: message.tempId, // Pass back tempId
        });
      }
      return;
    }

    if (!recipientUser.allowDirectMessages) {
      const senderSocketId = userSocketMapInstance.get(senderId);
      if (senderSocketId) {
        ioInstance.to(senderSocketId).emit("dmBlocked", {
          recipientId: recipientId,
          recipientName: `${recipientUser.firstName || ""} ${recipientUser.lastName || ""}`.trim() || recipientUser.email,
          messageContent: message.content, // Send back the original content
          tempId: message.tempId, // Pass back tempId
        });
      }
      console.log(`DM blocked for user ${recipientId} by ${senderId}`);
      return; // Stop processing the message
    }

    // Create the message if DMs are allowed
    const createdMessage = await Message.create(message);

    // Find the created message by its ID and populate sender and recipient details
    const recipientSocketId = userSocketMapInstance.get(recipientId); // get socket id again
    const senderSocketId = userSocketMapInstance.get(senderId); // get socket id again
    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .populate("recipient", "id email firstName lastName image color")
      .exec();

    if (recipientSocketId) {
      ioInstance.to(recipientSocketId).emit("receiveMessage", messageData);
    }

    // Optionally, send the message back to the sender (e.g., for message confirmation)
    if (senderSocketId) {
      ioInstance.to(senderSocketId).emit("receiveMessage", messageData);
    }
  };

  const sendChannelMessage = async (message) => {
    // Destructure mentionedUserIds from the message payload
    const { channelId, sender, content, messageType, fileUrl, mentionedUserIds, tempId } = message;

    // Create and save the message, including mentions
    const createdMessage = await Message.create({
      sender,
      recipient: null, // Channel messages don't have a single recipient
      channel: channelId, // Store the channel ID
      content,
      messageType,
      timestamp: new Date(),
      fileUrl,
      mentions: mentionedUserIds || [], // Add mentions, default to empty array
    });

    // Populate sender and now also mentions
    // Keep channel population if clients rely on it in the event, otherwise it can be removed if only channelId is needed
    const populatedMessage = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .populate("mentions", "id email firstName lastName image color") // Populate mentions
      .populate("channel") 
      .exec();

    // Add message to the channel
    await Channel.findByIdAndUpdate(channelId, {
      $push: { messages: createdMessage._id },
    });

    // Fetch all members of the channel
    const channel = await Channel.findById(channelId).populate("members admin"); // Ensure admin is populated for the Set logic

    // Use populatedMessage for the event data
    // Ensure channelId is part of the final payload if not relying on populated channel object directly
    const eventData = { 
      ...populatedMessage.toObject(), 
      channelId: channel._id, // Explicitly include channelId
      tempId: tempId // Include tempId for client-side optimistic update reconciliation
    };
    
    if (channel && channel.members) {
      const memberIds = new Set(channel.members.map(member => member._id.toString()));
      memberIds.add(channel.admin._id.toString()); // Add admin, Set handles duplicates

      memberIds.forEach(memberId => {
        const memberSocketId = userSocketMapInstance.get(memberId);
        if (memberSocketId) {
          ioInstance.to(memberSocketId).emit("receive-channel-message", eventData);
        }
      });
    }
  };

  const disconnect = (socket) => {
    console.log("Client disconnected", socket.id);
    for (const [userId, socketId] of userSocketMapInstance.entries()) {
      if (socketId === socket.id) {
        userSocketMapInstance.delete(userId);
        break;
      }
    }
  };

  ioInstance.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      userSocketMapInstance.set(userId, socket.id);
      console.log(`User connected: ${userId} with socket ID: ${socket.id}`);
    } else {
      console.log("User ID not provided during connection.");
    }

    socket.on("add-channel-notify", addChannelNotify);
    socket.on("sendMessage", sendMessage);
    socket.on("send-channel-message", sendChannelMessage);
    socket.on("disconnect", () => disconnect(socket));
  });

  return { io: ioInstance, userSocketMap: userSocketMapInstance };
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized!");
  }
  return ioInstance;
};

export const getUserSocketMap = () => {
  if (!userSocketMapInstance) {
    throw new Error("UserSocketMap not initialized!");
  }
  return userSocketMapInstance;
};
