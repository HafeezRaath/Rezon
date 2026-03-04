import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    uid: { 
        type: String, 
        required: true, 
        unique: true,
        index: true // Fast lookup ke liye
    },
    name: { 
        type: String, 
        required: true,
        trim: true // Extra spaces khatam karne ke liye
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true, // Email ko hamesha lowercase mein rakhega
        index: true 
    },
    // Password field (Bcrypt ke sath hash karke save kariyega)
    password: {
        type: String,
        default: "" 
    },
    // Phone & OTP Status
    phoneNumber: { 
        type: String, 
        default: "",
        index: true 
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    profilePic: { 
        type: String, 
        default: "" 
    },
    
    // Identity Verification (KYC) Fields
    isVerified: {
        type: Boolean,
        default: false,
        index: true
    },
    idCardFront: {
        type: String, 
        default: ""
    },
    idCardBack: {
        type: String,
        default: ""
    },
    verificationStatus: {
        type: String,
        enum: ['Unverified', 'Pending', 'Verified', 'Rejected'],
        default: 'Unverified',
        index: true
    },

    // Rating & Reviews
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    
    // Admin/Safety
    warningCount: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    
    // Online status
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null }

}, { timestamps: true });

// ✅ Composite index for admin filters
UserSchema.index({ isVerified: 1, verificationStatus: 1 });
UserSchema.index({ isActive: 1, isFlagged: 1 });

export default mongoose.model("User", UserSchema);