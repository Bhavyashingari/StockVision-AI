import { Server as SocketIOServer } from "socket.io";
import Message from "./model/MessagesModel.js";
import Channel from "./model/ChannelModel.js";
import User from "./model/UserModel.js"; // Import User model
import { clerkClient } from "@clerk/express"; // Import clerkClient

const setupSocket = (server) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.ORIGIN, // Ensure ORIGIN is correctly set for your client
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const userSocketMap = new Map();

  const addChannelNotify = async (channel) => {
    if (channel && channel.members) {
      channel.members.forEach((member) => {
        const memberSocketId = userSocketMap.get(member.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("new-channel-added", channel);
        }
      });
    }
  };

  const sendMessage = async (message) => {
    const recipientSocketId = userSocketMap.get(message.recipient);
    const senderSocketId = userSocketMap.get(message.sender);

    // Create the message
    const createdMessage = await Message.create(message);

    // Find the created message by its ID and populate sender and recipient details
    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .populate("recipient", "id email firstName lastName image color")
      .exec();

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receiveMessage", messageData);
    }

    // Optionally, send the message back to the sender (e.g., for message confirmation)
    if (senderSocketId) {
      io.to(senderSocketId).emit("receiveMessage", messageData);
    }
  };

  const sendChannelMessage = async (message) => {
    const { channelId, sender, content, messageType, fileUrl } = message;

    // Create and save the message
    const createdMessage = await Message.create({
      sender,
      recipient: null, // Channel messages don't have a single recipient
      content,
      messageType,
      timestamp: new Date(),
      fileUrl,
    });

    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .exec();

    // Add message to the channel
    await Channel.findByIdAndUpdate(channelId, {
      $push: { messages: createdMessage._id },
    });

    // Fetch all members of the channel
    const channel = await Channel.findById(channelId).populate("members");

    const finalData = { ...messageData._doc, channelId: channel._id };
    if (channel && channel.members) {
      channel.members.forEach((member) => {
        const memberSocketId = userSocketMap.get(member._id.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("recieve-channel-message", finalData);
        }
      });
      const adminSocketId = userSocketMap.get(channel.admin._id.toString());
      if (adminSocketId) {
        io.to(adminSocketId).emit("recieve-channel-message", finalData);
      }
    }
  };

  const disconnect = (socket) => {
    console.log(`Client disconnected: ${socket.id}, User: ${socket.localUserId || 'N/A'}`);
    if (socket.localUserId) { // Use localUserId attached to socket
      userSocketMap.delete(socket.localUserId);
    } else { // Fallback if localUserId was not set (e.g., auth failed)
      for (const [userId, socketId] of userSocketMap.entries()) {
        if (socketId === socket.id) {
          userSocketMap.delete(userId);
          break;
        }
      }
    }
  };

  io.on("connection", async (socket) => { // Make connection handler async
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log(`Socket connection attempt from ${socket.id} without token. Disconnecting.`);
      return socket.disconnect(true);
    }

    try {
      const requestState = await clerkClient.authenticateRequest({
        secretKey: process.env.CLERK_SECRET_KEY,
        publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
        headerToken: token,
      });

      if (!requestState.isSignedIn || !requestState.userId) {
        console.log(`Socket token invalid or session expired for ${socket.id}. Status: ${requestState.status}. Disconnecting.`);
        return socket.disconnect(true);
      }

      const clerkUserId = requestState.userId;
      const localUser = await User.findOne({ clerkUserId: clerkUserId });

      if (!localUser) {
        console.log(`Authenticated user ${clerkUserId} (socket ${socket.id}) not found in local DB. Disconnecting.`);
        return socket.disconnect(true);
      }

      const localUserId = localUser._id.toString();
      socket.localUserId = localUserId; // Attach local MongoDB User ID to the socket object

      userSocketMap.set(localUserId, socket.id);
      console.log(`User ${localUserId} (Clerk: ${clerkUserId}) connected with socket ID: ${socket.id}`);

    } catch (error) {
      console.error(`Error during socket authentication for ${socket.id}:`, error.message);
      if (error.errors) console.error('Clerk errors:', JSON.stringify(error.errors));
      return socket.disconnect(true);
    }

    // At this point, socket.localUserId is set and can be used by handlers

    socket.on("add-channel-notify", addChannelNotify); // This function needs to be aware of localUserId if it uses it

    // Ensure sendMessage and sendChannelMessage use localUserId for sender
    // For example, if message object has a 'sender' field, it should be populated with socket.localUserId
    socket.on("sendMessage", async (message) => { // Assuming message is an object like { recipient: 'recipientMongoId', content: '...' }
        if (!socket.localUserId) return console.error("sendMessage: sender not authenticated on socket.");
        await sendMessage({ ...message, sender: socket.localUserId });
    });

    socket.on("send-channel-message", async (message) => { // Assuming message is { channelId: '...', content: '...' }
        if (!socket.localUserId) return console.error("sendChannelMessage: sender not authenticated on socket.");
        await sendChannelMessage({ ...message, sender: socket.localUserId });
    });

    socket.on("disconnect", () => disconnect(socket)); // disconnect function updated to use socket.localUserId

    // WebRTC Signaling - Update 'from' to use socket.localUserId
    // targetUserId in data is expected to be the MongoDB _id of the target user
    socket.on("initiate-call", (data) => {
      if (!socket.localUserId) return console.error("initiate-call: sender not authenticated on socket.");
      const targetSocketId = userSocketMap.get(data.targetUserId); // data.targetUserId should be MongoDB _id
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-offer", {
          from: socket.localUserId, // Use local MongoDB _id
          offer: data.offer,
          callerInfo: data.callerInfo, // Ensure callerInfo contains relevant info (like MongoDB _id, name)
        });
      }
    });

    socket.on("call-answer", (data) => {
      if (!socket.localUserId) return console.error("call-answer: sender not authenticated on socket.");
      const targetSocketId = userSocketMap.get(data.targetUserId); // data.targetUserId is who initiated the call (MongoDB _id)
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-answered", {
          from: socket.localUserId, // Use local MongoDB _id
          answer: data.answer,
        });
      }
    });

    socket.on("call-rejected", (data) => {
      if (!socket.localUserId) return console.error("call-rejected: sender not authenticated on socket.");
      const targetSocketId = userSocketMap.get(data.targetUserId); // data.targetUserId is who initiated the call
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-declined", {
          from: socket.localUserId, // Use local MongoDB _id
        });
      }
    });

    socket.on("ice-candidate", (data) => {
      if (!socket.localUserId) return console.error("ice-candidate: sender not authenticated on socket.");
      const targetSocketId = userSocketMap.get(data.targetUserId); // data.targetUserId is the peer in the call
      if (targetSocketId) {
        io.to(targetSocketId).emit("ice-candidate", {
          from: socket.localUserId, // Use local MongoDB _id
          candidate: data.candidate,
        });
      }
    });

    socket.on("end-call", (data) => {
      if (!socket.localUserId) return console.error("end-call: sender not authenticated on socket.");
      const targetSocketId = userSocketMap.get(data.targetUserId); // data.targetUserId is the peer in the call
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-ended", {
          from: socket.localUserId, // Use local MongoDB _id
        });
      }
    });
  });
};

export default setupSocket;
