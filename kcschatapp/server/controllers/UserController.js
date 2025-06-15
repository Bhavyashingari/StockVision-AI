import User from "../model/UserModel.js";

export const updateDmSettings = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { allowDMs } = req.body;

    if (typeof allowDMs !== "boolean") {
      return res
        .status(400)
        .json({ message: "Invalid input: allowDMs must be a boolean." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.allowDirectMessages = allowDMs;
    await user.save();

    // Exclude password from the returned user object
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      message: "Direct message settings updated successfully.",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error updating DM settings:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
