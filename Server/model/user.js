import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    uid: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    name: { 
        type: String, 
        required: true,
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        index: true 
    },
    phoneNumber: { 
        type: String, 
        default: "",
        unique: true,
        sparse: true,
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
    
    // Identity Verification
    isVerified: {
        type: Boolean,
        default: false,
        index: true
    },
    idCardFront: { type: String, default: "" },
    idCardBack: { type: String, default: "" },
    verificationStatus: {
        type: String,
        enum: ['Unverified', 'Pending', 'Verified', 'Rejected'],
        default: 'Unverified',
        index: true
    },

    // Rating & Reviews
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    
    // Admin/Safety - 🔧 FIXED: Added status & isBanned
    warningCount: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },           // ✅ ADDED
    status: {                                               // ✅ ADDED
        type: String, 
        enum: ['Active', 'Suspended', 'Banned'], 
        default: 'Active' 
    },
    
    // Online status
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },

    // Notifications
    notifications: [{
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: { 
            type: String, 
            enum: ['WARNING', 'AD_DELETED', 'AD_REJECTED', 'MESSAGE', 'VERIFICATION', 'SYSTEM'],
            default: 'SYSTEM'
        },
        read: { type: Boolean, default: false },
        link: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now }
    }]

}, { timestamps: true });

// Indexes
UserSchema.index({ isVerified: 1, verificationStatus: 1 });
UserSchema.index({ isActive: 1, isFlagged: 1 });
UserSchema.index({ isBanned: 1, status: 1 });                    // ✅ ADDED
UserSchema.index({ "notifications.read": 1, "notifications.createdAt": -1 });

export default mongoose.model("User", UserSchema);