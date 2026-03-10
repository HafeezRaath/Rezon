import Ad from "../model/userModel.js";
import User from "../model/user.js";
import Review from "../model/Review.js";
import Report from "../model/Report.js";
import Chat from "../model/chat.js";
import imghash from 'imghash';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from "mongoose";
import OpenAI from "openai";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔧 FIX 1: BASE_URL added for production
const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://rezon.up.railway.app' 
    : 'http://localhost:8000';

const CATEGORY_FIELD_MAP = {
    "Mobile": ['brand', 'model', 'warranty', 'warrantyDuration', 'storage', 'ram', 'batteryHealth', 'ptaStatus', 'accessories'],
    "Car": ['make', 'carModel', 'year', 'mileage', 'fuelType', 'transmission', 'registrationCity'],
    "Furniture": ['material', 'dimensions', 'age'],
    "PropertySale": ['propertyType', 'areaSize', 'bedrooms'],
    "PropertyRent": ['propertyType', 'areaSize', 'rentDuration'],
    "Electronics": ['type', 'make', 'model', 'condition'],
    "Bikes": ['make', 'engineCC', 'year', 'mileage'],
    "Business": ['businessType', 'investmentRequired'],
    "Services": ['serviceType', 'serviceArea'],
    "Jobs": ['jobTitle', 'salaryRange', 'jobType'],
    "Animals": ['animalType', 'breed', 'age'],
    "Fashion": ['itemType', 'size', 'material'],
    "Books": ['author', 'genre', 'edition'],
    "Kids": ['toyType', 'ageGroup'],
};

const ALLOWED_CATEGORIES = Object.keys(CATEGORY_FIELD_MAP);

// ==========================================
// ✨ AI SMART ASSIST (Analyze & Suggest Price)
// ==========================================
export const getAISuggestions = async (req, res) => {
    try {
        const { category } = req.body; 
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "Kam se kam ek image upload karein" });
        }

        const imagesContent = req.files.map(file => ({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${file.buffer.toString('base64')}` }
        }));

        const promptText = `
Strictly analyze the text and hardware in ALL provided images for the "${category}" category.

1. **OCR Focus**: Read the 'Battery Health' screenshot carefully. Extract Max Capacity, Cycle Count, and First Use Date.
2. **Hardware Check**: Identify the port. (Flat USB-C = iPhone 15 series).
3. **Price Suggestion**: Suggest a realistic market price for Pakistan.
4. **Animals Category**: Identify breed and traits if applicable.

**IMPORTANT LANGUAGE RULE**:
Write the "aiDescription" field in **Roman Urdu** (e.g., "Ye phone bohot achi condition mein hai, battery health zabardast hai..."). The tone should be helpful and attractive for buyers.

Return ONLY a JSON object:
{
  "product": "string",
  "condition": "string",
  "aiDescription": "string (in Roman Urdu)",
  "estimatedPrice": number,
  "extractedDetails": { "field_name": "value" }
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: promptText },
                        ...imagesContent
                    ],
                },
            ],
            response_format: { type: "json_object" },
        });

        const aiData = JSON.parse(response.choices[0].message.content);

        const similarAds = await Ad.find({
            category: category,
            title: { $regex: aiData.product.split(' ')[0], $options: 'i' },
            status: 'Sold',
            isDeleted: false
        }).limit(3);

        let finalPrice = aiData.estimatedPrice;
        let dataSource = "AI Market Estimate (Pakistan)";

        if (similarAds.length > 0) {
            finalPrice = similarAds.reduce((acc, ad) => acc + ad.price, 0) / similarAds.length;
            dataSource = `Based on ${similarAds.length} similar sold items on Rezon`;
        }

        res.status(200).json({
            success: true,
            data: {
                title: aiData.product,
                condition: aiData.condition,
                description: aiData.aiDescription,
                suggestedPrice: Math.round(finalPrice),
                details: aiData.extractedDetails,
                info: dataSource
            }
        });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ message: "AI process failed", error: error.message });
    }
};

// ==========================================
// USER REGISTRATION
// ==========================================
export const registerUser = async (req, res) => {
    try {
        const { uid, name, email } = req.body;
        let user = await User.findOne({ uid });

        if (user) {
            user.name = name;
            user.email = email;
            await user.save();
            return res.status(200).json({ message: "User profile updated", user });
        }

        user = new User({ uid, name, email });
        await user.save();
        res.status(201).json({ message: "User registered successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Registration failed", error: error.message });
    }
};


