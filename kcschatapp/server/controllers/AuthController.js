// import jwt from "jsonwebtoken"; // JWT creation is handled by Clerk
import User from "../model/UserModel.js";
// import { compare } from "bcrypt"; // Password comparison handled by Clerk
import { renameSync, unlinkSync } from "fs";

// const maxAge = 3 * 24 * 60 * 60 * 1000; // Cookie maxAge, if needed for other cookies

// const createToken = (email, userId) => { // Token creation is handled by Clerk
//   return jwt.sign({ email, userId }, process.env.JWT_KEY, {
//     expiresIn: maxAge,
//   });
// };

// Signup is handled by Clerk. User data might be synced via webhooks.
export const signup = async (req, res, next) => {
  res.status(501).json({ message: "Signup is handled by Clerk. This endpoint is likely deprecated or needs redesign for webhook sync." });
};

// Login is handled by Clerk.
export const login = async (req, res, next) => {
  res.status(501).json({ message: "Login is handled by Clerk. This endpoint is likely deprecated." });
};

export const getUserInfo = async (request, response, next) => {
  try {
    const clerkUserId = request.auth?.userId; // Get clerkUserId from req.auth
    if (clerkUserId) {
      // Find user by clerkUserId in your database
      const userData = await User.findOne({ clerkUserId: clerkUserId });
      if (userData) {
        return response.status(200).json({
          id: userData._id, // Use MongoDB's _id as the internal ID if needed
          clerkUserId: userData.clerkUserId, // Include clerkId
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          image: userData.image,
          profileSetup: userData.profileSetup,
          color: userData.color,
        });
      } else {
        // This case means the user is authenticated with Clerk but not in local DB.
        // This could trigger a user creation/sync flow.
        return response.status(404).send("User not found in local database. Sync may be required.");
      }
    } else {
      // This should ideally not be reached if ensureAuthenticated middleware is used correctly
      return response.status(401).send("User not authenticated.");
    }
  } catch (error) {
    console.error("Error in getUserInfo:", error);
    return response.status(500).send("Internal Server Error");
  }
};

// Logout is primarily handled by Clerk's frontend SDKs by clearing Clerk's session.
// This backend endpoint might not be needed or could be used for app-specific cleanup.
export const logout = async (request, response, next) => {
  // req.auth will exist if ensureAuthenticated was used.
  // Clerk's SDKs handle frontend logout. If specific backend session cleanup for this app is needed, do it here.
  // For now, just acknowledge.
  // response.clearCookie("jwt"); // Clear any old JWT cookie if it was used
  return response.status(200).json({ message: "Logout acknowledged. Ensure client-side Clerk session is cleared." });
};

export const updateProfile = async (request, response, next) => {
  try {
    const clerkUserId = request.auth?.userId;
    const { firstName, lastName, color } = request.body;

    if (!clerkUserId) {
      // Should be caught by ensureAuthenticated
      return response.status(401).send("User not authenticated.");
    }

    if (!firstName || !lastName) {
      return response.status(400).send("Firstname and Last name are required.");
    }

    const userData = await User.findOneAndUpdate(
      { clerkUserId: clerkUserId }, // Find by clerkUserId
      {
        firstName,
        lastName,
        color,
        profileSetup: true,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!userData) {
      return response.status(404).send("User not found in local database for update.");
    }

    return response.status(200).json({
      id: userData._id, // Use MongoDB _id
      clerkUserId: userData.clerkUserId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      image: userData.image,
      profileSetup: userData.profileSetup,
      color: userData.color,
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return response.status(500).send("Internal Server Error.");
  }
};

export const addProfileImage = async (request, response, next) => {
  try {
    const clerkUserId = request.auth?.userId;
    if (!clerkUserId) {
      return response.status(401).send("User not authenticated.");
    }

    if (request.file) {
      const date = Date.now();
      let fileName = "uploads/profiles/" + date + request.file.originalname;
      renameSync(request.file.path, fileName);
      const updatedUser = await User.findOneAndUpdate(
        { clerkUserId: clerkUserId }, // Find by clerkUserId
        { image: fileName },
        {
          new: true,
          runValidators: true,
        }
      );
      if (!updatedUser) {
        return response.status(404).send("User not found for image update.");
      }
      return response.status(200).json({ image: updatedUser.image });
    } else {
      return response.status(400).send("File is required.");
    }
  } catch (error) {
    console.error("Error in addProfileImage:", error);
    return response.status(500).send("Internal Server Error.");
  }
};

export const removeProfileImage = async (request, response, next) => {
  try {
    const clerkUserId = request.auth?.userId;

    if (!clerkUserId) {
      return response.status(401).send("User not authenticated.");
    }

    const user = await User.findOne({ clerkUserId: clerkUserId }); // Find by clerkUserId

    if (!user) {
      return response.status(404).send("User not found.");
    }

    if (user.image) {
      try {
        unlinkSync(user.image);
      } catch (unlinkError) {
        console.warn(`Failed to delete image file ${user.image}:`, unlinkError.message);
        // Decide if this should be a hard error or just a warning
      }
    }

    user.image = null;
    await user.save();

    return response
      .status(200)
      .json({ message: "Profile image removed successfully." });
  } catch (error) {
    console.error("Error in removeProfileImage:", error);
    return response.status(500).send("Internal Server Error.");
  }
};
