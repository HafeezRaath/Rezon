import express from "express";
import multer from "multer";
import bcrypt from 'bcrypt'; 
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
    me,
    getChatList,
    getChatMessages, 
    sendMessage,
    deleteChat,
    startChat
} from "../Controller/userController.js"; 

import authenticate from '../authMiddleware.js'; 
import User from "../model/user.js";
// 👇 Cloudinary Middleware Import (Jo humne cloudinary.js mein banaya tha)
import { upload as cloudinaryUpload } from "../cloudinary.js";

const route = express.Router();

// 📂 Local Memory Storage (Sirf AI aur KYC ke liye jahan Buffer ki zaroorat hai)
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({ 
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ========== USER & AUTH ROUTES ==========
route.post("/register", registerUser);
route.get("/users/me", authenticate, me);

// Identity Verification (OpenAI analysis ke liye buffer chahiye, isliye memoryStorage use kiya)
route.post("/verify-identity", authenticate, uploadMemory.fields([
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

// 🤖 AI Suggestions (Images ko OpenAI analyze karega, isliye Buffer chahiye)
route.post("/ad/ai-assist", authenticate, uploadMemory.array("images", 10), getAISuggestions);

// ☁️ Create Ad (Images direct Cloudinary par upload hongi)
route.post("/ad", authenticate, cloudinaryUpload.array("images", 10), create);

route.get("/ads", getAllAds);
route.get("/ads/:id", getAdById);
route.get("/myads", authenticate, getMyAds);

// ☁️ Update Ad (New images bhi Cloudinary par jayengi)
route.put("/ads/:id", authenticate, cloudinaryUpload.array("images", 5), updateAd);

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
route.get("/chat/list/:userId", authenticate, getChatList);
route.get("/chat/:chatId", authenticate, getChatMessages);
route.post("/chat/start", authenticate, startChat);
route.post("/chat/:chatId/message", authenticate, sendMessage);
route.delete("/chat/:chatId", authenticate, deleteChat);

// ========== USER PROFILE ROUTES ==========
route.get("/check-phone", authenticate, async (req, res) => {
    try {
        const { phone } = req.query;
        const exists = await User.findOne({ phoneNumber: phone });
        res.json({ exists: !!exists });
    } catch (error) {
        res.status(500).json({ message: "Error checking phone" });
    }
});

route.put("/users/me", authenticate, async (req, res) => {
    try {
        const { phoneNumber, password, isPhoneVerified } = req.body;
        const user = await User.findOne({ uid: req.user.uid });
        
        if (!user) return res.status(404).json({ message: "User not found" });

        if (phoneNumber && phoneNumber !== user.phoneNumber) {
            const exists = await User.findOne({ phoneNumber });
            if (exists) return res.status(400).json({ message: "Phone already registered" });
        }

        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (isPhoneVerified) user.isPhoneVerified = true;
        if (password) user.password = await bcrypt.hash(password, 10);

        await user.save();
        res.json({ success: true, message: "Profile updated" });
    } catch (error) {
        res.status(500).json({ message: "Update failed", error: error.message });
    }
});

export default route;