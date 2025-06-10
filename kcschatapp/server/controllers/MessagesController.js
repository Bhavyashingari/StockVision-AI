import Message from "../model/MessagesModel.js";
import User from "../model/UserModel.js"; // Import User model
import { mkdirSync, renameSync } from "fs";

export const getMessages = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    const recipientMongoId = req.body.id; // Assuming this is the MongoDB _id of the other user

    if (!clerkUserId) {
      return res.status(401).send("User not authenticated.");
    }
    if (!recipientMongoId) {
      return res.status(400).send("Recipient ID is required.");
    }

    const localUser = await User.findOne({ clerkUserId: clerkUserId });
    if (!localUser) {
      return res.status(404).send("Authenticated user not found in local database.");
    }
    const senderMongoId = localUser._id;

    const messages = await Message.find({
      $or: [
        { sender: senderMongoId, recipient: recipientMongoId },
        { sender: recipientMongoId, recipient: senderMongoId },
      ],
    }).sort({ timestamp: 1 });

    return res.status(200).json({ messages });
  } catch (err) {
    console.error("Error in getMessages:", err);
    return res.status(500).send("Internal Server Error");
  }
};

export const uploadFile = async (request, response, next) => {
  // This function does not directly use userId, but ensureAuthenticated middleware
  // protects it. If any user-specific logic were added (e.g., tracking who uploaded),
  // req.auth.userId (Clerk ID) and subsequent lookup for local MongoDB _id would be needed.
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
