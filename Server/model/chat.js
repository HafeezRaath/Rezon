import mongoose from "mongoose"; // Baqi files ke mutabiq import use karein

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
    },
    messages: [
      {
        senderId: String,
        message: String,
        timestamp: { type: Date, default: Date.now },
        isRead: { type: Boolean, default: false },
      },
    ],
    lastMessage: {
      type: String,
    },
    // 🔑 Ye field humne add ki hai soft delete ke liye
    deletedBy: {
      type: [String], // Array of Firebase UIDs
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Chat", ChatSchema);