// ==========================================
// 🛡️ PRICE GUARD: Check against AI Suggestion (FIXED - Function ke andar moved)
// ==========================================

// Yeh function create ke andar hona chahiye, file level pe nahi
// Isliye is code ko create function mein move karo

export const create = async (req, res) => {
    try {
        const posted_by_uid = req.user.uid;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "At least one image is required" });
        }

        // ==========================================
        // 🛡️ PRICE GUARD: Check against AI Suggestion (YAHAN MOVE KIYA)
        // ==========================================
        const { price, suggestedPriceByAI, title, description, location, condition, category } = req.body;
        const aiSuggested = Number(suggestedPriceByAI);

        if (aiSuggested && aiSuggested > 0) {
            const minAllowed = aiSuggested * 0.75; // 25% lower
            const maxAllowed = aiSuggested * 1.25; // 25% higher
            const userPrice = Number(price);

            if (userPrice < minAllowed || userPrice > maxAllowed) {
                return res.status(400).json({
                    success: false,
                    message: `🛡️ Rezon Price Guard: Aapki price market rate (Rs. ${aiSuggested}) se bohot door hai. Aap Rs. ${Math.round(minAllowed)} se Rs. ${Math.round(maxAllowed)} ke darmiyan price laga sakte hain.`
                });
            }
        }

        // ==========================================
        // 🛡️ DUPLICATE SHIELD (Hashing & AI Check)
        // ==========================================
        const currentHashes = [];
        for (const file of req.files) {
            const hash = await imghash.hash(file.buffer);
            currentHashes.push(hash);
        }

        const internalDuplicate = await Ad.findOne({
            imageHashes: { $in: currentHashes },
            isDeleted: false
        });

        if (internalDuplicate) {
            return res.status(400).json({
                message: "🛡️ Rezon Shield: In mein se kuch images already platform par hain."
            });
        }

        // ==========================================
        // ☁️ CLOUDINARY URLS (Data Storage)
        // ==========================================
        const imageUrls = req.files.map(file => file.path);

        const categoryDetails = {};
        const currentDetailKeys = CATEGORY_FIELD_MAP[category] || [];
        for (const key of currentDetailKeys) {
            if (req.body[key] !== undefined) categoryDetails[key] = req.body[key];
        }

        const newAd = new Ad({
            images: imageUrls,
            imageHashes: currentHashes,
            title, description, price: Number(price), location, condition, category,
            details: categoryDetails,
            posted_by_uid,
            status: 'Active'
        });

        await newAd.save();
        res.status(201).json({ success: true, message: "Ad Posted successfully on Rezon!" });

    } catch (error) {
        console.error("🔥 Rezon Create Error:", error);
        res.status(500).json({ message: "Posting failed", error: error.message });
    }
};

export const getAllAds = async (req, res) => {
    try {
        const { city } = req.query;
        let query = {
            status: { $ne: 'Sold' },
            isDeleted: { $ne: true }
        };

        if (city && city !== "null" && city !== "" && city !== "All" && city !== "Pakistan") {
            query.location = { $regex: city, $options: 'i' };
        }

        let adData = await Ad.find(query).sort({ createdAt: -1 });
        res.status(200).json(adData);
    } catch (error) {
        res.status(500).json({ errorMessage: error.message });
    }
};

export const getAdById = async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id);
        if (!ad) return res.status(404).json({ message: "Ad not found" });
        res.status(200).json(ad);
    } catch (error) {
        res.status(500).json({ errorMessage: error.message });
    }
};

export const getMyAds = async (req, res) => {
    try {
        const userUid = req.user.uid;
        const userAds = await Ad.find({
            posted_by_uid: userUid,
            isDeleted: { $ne: true }
        }).sort({ createdAt: -1 });
        res.status(200).json(userAds);
    } catch (error) {
        res.status(500).json({ message: "Error fetching ads." });
    }
};

