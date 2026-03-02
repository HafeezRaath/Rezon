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
    verifyIdentity // 👈 Ye line lazmi add karein
} from "../Controller/userController.js"; 

import authenticate from '../authMiddleware.js'; 
import Chat from "../model/chat.js"; 
import User from "../model/user.js";

const route = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

// ========== USER ROUTES ==========
route.post("/register", registerUser); 
route.post("/verify-identity", authenticate, upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'liveSelfie', maxCount: 1 }
]), verifyIdentity);

// ========== ✨ AI & AD ROUTES ==========
// Ye naya route hai AI analysis ke liye
route.post("/ad/ai-assist", authenticate, upload.array("images", 10), getAISuggestions);

route.post("/ad", authenticate, upload.array("images", 10), create);
route.get("/ads", getAllAds); 
route.get("/ads/:id", getAdById);
route.get("/myads", authenticate, getMyAds); 
route.put("/ads/:id", authenticate, upload.array("images", 5), updateAd);
route.delete("/ads/:id", authenticate, deleteAd);

// ========== MARK AS SOLD ROUTES ==========
route.get("/ad/:adId/chat-users", authenticate, getChatUsersForAd);
route.post("/ad/:adId/mark-sold", authenticate, markAsSold);
route.get("/can-review/:adId", authenticate, canReview);

// ========== REVIEW ROUTES ==========
route.post("/reviews", authenticate, createReview);
route.get("/reviews/seller/:sellerId", getSellerReviews);

// ========== REPORT ROUTES ==========
route.post("/reports", authenticate, createReport);

// ========== CHAT ROUTES (KEEP EXISTING) ==========
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

route.get("/chat/list/:userId", authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        const chats = await Chat.find({
            participants: { $in: [userId] },
            deletedBy: { $nin: [userId] } 
        })
        .populate("adId", "title images price")
        .sort({ updatedAt: -1 });

        const inboxData = await Promise.all(chats.map(async (chat) => {
            const otherUserId = chat.participants.find(id => id !== userId);
            const otherUser = await User.findOne({ uid: otherUserId }).select("name");
            return {
                _id: chat._id,
                lastMessage: chat.lastMessage,
                updatedAt: chat.updatedAt,
                otherUserName: otherUser ? otherUser.name : "Unknown User",
                adDetails: chat.adId
            };
        }));
        res.status(200).json(inboxData);
    } catch (error) {
        res.status(500).json({ message: "Inbox fetch nahi ho saka" });
    }
});

route.get("/chat/history/:chatId", authenticate, async (req, res) => {
    try {
        const { chatId } = req.params;
        const chat = await Chat.findById(chatId).populate("adId");
        if (!chat) return res.status(404).json({ message: "Chat nahi mili!" });
        
        const participantsDetails = await User.find({ 
            uid: { $in: chat.participants } 
        }).select("name email uid isOnline lastSeen");
        
        res.status(200).json({ chat: chat, users: participantsDetails });
    } catch (error) {
        res.status(500).json({ message: "Messages load nahi huay" });
    }
});

route.delete("/chat/:chatId", authenticate, async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.uid; 
        const chat = await Chat.findByIdAndUpdate(
            chatId,
            { $addToSet: { deletedBy: userId } },
            { new: true }
        );
        if (!chat) return res.status(404).json({ message: "Chat nahi mili!" });
        res.status(200).json({ message: "Chat hidden" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

export default route;