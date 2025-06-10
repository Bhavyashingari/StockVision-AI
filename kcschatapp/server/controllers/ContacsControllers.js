import mongoose from "mongoose";
import User from "../model/UserModel.js";
import Message from "../model/MessagesModel.js";

export const getAllContacts = async (request, response, next) => {
  try {
    const clerkUserId = request.auth?.userId;
    if (!clerkUserId) {
      return response.status(401).send("User not authenticated.");
    }
    const localUser = await User.findOne({ clerkUserId: clerkUserId });
    if (!localUser) {
      return response.status(404).send("Authenticated user not found in local database.");
    }
    const localUserId = localUser._id;

    const users = await User.find(
      { _id: { $ne: localUserId } }, // Exclude the current user by their MongoDB _id
      "firstName lastName _id email image color clerkUserId" // Added more fields
    );

    const contacts = users.map((user) => ({
      label: `${user.firstName} ${user.lastName} (${user.email})`, // Added email to label for clarity
      value: user._id, // MongoDB _id
      clerkUserId: user.clerkUserId, // Include Clerk ID
      image: user.image,
      color: user.color,
    }));

    return response.status(200).json({ contacts });
  } catch (error) {
    console.error("Error in getAllContacts:", error);
    return response.status(500).send("Internal Server Error.");
  }
};

export const searchContacts = async (request, response, next) => {
  try {
    const clerkUserId = request.auth?.userId;
    if (!clerkUserId) {
      return response.status(401).send("User not authenticated.");
    }
    const localUser = await User.findOne({ clerkUserId: clerkUserId });
    if (!localUser) {
      return response.status(404).send("Authenticated user not found in local database.");
    }
    const localUserId = localUser._id;

    const { searchTerm } = request.body;

    if (searchTerm === undefined || searchTerm === null) {
      return response.status(400).send("Search Term is required.");
    }

    const sanitizedSearchTerm = searchTerm.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(sanitizedSearchTerm, "i");

    const users = await User.find({ // Changed from contacts to users to match mapping
      $and: [
        { _id: { $ne: localUserId } }, // Exclude current user by MongoDB _id
        {
          $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
        },
      ],
    }, "firstName lastName _id email image color clerkUserId"); // Select fields

    // Map to desired contact format if needed, or return users directly
    const contacts = users.map(user => ({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        image: user.image,
        color: user.color,
        clerkUserId: user.clerkUserId,
    }));

    return response.status(200).json({ contacts });
  } catch (error) {
    console.error("Error in searchContacts:", error);
    return response.status(500).send("Internal Server Error.");
  }
};

export const getContactsForList = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).send("User not authenticated.");
    }
    const localUser = await User.findOne({ clerkUserId: clerkUserId });
    if (!localUser) {
      return res.status(404).send("Authenticated user not found in local database.");
    }
    const localUserMongoId = localUser._id; // This is already an ObjectId

    const contacts = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: localUserMongoId }, { recipient: localUserMongoId }],
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$sender", userId] },
              then: "$recipient",
              else: "$sender",
            },
          },
          lastMessageTime: { $first: "$timestamp" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "contactInfo",
        },
      },
      {
        $unwind: "$contactInfo",
      },
      {
        $project: {
          _id: 1,

          lastMessageTime: 1,
          email: "$contactInfo.email",
          firstName: "$contactInfo.firstName",
          lastName: "$contactInfo.lastName",
          image: "$contactInfo.image",
          color: "$contactInfo.color",
        },
      },
      {
        $sort: { lastMessageTime: -1 },
      },
    ]);

    return res.status(200).json({ contacts });
  } catch (error) {
    console.error("Error getting user contacts:", error);
    return res.status(500).send("Internal Server Error");
  }
};
