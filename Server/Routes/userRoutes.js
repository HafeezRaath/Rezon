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

// Multer Setup - Memory storage use ho rahi hai taake live server par storage issue na ho
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ========== USER & AUTH ROUTES ==========
route.post("/register", registerUser); 

// Current User data for verification status
route.get("/users/me", authenticate, me);

// Identity Verification Route (Front, Back, Selfie)
route.post("/verify-identity", authenticate, upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'liveSelfie', maxCount: 1 }
]), verifyIdentity);

// Notifications Route (Handled inside to avoid 404)
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

// ========== CHAT SYSTEM ROUTES ==========
route.post("/chat/start", authenticate, async (req, res) => {
    try {
        const { buyerId, sellerId, adId } = req.body;
        // Check if chat already exists
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

export default route;