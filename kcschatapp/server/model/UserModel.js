import mongoose from "mongoose";
// import bcrypt from "bcrypt"; // Removed bcrypt

const userSchema = new mongoose.Schema({
  clerkUserId: { // Added clerkUserId
    type: String,
    unique: true,
    // sparse: true, // Consider if nulls are possible for non-clerk users
    required: true, // Assuming all users will have a Clerk ID
  },
  email: {
    type: String,
    required: [true, "Email is Required"],
    // unique: true, // Removed: Clerk handles email uniqueness. clerkUserId is the unique key.
  },
  // password: { // Removed password field
  //   type: String,
  //   required: [true, "Password is Required"],
  // },
  firstName: {
    type: String,
    required: false,
  },
  lastName: {
    type: String,
    required: false,
  },
  image: {
    type: String,
    required: false,
  },
  profileSetup: {
    type: Boolean,
    default: false,
  },
  color: {
    type: Number,
    required: false,
  },
});

// userSchema.pre("save", async function (next) { // Removed password hashing
//   const salt = await bcrypt.genSalt();
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// userSchema.statics.login = async function (email, password) { // Removed static login method
//   const user = await this.findOne({ email });
//   if (user) {
//     const auth = await bcrypt.compare(password, user.password);
//     if (auth) {
//       return user;
//     }
//     throw Error("incorrect password");
//   }
//   throw Error("incorrect email");
// };

const User = mongoose.model("Users", userSchema);
export default User;
