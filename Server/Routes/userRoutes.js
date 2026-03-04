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
    me // 👈 Ye import controller mein add karne ke baad yahan shamil karein
} from "../Controller/userController.js"; 

import authenticate from '../authMiddleware.js'; 
import Chat from "../model/chat.js"; 
import User from "../model/user.js";

const route = express.Router();

// Multer Setup
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 👈 10MB kar dein
});

// ========== USER & AUTH ROUTES ==========
route.post("/register", registerUser); 

// ✅ Naya Route: Current User ka data (isVerified status ke liye)
route.get("/users/me", authenticate, me);

// ✅ Verification Route
route.post("/verify-identity", authenticate, upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'liveSelfie', maxCount: 1 }
]), verifyIdentity);

// ✅ Notifications Route (Dummy implementation to avoid 404)
route.get("/notifications", authenticate, async (req, res) => {
    try {
        res.status(200).json({ notifications: [] }); 
    } catch (error) {
        res.status(500).json({ message: "Notifications fetch nahi ho saki" });
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

// ========== CHAT SYSTEM ROUTES (Existing) ==========
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

// ... Baki saare chat routes jo aapne diye thay woh yahan continue honge ...

export default route;