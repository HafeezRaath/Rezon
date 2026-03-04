import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: String, // Firebase UIDs
        required: true,
      },
    ],
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ad", 
      required: true,
      index: true // Specific ad ki chats jaldi dhoondne ke liye
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
    // Soft delete: User ID array mein hogi toh usay chat nazar nahi aayegi
    deletedBy: {
      type: [String], 
      default: [],
    },
  },
  { timestamps: true }
);

// ✅ Performance Indices for Atlas
// 1. User ki saari chats fast load karne ke liye
ChatSchema.index({ participants: 1 });

// 2. Specific user ki recent chats order mein dekhne ke liye
ChatSchema.index({ participants: 1, updatedAt: -1 });

// 3. Duplicate chat rokne ke liye (Aik ad par do users ki aik hi chat honi chahiye)
ChatSchema.index({ participants: 1, adId: 1 });

export default mongoose.model("Chat", ChatSchema);