export const updateAd = async (req, res) => {
    try {
        const adId = req.params.id;
        const userUid = req.user.uid;
        const updateData = { ...req.body };
        const currentAd = await Ad.findById(adId);

        if (!currentAd) return res.status(404).json({ message: "Ad not found" });
        if (currentAd.posted_by_uid !== userUid) return res.status(403).json({ message: "Ownership Mismatch" });

        if (currentAd.status === 'Sold') {
            return res.status(400).json({ message: "Sold items cannot be edited" });
        }

        if (req.files && req.files.length > 0) {
            const newImageUrls = [];
            for (const file of req.files) {
                const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname) || '.jpg'}`;
                fs.writeFileSync(path.join('uploads/', fileName), file.buffer);
                // 🔧 FIX 2: Use BASE_URL
                newImageUrls.push(`${BASE_URL}/uploads/${fileName}`);
            }
            updateData.images = [...(currentAd.images || []), ...newImageUrls];
        }

        const updatedAd = await Ad.findByIdAndUpdate(adId, updateData, { new: true });
        res.status(200).json({ message: "Ad Updated Successfully", data: updatedAd });
    } catch (error) {
        res.status(500).json({ errorMessage: error.message });
    }
};

export const deleteAd = async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id);
        if (!ad) return res.status(404).json({ message: "Ad not found" });
        if (ad.posted_by_uid !== req.user.uid) return res.status(403).json({ message: "Ownership Mismatch" });

        await Ad.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Ad Deleted Successfully" });
    } catch (error) {
        res.status(500).json({ errorMessage: error.message });
    }
};
// ==========================================
// MARK AS SOLD CONTROLLERS
// ==========================================

export const getChatUsersForAd = async (req, res) => {
    try {
        const { adId } = req.params;
        const sellerUid = req.user.uid;

        const chats = await Chat.find({
            adId: adId,
            participants: { $in: [sellerUid] }
        });

        if (!chats.length) {
            return res.status(404).json({ message: "Is ad pe koi chat nahi hai" });
        }

        const buyerUids = [...new Set(
            chats.flatMap(chat =>
                chat.participants.filter(uid => uid !== sellerUid)
            )
        )];

        const buyers = await User.find({
            uid: { $in: buyerUids }
        }).select("name uid profilePic rating");

        res.status(200).json(buyers);

    } catch (error) {
        console.error("Get Chat Users Error:", error);
        res.status(500).json({ message: "Users load nahi huay", error: error.message });
    }
};

export const markAsSold = async (req, res) => {
    try {
        const { adId } = req.params;
        const { buyerUid } = req.body;
        const sellerUid = req.user.uid;

        if (!buyerUid) {
            return res.status(400).json({ message: "Buyer select karna zaroori hai" });
        }

        const ad = await Ad.findById(adId);
        if (!ad) {
            return res.status(404).json({ message: "Ad nahi mili" });
        }

        if (ad.posted_by_uid !== sellerUid) {
            return res.status(403).json({ message: "Sirf owner mark kar sakta hai" });
        }

        if (ad.status === 'Sold') {
            return res.status(400).json({ message: "Yeh item already sold hai" });
        }

        const buyer = await User.findOne({ uid: buyerUid });
        if (!buyer) {
            return res.status(404).json({ message: "Buyer nahi mila database mein" });
        }

        // 30 days baad auto-delete
        const deleteDate = new Date();
        deleteDate.setDate(deleteDate.getDate() + 30);

        ad.status = 'Sold';
        ad.soldTo = buyer._id;
        ad.soldAt = new Date();
        ad.isDeleted = true;
        ad.deleteAfter = deleteDate;

        await ad.save();

        res.status(200).json({
            message: "🎉 Item successfully sold! Review possible for 30 days.",
            soldTo: buyer.name,
            soldAt: ad.soldAt,
            autoDeleteOn: deleteDate
        });

    } catch (error) {
        console.error("Mark Sold Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const canReview = async (req, res) => {
    try {
        const { adId } = req.params;
        const buyerUid = req.user.uid;

        const buyer = await User.findOne({ uid: buyerUid });
        if (!buyer) {
            return res.status(404).json({ message: "User nahi mila" });
        }

        const ad = await Ad.findOne({
            _id: adId,
            status: 'Sold',
            soldTo: buyer._id
        });

        if (!ad) {
            return res.status(403).json({
                canReview: false,
                message: "Sirf actual buyer hi review de sakta hai"
            });
        }

        const existingReview = await Review.findOne({
            buyerId: buyer._id,
            adId: adId
        });

        res.status(200).json({
            canReview: !existingReview,
            alreadyReviewed: !!existingReview,
            message: existingReview ? "Already reviewed" : "Eligible for review"
        });

    } catch (error) {
        res.status(500).json({ message: "Error checking eligibility" });
    }
};

// ==========================================
// REVIEWS & RATINGS CONTROLLERS
// ==========================================

export const createReview = async (req, res) => {
    try {
        const { sellerId, adId, rating, comment } = req.body;
        const buyerUid = req.user.uid;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Valid rating (1-5) zaroori hai" });
        }

        if (!adId || !mongoose.Types.ObjectId.isValid(adId)) {
            return res.status(400).json({ message: "Valid Ad ID chahiye" });
        }

        const buyer = await User.findOne({ uid: buyerUid });
        const seller = await User.findOne({ uid: sellerId });

        if (!buyer || !seller) {
            return res.status(404).json({ message: "User nahi mila." });
        }

        const ad = await Ad.findOne({
            _id: adId,
            status: 'Sold',
            soldTo: buyer._id
        });

        if (!ad) {
            return res.status(403).json({
                message: "❌ Aap is item ko review nahi kar sakte. Sirf actual buyer review de sakta hai."
            });
        }

        const existingReview = await Review.findOne({
            buyerId: buyer._id,
            adId: adId
        });

        if (existingReview) {
            return res.status(400).json({ message: "⚠️ Aap already review de chuke ho is item ko" });
        }

        const newReview = new Review({
            buyerId: buyer._id,
            sellerId: seller._id,
            adId,
            rating,
            comment
        });
        await newReview.save();

        const allReviews = await Review.find({ sellerId: seller._id });
        const avgRating = allReviews.reduce((acc, item) => acc + item.rating, 0) / allReviews.length;
        await User.findByIdAndUpdate(seller._id, {
            rating: avgRating.toFixed(1),
            totalReviews: allReviews.length
        });

        res.status(201).json({ message: "✅ Review saved!", review: newReview });

    } catch (error) {
        console.error("Review Error:", error.message);
        res.status(500).json({ message: "Review save nahi ho saka." });
    }
};

export const getSellerReviews = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const seller = await User.findOne({ uid: sellerId }).select("name profilePic rating totalReviews");
        if (!seller) return res.status(404).json({ message: "Seller not found" });

        const reviews = await Review.find({ sellerId: seller._id })
            .populate("buyerId", "name profilePic")
            .populate("adId", "title images")
            .sort({ createdAt: -1 });

        res.status(200).json({
            seller: seller,
            reviews: reviews
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to load reviews" });
    }
};

// ==========================================
// REPORT CONTROLLERS
// ==========================================

export const createReport = async (req, res) => {
    try {
        const { reportedUserId, adId, reason, description } = req.body;
        const reporterUid = req.user.uid;

        if (!reportedUserId || !adId || !reason || !description) {
            return res.status(400).json({ message: "Sari fields lazmi hain" });
        }

        const reporterUser = await User.findOne({ uid: reporterUid });
        const targetUser = await User.findOne({ uid: reportedUserId });

        if (!reporterUser) {
            return res.status(404).json({ message: "Aapka account database mein nahi mila." });
        }
        if (!targetUser) {
            return res.status(404).json({ message: "Jis user ko report kar rahe hain wo nahi mila." });
        }

        const newReport = new Report({
            reporterId: reporterUser._id,
            reportedUserId: targetUser._id,
            adId: adId,
            reason: reason,
            description: description
        });

        await newReport.save();
        res.status(201).json({ message: "Report Admin ko bhej di gayi hai." });

    } catch (error) {
        console.error("Report Error:", error.message);
        res.status(500).json({ message: "Report fail ho gayi" });
    }
};

// ==========================================
// 🛡️ LOCAL IDENTITY VERIFICATION (KYC)
// ==========================================
export const verifyIdentity = async (req, res) => {
    try {
        const userUid = req.user.uid;

        const existingUser = await User.findOne({ uid: userUid });
        if (existingUser?.isVerified) {
            return res.status(400).json({ message: "Aapka account pehle se verified hai! ✅" });
        }

        if (!req.files || !req.files.idFront || !req.files.idBack || !req.files.liveSelfie) {
            return res.status(400).json({ 
                message: "ID Front, ID Back aur Live Selfie teeno upload karna lazmi hain. 📸" 
            });
        }

        // 🚫 AI COMPLETELY DISABLED - No face matching, no ID comparison
        // Sirf files save karna, koi verification nahi
        
        const uploadDir = 'uploads/verification/';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        
        // ID Front save
        const idFrontName = `idFront-${userUid}-${Date.now()}.jpg`;
        const idFrontPath = path.join(uploadDir, idFrontName);
        fs.writeFileSync(idFrontPath, req.files.idFront[0].buffer);
        
        // ID Back save  
        const idBackName = `idBack-${userUid}-${Date.now()}.jpg`;
        const idBackPath = path.join(uploadDir, idBackName);
        fs.writeFileSync(idBackPath, req.files.idBack[0].buffer);
        
        // Selfie save
        const selfieName = `selfie-${userUid}-${Date.now()}.jpg`;
        const selfiePath = path.join(uploadDir, selfieName);
        fs.writeFileSync(selfiePath, req.files.liveSelfie[0].buffer);

        // URLs generate karna
        const idFrontUrl = `${BASE_URL}/uploads/verification/${idFrontName}`;
        const idBackUrl = `${BASE_URL}/uploads/verification/${idBackName}`;
        const selfieUrl = `${BASE_URL}/uploads/verification/${selfieName}`;

        // Direct verification - No AI check
        await User.findOneAndUpdate(
            { uid: userUid },
            { 
                profilePic: selfieUrl,
                isVerified: true,
                verificationStatus: 'Verified',
                verifiedAt: new Date(),
                kycDocuments: {
                    idFront: idFrontUrl,
                    idBack: idBackUrl,
                    selfie: selfieUrl
                },
                kycDetails: {
                    method: "Manual verification",
                    aiCheck: false,
                    faceMatch: null,
                    idOcr: null,
                    verifiedBy: "system_auto"
                }
            }
        );

        return res.status(200).json({ 
            success: true, 
            message: "Mubarak ho! Aapki pehchan verify ho gayi hai. 🎉", 
            profileUrl: selfieUrl 
        });

    } catch (error) {
        console.error("🔥 Rezon KYC Error:", error);
        res.status(500).json({ message: "Server error during verification", error: error.message });
    }
};

// ==========================================
// 👤 GET CURRENT USER DETAILS (For Navbar/Profile)
// ==========================================
export const me = async (req, res) => {
    try {
        const userUid = req.user.uid;
        const user = await User.findOne({ uid: userUid });

        if (!user) {
            return res.status(404).json({ message: "User database mein nahi mila" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("🔥 Me API Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// 🔧 FIX 3: ADDED - Update Ad Status for Admin
export const updateAdStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['Active', 'Reserved', 'Sold', 'Hidden'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        
        const ad = await Ad.findByIdAndUpdate(id, { status }, { new: true });
        if (!ad) return res.status(404).json({ message: "Ad not found" });
        
        res.status(200).json({ message: "Status updated successfully", ad });
    } catch (error) {
        console.error("Update Status Error:", error);
        res.status(500).json({ message: "Error updating status", error: error.message });
    }
};
// ==========================================
// 💬 CHAT SYSTEM CONTROLLERS
// ==========================================

// Get all conversations for a user (Inbox)
export const getChatList = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Security check: user sirf apni hi list dekh sakta
        if (req.user.uid !== userId) {
            return res.status(403).json({ message: "Access denied. Apni hi chats dekh sakte hain." });
        }

        const chats = await Chat.find({
            participants: { $in: [userId] },
            deletedBy: { $nin: [userId] }  // Jo user ne delete ki hain wo na dikhain
        })
        .populate({
            path: 'adId',
            select: 'title images price'
        })
        .sort({ updatedAt: -1 });

        // Har chat ke liye other user ka data nikalo
        const formattedChats = await Promise.all(
            chats.map(async (chat) => {
                const otherUserId = chat.participants.find(p => p !== userId);
                const otherUser = await User.findOne({ uid: otherUserId }).select('name profilePic');
                
                return {
                    _id: chat._id,
                    otherUserName: otherUser?.name || "Unknown User",
                    otherUserPic: otherUser?.profilePic || "/default-avatar.png",
                    adDetails: {
                        title: chat.adId?.title || "Product",
                        images: chat.adId?.images || [],
                        price: chat.adId?.price
                    },
                    lastMessage: chat.lastMessage || "Click to view messages...",
                    updatedAt: chat.updatedAt
                };
            })
        );

        res.status(200).json(formattedChats);
    } catch (error) {
        console.error("🔥 Get Chat List Error:", error);
        res.status(500).json({ message: "Conversations load nahi ho sakin", error: error.message });
    }
};

// Get single chat messages
export const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.uid;

        const chat = await Chat.findById(chatId).populate('adId', 'title images price posted_by_uid');
        if (!chat) {
            return res.status(404).json({ message: "Chat nahi mili" });
        }

        if (!chat.participants.includes(userId)) {
            return res.status(403).json({ message: "Access denied. Aap is chat mein nahi hain." });
        }

        // Mark messages as read jo user ne receive kiye hain
        let unreadCount = 0;
        chat.messages.forEach(msg => {
            if (msg.senderId !== userId && !msg.read) {
                msg.read = true;
                unreadCount++;
            }
        });
        
        if (unreadCount > 0) {
            await chat.save();
        }

        // Other user ka data bhejo
        const otherUserId = chat.participants.find(p => p !== userId);
        const otherUser = await User.findOne({ uid: otherUserId }).select('name profilePic uid');

        res.status(200).json({
            chatId: chat._id,
            adDetails: chat.adId,
            otherUser: otherUser || { name: "Unknown", profilePic: "/default-avatar.png" },
            messages: chat.messages,
            participants: chat.participants
        });
    } catch (error) {
        console.error("🔥 Get Chat Messages Error:", error);
        res.status(500).json({ message: "Messages load nahi ho sake", error: error.message });
    }
};

// Send message in chat
export const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { text } = req.body;
        const senderId = req.user.uid;

        if (!text || text.trim() === "") {
            return res.status(400).json({ message: "Message text khali nahi ho sakta" });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat nahi mili" });
        }

        if (!chat.participants.includes(senderId)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const newMessage = {
            senderId,
            text: text.trim(),
            timestamp: new Date(),
            read: false
        };

        chat.messages.push(newMessage);
        chat.lastMessage = text.trim();
        chat.updatedAt = new Date();
        
        // Agar dono ne delete ki thi toh wapas lao
        chat.deletedBy = [];
        
        await chat.save();

        // Notification bhejo receiver ko (async, wait nahi karein)
        const receiverId = chat.participants.find(p => p !== senderId);
        if (receiverId) {
            await User.findOneAndUpdate(
                { uid: receiverId },
                {
                    $push: {
                        notifications: {
                            type: 'message',
                            title: 'New Message',
                            message: `Aapko naya message mila hai`,
                            chatId: chat._id,
                            read: false,
                            createdAt: new Date()
                        }
                    }
                }
            );
        }

        res.status(200).json({ 
            success: true,
            message: "Message bhej diya gaya", 
            data: newMessage 
        });
    } catch (error) {
        console.error("🔥 Send Message Error:", error);
        res.status(500).json({ message: "Message bhejne mein masla hua", error: error.message });
    }
};

// Soft delete chat (sirf user ke liye hide ho)
export const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.uid;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat nahi mili" });
        }

        if (!chat.participants.includes(userId)) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Soft delete - add to deletedBy array
        if (!chat.deletedBy.includes(userId)) {
            chat.deletedBy.push(userId);
            await chat.save();
        }

        res.status(200).json({ 
            success: true,
            message: "Conversation delete ho gayi" 
        });
    } catch (error) {
        console.error("🔥 Delete Chat Error:", error);
        res.status(500).json({ message: "Delete nahi ho saka", error: error.message });
    }
};

// Start new chat (already tha, bas controller mein move kar diya)
export const startChat = async (req, res) => {
    try {
        const { buyerId, sellerId, adId } = req.body;

        // Validation
        if (!buyerId || !sellerId || !adId) {
            return res.status(400).json({ message: "Buyer, Seller aur Ad ID lazmi hain" });
        }

        // Check if already exists
        let chat = await Chat.findOne({
            adId: adId,
            participants: { $all: [buyerId, sellerId] }
        });

        if (chat) {
            // Agar pehle delete ki thi toh restore karo
            chat.deletedBy = chat.deletedBy.filter(id => id !== buyerId && id !== sellerId);
            await chat.save();
            
            return res.status(200).json({ 
                success: true,
                chatId: chat._id,
                message: "Existing chat restore ho gayi" 
            });
        }

        // New chat create karo
        chat = new Chat({
            participants: [buyerId, sellerId],
            adId: adId,
            messages: [],
            lastMessage: "",
            deletedBy: [] 
        });
        
        await chat.save();

        res.status(201).json({ 
            success: true,
            chatId: chat._id,
            message: "Nayi chat shuru ho gayi" 
        });
    } catch (error) {
        console.error("🔥 Start Chat Error:", error);
        res.status(500).json({ message: "Chat start nahi ho saki", error: error.message });
    }
};
