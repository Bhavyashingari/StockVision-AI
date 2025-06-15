import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: false,
  },
  messageType: {
    type: String,
    enum: ["text", "audio", "file"],
    required: true,
  },
  content: {
    type: String,
    required: function () {
      return this.messageType === "text";
    },
  },
  audioUrl: {
    type: String,
    required: function () {
      return this.messageType === "audio";
    },
  },
  fileUrl: {
    type: String,
    required: function () {
      return this.messageType === "file";
    },
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channels",
    required: false,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  originalContentType: {
    type: String, // To store original type if changed on delete
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users', // Should match the model name User refers to, typically 'Users' if that's how User model is registered
    default: []
  }]
});

const Message = mongoose.model("Messages", messageSchema);
export default Message;
