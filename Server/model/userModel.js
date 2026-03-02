import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
  {
    posted_by_uid: {
      type: String,
      required: true,
      index: true,
    },
    images: {
      type: [String],
      required: true,
    },
    imageHashes: {
      type: [String],
      index: true,
      default: [],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    condition: {
      type: String,
      required: true,
      enum: ["Used", "New"],
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Mobile", "Car", "PropertySale", "PropertyRent", "Electronics",
        "Bikes", "Business", "Services", "Jobs", "Animals", "Furniture",
        "Fashion", "Books", "Kids",
      ],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    status: {
      type: String,
      enum: ['Active', 'Reserved', 'Sold'],
      default: 'Active'
    },
    soldTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    soldAt: {
      type: Date,
      default: null
    },
    
    // ✅ NEW: Soft delete fields for TTL
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deleteAfter: {
      type: Date,
      default: null
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ✅ TTL Index: Auto-delete documents when deleteAfter time is reached
// MongoDB automatically removes documents 30 days after sold
adSchema.index({ deleteAfter: 1 }, { expireAfterSeconds: 0 });

// ✅ Composite index for faster queries (active ads only)
adSchema.index({ posted_by_uid: 1, isDeleted: 1, createdAt: -1 });
adSchema.index({ status: 1, isDeleted: 1 });

export default mongoose.model("Ad", adSchema);