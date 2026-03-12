import Ad from "../model/userModel.js";
import User from "../model/user.js";
import Review from "../model/Review.js";
import Report from "../model/Report.js";
import Chat from "../model/chat.js";
import crypto from 'crypto'; // ✅ Built-in, 0% Crash Rate
import sharp from 'sharp';
//import { decode } from 'jpeg-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from "mongoose";
import OpenAI from "openai";
import { v2 as cloudinary } from 'cloudinary'; // ✅ Cloudinary import
import streamifier from 'streamifier';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});// ✅ Buffer upload ke liye

dotenv.config();
// userController.js mein isay update karein:
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔧 FIX 1: BASE_URL added for production
const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://rezon.up.railway.app' 
    : 'http://localhost:8000';

// ✅ Cloudinary Buffer Upload Helper (KYC ke liye)
const uploadBufferToCloudinary = (buffer, folder, filename) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { 
                folder: folder,
                public_id: filename,
                resource_type: 'image'
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
};

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

        // ✅ Cloudinary ya Buffer se image fetch logic
        const imagesContent = await Promise.all(
            req.files.map(async (file) => {
                let base64Data;
                if (file.buffer) {
                    base64Data = file.buffer.toString('base64');
                } else {
                    const response = await fetch(file.path);
                    const arrayBuffer = await response.arrayBuffer();
                    base64Data = Buffer.from(arrayBuffer).toString('base64');
                }
                
                return {
                    type: "image_url",
                    image_url: { url: `data:image/jpeg;base64,${base64Data}` }
                };
            })
        );

        // ✅ Updated Prompt with Stock/Fake Detection
        const promptText = `
Strictly analyze the text and hardware in ALL provided images for the "${category}" category.

1. **OCR Focus**: Read the 'Battery Health' screenshot carefully. Extract Max Capacity, Cycle Count, and First Use Date.
2. **Hardware Check**: Identify the port (e.g., USB-C vs Lightning).
3. **Price Suggestion**: Suggest a realistic market price for Pakistan.
4. **Authenticity Audit (NEW)**: 
   - Detect if the image is an 'Original' photo taken by a person or a 'Stock' photo from the internet.
   - Look for watermarks of other sites (OLX, etc.) or studio backgrounds.
   - Assign an "imageQuality" value: "Original", "Stock", or "Suspicious".

**IMPORTANT LANGUAGE RULE**:
Write the "aiDescription" field in **Roman Urdu**.

Return ONLY a JSON object:
{
  "product": "string",
  "condition": "string",
  "aiDescription": "string (in Roman Urdu)",
  "estimatedPrice": number,
  "imageQuality": "string",
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

        // Similar Ads check for pricing
        const similarAds = await Ad.find({
            category: category,
            title: { $regex: aiData.product.split(' ')[0], $options: 'i' },
            status: 'Sold',
            isDeleted: false
        }).limit(3);

        let finalPrice = aiData.estimatedPrice;
        // Image Quality ko info mein shamil kar rahe hain taake user ko pata chale
        let dataSource = `AI Audit: ${aiData.imageQuality}`;

        if (similarAds.length > 0) {
            finalPrice = similarAds.reduce((acc, ad) => acc + ad.price, 0) / similarAds.length;
            dataSource += ` | Based on ${similarAds.length} sold items on Rezon`;
        }

        res.status(200).json({
            success: true,
            data: {
                title: aiData.product,
                condition: aiData.condition,
                description: aiData.aiDescription,
                suggestedPrice: Math.round(finalPrice),
                imageQuality: aiData.imageQuality, // ✅ New Field
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
// 🛡️ CREATE AD (Final Stable Hashing)
// ==========================================
// Controller mein create function ko aise update karein:
export const create = async (req, res) => {
    try {
        const posted_by_uid = req.user.uid;
        if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Images required" });

        // ✅ 1.req.body se missing fields nikalien
        const { price, title, description, category, condition, location, imageQualityByAI } = req.body;

        // 🛡️ AI QUALITY GUARD
        if (imageQualityByAI === "Stock") {
            return res.status(400).json({ message: "🛡️ Rezon Security: Internet photos not allowed." });
        }

        // 🛡️ DUPLICATE SHIELD (MD5 Hashing)
        const currentHashes = [];
        for (const file of req.files) {
            const hash = crypto.createHash('md5').update(file.buffer).digest('hex');
            currentHashes.push(hash);
        }

        const duplicate = await Ad.findOne({ imageHashes: { $in: currentHashes }, isDeleted: false });
        if (duplicate) {
            return res.status(400).json({ message: "🛡️ Rezon Shield: Ye image pehle hi use ho chuki hai." });
        }

        // 🛡️ CLOUDINARY UPLOAD
        const imageUrls = await Promise.all(
            req.files.map(file => uploadBufferToCloudinary(file.buffer, 'rezon_products'))
        );

        // ✅ 2. new Ad mein sari required fields pass karein
        const newAd = new Ad({
            images: imageUrls, 
            imageHashes: currentHashes,
            title, 
            description,   // 👈 Ab error nahi aayega
            location,      // 👈 Ab error nahi aayega
            condition,     // 👈 Ab error nahi aayega
            price: Number(price), 
            category, 
            posted_by_uid,
            status: 'Active',
            aiAuditStatus: imageQualityByAI,
            details: req.body.details || {} // Mixed type ke liye empty object
        });

        await newAd.save();
        res.status(201).json({ success: true, message: "Ad Posted successfully!" });

    } catch (error) {
        console.error("🔥 Server Error:", error.message);
        res.status(500).json({ message: "Post failed", error: error.message });
    }
};

// ==========================================
// GET ALL ADS
// ==========================================
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

// ==========================================
// GET AD BY ID
// ==========================================
export const getAdById = async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id);
        if (!ad) return res.status(404).json({ message: "Ad not found" });
        res.status(200).json(ad);
    } catch (error) {
        res.status(500).json({ errorMessage: error.message });
    }
};

// ==========================================
// GET MY ADS
// ==========================================
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

// ==========================================
// UPDATE AD (FIXED FOR CLOUDINARY)
// ==========================================
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

        // ✅ FIXED: Cloudinary URLs direct use karo
        if (req.files && req.files.length > 0) {
            const newImageUrls = req.files.map(file => file.path); // Already Cloudinary URLs
            updateData.images = [...(currentAd.images || []), ...newImageUrls];
        }

        const updatedAd = await Ad.findByIdAndUpdate(adId, updateData, { new: true });
        res.status(200).json({ message: "Ad Updated Successfully", data: updatedAd });
    } catch (error) {
        res.status(500).json({ errorMessage: error.message });
    }
};

// ==========================================
// DELETE AD
// ==========================================
export const deleteAd = async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id);
        if (!ad) return res.status(404).json({ message: "Ad not found" });
        if (ad.posted_by_uid !== req.user.uid) return res.status(403).json({ message: "Ownership Mismatch" });

        // ✅ OPTIONAL: Cloudinary se bhi images delete karo
        if (ad.images && ad.images.length > 0) {
            for (const imageUrl of ad.images) {
                try {
                    // Public ID extract karo URL se
                    const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.log("Cloudinary delete error:", err);
                }
            }
        }

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
// 🛡️ LOCAL IDENTITY VERIFICATION (KYC) - FIXED FOR CLOUDINARY
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

        // ✅ FIXED: Direct Cloudinary upload using buffer
        const timestamp = Date.now();
        
        // Upload all three to Cloudinary
        const [idFrontUrl, idBackUrl, selfieUrl] = await Promise.all([
            uploadBufferToCloudinary(
                req.files.idFront[0].buffer, 
                'rezon_kyc', 
                `idFront-${userUid}-${timestamp}`
            ),
            uploadBufferToCloudinary(
                req.files.idBack[0].buffer, 
                'rezon_kyc', 
                `idBack-${userUid}-${timestamp}`
            ),
            uploadBufferToCloudinary(
                req.files.liveSelfie[0].buffer, 
                'rezon_kyc', 
                `selfie-${userUid}-${timestamp}`
            )
        ]);

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
// 👤 GET CURRENT USER DETAILS
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

// ==========================================
// UPDATE AD STATUS (ADMIN)
// ==========================================
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
export const getChatList = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (req.user.uid !== userId) {
            return res.status(403).json({ message: "Access denied. Apni hi chats dekh sakte hain." });
        }

        const chats = await Chat.find({
            participants: { $in: [userId] },
            deletedBy: { $nin: [userId] }
        })
        .populate({
            path: 'adId',
            select: 'title images price'
        })
        .sort({ updatedAt: -1 });

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

export const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { text } = req.body; // Frontend se 'text' aa raha hai
        const senderId = req.user.uid;

        if (!text) return res.status(400).json({ message: "Text is required" });

        const newMessage = {
            senderId,
            message: text, // Model mein field ka naam 'message' rakhein taake frontend se match ho
            timestamp: new Date()
        };

        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { 
                $push: { messages: newMessage },
                $set: { lastMessage: text, updatedAt: new Date() } // lastMessage ko update lazmi karein
            },
            { new: true }
        );

        res.status(200).json({ success: true, data: newMessage });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

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

export const startChat = async (req, res) => {
    try {
        const { buyerId, sellerId, adId } = req.body;

        if (!buyerId || !sellerId || !adId) {
            return res.status(400).json({ message: "Buyer, Seller aur Ad ID lazmi hain" });
        }

        let chat = await Chat.findOne({
            adId: adId,
            participants: { $all: [buyerId, sellerId] }
        });

        if (chat) {
            chat.deletedBy = chat.deletedBy.filter(id => id !== buyerId && id !== sellerId);
            await chat.save();
            
            return res.status(200).json({ 
                success: true,
                chatId: chat._id,
                message: "Existing chat restore ho gayi" 
            });
        }

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