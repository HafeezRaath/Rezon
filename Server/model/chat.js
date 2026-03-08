import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: String,
        required: true,
      },
    ],
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ad", 
      required: true,
      index: true
    },
    messages: [
      {
        senderId: String,
        message: String,
        timestamp: { type: Date, default: Date.now },
        isRead: { type: Boolean, default: false },
        readAt: { type: Date }  // ← Added
      },
    ],
    lastMessage: {
      type: String,
      default: ""
    },
    lastMessageTime: {
      type: Date,
      default: Date.now
    },
    deletedBy: {
      type: [String], 
      default: [],
    },
    // Typing indicator
    typing: {
      userId: { type: String },
      startedAt: { type: Date }
    }
  },
  { timestamps: true }
);

// Indexes
ChatSchema.index({ participants: 1 });
ChatSchema.index({ participants: 1, updatedAt: -1 });
ChatSchema.index({ adId: 1, participants: 1 });

export default mongoose.model("Chat", ChatSchema);