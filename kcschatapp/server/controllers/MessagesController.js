import Message from "../model/MessagesModel.js";
import Channel from "../model/ChannelModel.js"; // Added for channel member lookup
import { mkdirSync, renameSync } from "fs";

export const getMessages = async (req, res, next) => {
  try {
    const user1 = req.userId;
    const user2 = req.body.id;
    if (!user1 || !user2) {
      return res.status(400).send("Both user IDs are required.");
    }

    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 },
      ],
    }).sort({ timestamp: 1 });

    return res.status(200).json({ messages });
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

export const uploadFile = async (request, response, next) => {
  try {
    if (request.file) {
      console.log("in try if");
      const date = Date.now();
      let fileDir = `uploads/files/${date}`;
      let fileName = `${fileDir}/${request.file.originalname}`;

      // Create directory if it doesn't exist
      mkdirSync(fileDir, { recursive: true });

      renameSync(request.file.path, fileName);
      return response.status(200).json({ filePath: fileName });
    } else {
      return response.status(404).send("File is required.");
    }
  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error.");
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;
    const io = req.app.get("io");
    const userSocketMap = req.app.get("userSocketMap");

    const message = await Message.findById(messageId).populate("sender recipient channel");

    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    if (message.sender._id.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "User not authorized to delete this message." });
    }

    if (message.isDeleted) {
      return res
        .status(400)
        .json({ message: "Message is already deleted." });
    }

    message.content = "This message was deleted.";
    message.originalContentType = message.messageType;
    message.messageType = "text"; // Or a new specific type like "deleted"
    message.isDeleted = true;
    message.fileUrl = undefined;
    // Clear any other media URLs if present, e.g., message.audioUrl = undefined;
    message.editedAt = new Date(); // Timestamp of deletion for client sorting/display

    await message.save();

    // Prepare data for WebSocket emission (consistent with receiveMessage/receive-channel-message)
    const eventData = {
      _id: message._id,
      content: message.content,
      messageType: message.messageType,
      isDeleted: message.isDeleted,
      sender: message.sender, // Populated sender
      recipient: message.recipient, // Populated recipient (null for channel)
      channelId: message.channel ? message.channel._id : null, // Channel ID if it's a channel message
      timestamp: message.timestamp, // Original timestamp
      editedAt: message.editedAt, // Deletion/edit timestamp
      originalContentType: message.originalContentType,
    };


    if (message.recipient) { // DM
      const recipientSocketId = userSocketMap.get(message.recipient._id.toString());
      const senderSocketId = userSocketMap.get(message.sender._id.toString());

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("messageDeleted", eventData);
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDeleted", eventData);
      }
    } else if (message.channel) { // Channel Message
      const channel = await Channel.findById(message.channel._id).populate("members admin");
      if (channel) {
        channel.members.forEach(member => {
          const memberSocketId = userSocketMap.get(member._id.toString());
          if (memberSocketId) {
            io.to(memberSocketId).emit("messageDeleted", eventData);
          }
        });
        const adminSocketId = userSocketMap.get(channel.admin._id.toString());
        if (adminSocketId) {
           io.to(adminSocketId).emit("messageDeleted", eventData);
        }
      }
    }

    return res.status(200).json({ message: "Message deleted successfully", deletedMessage: eventData });
  } catch (error) {
    console.error("Error deleting message:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { newContent } = req.body;
    const userId = req.userId;
    const io = req.app.get("io");
    const userSocketMap = req.app.get("userSocketMap");

    if (!newContent || typeof newContent !== 'string' || newContent.trim() === "") {
      return res.status(400).json({ message: "New content cannot be empty." });
    }

    const message = await Message.findById(messageId).populate("sender recipient channel");

    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    if (message.sender._id.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "User not authorized to edit this message." });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: "Cannot edit a deleted message." });
    }

    if (message.messageType !== "text" && message.originalContentType !== "text" && !message.isDeleted) {
       // Allow editing if it was originally text, even if now "deleted" (but not yet saved as such in this flow)
      return res.status(400).json({ message: "Only text messages can be edited." });
    }

    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    // Re-populate sender in case it's needed (though already populated)
    // await message.populate('sender', 'firstName lastName email _id image color').execPopulate();

    const eventData = {
      _id: message._id,
      content: message.content,
      messageType: message.messageType,
      isEdited: message.isEdited,
      editedAt: message.editedAt,
      sender: message.sender, // Populated sender
      recipient: message.recipient, // Populated recipient (null for channel)
      channelId: message.channel ? message.channel._id : null, // Channel ID if it's a channel message
      timestamp: message.timestamp, // Original timestamp
    };

    if (message.recipient) { // DM
      const recipientSocketId = userSocketMap.get(message.recipient._id.toString());
      const senderSocketId = userSocketMap.get(message.sender._id.toString());

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("messageEdited", eventData);
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageEdited", eventData);
      }
    } else if (message.channel) { // Channel Message
      const channel = await Channel.findById(message.channel._id).populate("members admin");
      if (channel) {
        channel.members.forEach(member => {
          const memberSocketId = userSocketMap.get(member._id.toString());
          if (memberSocketId) {
            io.to(memberSocketId).emit("messageEdited", eventData);
          }
        });
         const adminSocketId = userSocketMap.get(channel.admin._id.toString());
        if (adminSocketId) {
           io.to(adminSocketId).emit("messageEdited", eventData);
        }
      }
    }

    return res.status(200).json({ message: "Message edited successfully", editedMessage: eventData });
  } catch (error) {
    console.error("Error editing message:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
