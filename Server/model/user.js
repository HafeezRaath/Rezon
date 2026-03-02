import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    uid: { 
        type: String, 
        required: true, 
        unique: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    // ✅ NEW: Password field (Bcrypt ke sath hash karke save kariyega)
    password: {
        type: String,
        default: "" 
    },
    // ✅ NEW: Phone & OTP Status
    phoneNumber: { 
        type: String, 
        default: "" 
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    profilePic: { 
        type: String, 
        default: "" 
    },
    
    // ✅ NEW: Identity Verification (KYC) Fields
    isVerified: {
        type: Boolean,
        default: false
    },
    idCardFront: {
        type: String, // Path to local uploads folder
        default: ""
    },
    idCardBack: {
        type: String,
        default: ""
    },
    verificationStatus: {
        type: String,
        enum: ['Unverified', 'Pending', 'Verified', 'Rejected'],
        default: 'Unverified'
    },

    // Rating & Reviews (Existing)
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    
    // Admin/Safety (Existing)
    warningCount: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    
    // Online status (Existing)
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null }

}, { timestamps: true });

export default mongoose.model("User", UserSchema);