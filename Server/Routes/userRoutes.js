import express from "express";
import multer from "multer";
import bcrypt from "bcrypt";

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
    startChat,
    updateAdStatus
} from "../Controller/userController.js";

import authenticate from "../authMiddleware.js";
import User from "../model/user.js";
import Ad from "../model/userModel.js";

const route = express.Router();

const memoryStorage = multer.memoryStorage();

const uploadMemory = multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
});

// ================= USER AUTH & PROFILE =================

route.post("/register", registerUser);
route.post("/auth/register", registerUser);

route.get("/users/me", authenticate, me);

// 🔥 NEW: Public user profile by UID
route.get("/users/:id", async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.id }).select("-password -notifications -kycDocuments -kycDetails");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user", error: error.message });
    }
});

route.put("/users/me", authenticate, async (req, res) => {
    try {
        const { phoneNumber, password, isPhoneVerified } = req.body;
        const user = await User.findOne({ uid: req.user.uid });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (phoneNumber && phoneNumber !== user.phoneNumber) {
            const exists = await User.findOne({ phoneNumber });
            if (exists) {
                return res.status(400).json({
                    message: "Phone already registered"
                });
            }
            user.phoneNumber = phoneNumber;
        }

        if (isPhoneVerified) {
            user.isPhoneVerified = true;
        }

        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        res.json({
            success: true,
            message: "Profile updated"
        });
    } catch (error) {
        res.status(500).json({
            message: "Update failed",
            error: error.message
        });
    }
});

// 🔥 FIXED: Removed duplicate /ads route, added try-catch
route.get('/ads', async (req, res) => {
    try {
        const { search, category, location } = req.query;
        let query = {};

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        if (category && category !== 'All') {
            query.category = category;
        }

        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }

        const ads = await Ad.find(query).sort({ createdAt: -1 });
        res.json(ads);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch ads", error: error.message });
    }
});

route.patch("/users/me", authenticate, async (req, res) => {
    try {
        const { phoneNumber, isPhoneVerified } = req.body;
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (isPhoneVerified !== undefined) user.isPhoneVerified = isPhoneVerified;

        await user.save();
        res.json({ success: true, message: "Profile patched" });
    } catch (error) {
        res.status(500).json({ message: "Patch failed", error: error.message });
    }
});

route.get("/check-phone", authenticate, async (req, res) => {
    try {
        const { phone } = req.query;
        const exists = await User.findOne({ phoneNumber: phone });
        res.json({ exists: !!exists });
    } catch (error) {
        res.status(500).json({ message: "Error checking phone" });
    }
});

// ================= IDENTITY VERIFICATION =================

route.post(
    "/verify-identity",
    authenticate,
    uploadMemory.fields([
        { name: "idFront", maxCount: 1 },
        { name: "idBack", maxCount: 1 },
        { name: "liveSelfie", maxCount: 1 }
    ]),
    verifyIdentity
);

// ================= NOTIFICATIONS =================

route.get("/notifications", authenticate, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        res.status(200).json({ notifications: user?.notifications || [] });
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

// ================= AI & ADS =================

route.post("/ad/ai-assist", authenticate, uploadMemory.array("images", 10), getAISuggestions);

route.post("/ad", authenticate, uploadMemory.array("images", 10), create);

// 🔥 REMOVED: Duplicate route.get("/ads", getAllAds) — pehla /ads hi handle karega

route.get("/ads/:id", getAdById);

route.get("/myads", authenticate, getMyAds);

route.put("/ads/:id", authenticate, uploadMemory.array("images", 5), updateAd);

route.delete("/ads/:id", authenticate, deleteAd);

// ================= SALES & REVIEWS =================

route.get("/ad/:adId/chat-users", authenticate, getChatUsersForAd);

route.post("/ad/:adId/mark-sold", authenticate, markAsSold);

route.get("/can-review/:adId", authenticate, canReview);

route.post("/reviews", authenticate, createReview);

route.get("/reviews/seller/:sellerId", getSellerReviews);

// ================= REPORT SYSTEM =================

route.post("/reports", authenticate, createReport);

// ================= CHAT SYSTEM =================

route.get("/chat/list", authenticate, getChatList);

route.get("/chat/:chatId", authenticate, getChatMessages);

route.post("/chat/start", authenticate, startChat);

route.post("/chat/:chatId/message", authenticate, sendMessage);

route.delete("/chat/:chatId", authenticate, deleteChat);

route.put("/admin/ads/:id/status", authenticate, updateAdStatus);

export default route;