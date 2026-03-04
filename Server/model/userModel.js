import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
  {
    posted_by_uid: {
      type: String,
      required: true,
      index: true, // User ads filter karne ke liye fast index
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
      index: 'text', // ✅ Atlas Text Search support ke liye
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      index: true, // Price range filtering ke liye
    },
    location: {
      type: String,
      required: true,
      index: true, // City-wise filtering ke liye
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
      index: true, // Category-wise filter fast karne ke liye
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    status: {
      type: String,
      enum: ['Active', 'Reserved', 'Sold'],
      default: 'Active',
      index: true
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
    
    // Soft delete fields for TTL
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

// ✅ TTL Index: Auto-delete setup
adSchema.index({ deleteAfter: 1 }, { expireAfterSeconds: 0 });

// ✅ Composite index: Live production queries ko optimize karne ke liye
adSchema.index({ category: 1, status: 1, isDeleted: 1 });
adSchema.index({ posted_by_uid: 1, isDeleted: 1, createdAt: -1 });

export default mongoose.model("Ad", adSchema);