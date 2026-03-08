import express from "express";
import multer from "multer";
import { 
    create, 
    deleteAd, 
    getAllAds, 
    getAdById, 
    updateAd,
    getMyAds,
    registerUser,
    createReview,
    createReport,
    getSellerReviews,
    markAsSold,
    getChatUsersForAd,
    canReview,
    getAISuggestions,
    verifyIdentity,
    me 
} from "../Controller/userController.js"; 

import authenticate from '../authMiddleware.js'; 
import Chat from "../model/chat.js"; 
import User from "../model/user.js";

const route = express.Router();

// Multer Setup - Memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ========== USER & AUTH ROUTES ==========
route.post("/register", registerUser); 
route.get("/users/me", authenticate, me);

// Identity Verification
route.post("/verify-identity", authenticate, upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'liveSelfie', maxCount: 1 }
]), verifyIdentity);

// ========== NOTIFICATIONS ROUTES ==========
route.get("/notifications", authenticate, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        res.status(200).json({ 
            notifications: user?.notifications || [] 
        });
    } catch (error) {
        res.status(500).json({ message: "Notifications fetch nahi ho saki" });
    }
});

// Mark single notification as read
route.put("/notifications/:id/read", authenticate, async (req, res) => {
    try {
        await User.updateOne(
            { uid: req.user.uid, "notifications._id": req.params.id },
            { $set: { "notifications.$.read": true } }
        );
        res.status(200).json({ message: "Marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Failed to mark as read" });
    }
});

// Mark all notifications as read
route.put("/notifications/read-all", authenticate, async (req, res) => {
    try {
        await User.updateOne(
            { uid: req.user.uid },
            { $set: { "notifications.$[].read": true } }
        );
        res.status(200).json({ message: "All marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Failed to mark all as read" });
    }
});

// Delete notification
route.delete("/notifications/:id", authenticate, async (req, res) => {
    try {
        await User.updateOne(
            { uid: req.user.uid },
            { $pull: { notifications: { _id: req.params.id } } }
        );
        res.status(200).json({ message: "Notification deleted" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete" });
    }
});

// ========== AD & AI ROUTES ==========
route.post("/ad/ai-assist", authenticate, upload.array("images", 10), getAISuggestions);
route.post("/ad", authenticate, upload.array("images", 10), create);
route.get("/ads", getAllAds); 
route.get("/ads/:id", getAdById);
route.get("/myads", authenticate, getMyAds); 
route.put("/ads/:id", authenticate, upload.array("images", 5), updateAd);
route.delete("/ads/:id", authenticate, deleteAd);

// ========== SALES & REVIEWS ==========
route.get("/ad/:adId/chat-users", authenticate, getChatUsersForAd);
route.post("/ad/:adId/mark-sold", authenticate, markAsSold);
route.get("/can-review/:adId", authenticate, canReview);
route.post("/reviews", authenticate, createReview);
route.get("/reviews/seller/:sellerId", getSellerReviews);

// ========== REPORT ROUTES ==========
route.post("/reports", authenticate, createReport);

// ========== CHAT SYSTEM ROUTES ==========
route.post("/chat/start", authenticate, async (req, res) => {
    try {
        const { buyerId, sellerId, adId } = req.body;
        let chat = await Chat.findOne({
            adId: adId,
            participants: { $all: [buyerId, sellerId] }
        });

        if (chat) {
            chat.deletedBy = []; 
            await chat.save();
        } else {
            chat = new Chat({
                participants: [buyerId, sellerId],
                adId: adId,
                messages: [],
                lastMessage: "",
                deletedBy: [] 
            });
            await chat.save();
        }
        res.status(200).json({ chatId: chat._id });
    } catch (error) {
        res.status(500).json({ message: "Chat start karne mein masla hai" });
    }
});
// Phone check endpoint
route.get("/check-phone", authenticate, async (req, res) => {
    try {
        const { phone } = req.query;
        const exists = await User.findOne({ phoneNumber: phone });
        res.json({ exists: !!exists });
    } catch (error) {
        res.status(500).json({ message: "Error checking phone" });
    }
});

// Update user profile (phone/password)
route.put("/users/me", authenticate, async (req, res) => {
    try {
        const { phoneNumber, password, isPhoneVerified } = req.body;
        const user = await User.findOne({ uid: req.user.uid });
        
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check phone unique
        if (phoneNumber && phoneNumber !== user.phoneNumber) {
            const exists = await User.findOne({ phoneNumber });
            if (exists) return res.status(400).json({ message: "Phone already registered" });
        }

        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (isPhoneVerified) user.isPhoneVerified = true;
        // Password hashing backend mein karein
        if (password) user.password = await bcrypt.hash(password, 10);

        await user.save();
        res.json({ success: true, message: "Profile updated" });
    } catch (error) {
        res.status(500).json({ message: "Update failed", error: error.message });
    }
});

export default route;