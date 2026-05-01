import dotenv from 'dotenv';
dotenv.config(); // ← 🔥 SABSE PEHLE!

import Ad from "../model/userModel.js";
import User from "../model/user.js";
import Review from "../model/Review.js";
import Report from "../model/Report.js";
import Chat from "../model/chat.js";
import crypto from 'crypto';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import mongoose from "mongoose";
import OpenAI from "openai";
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// ✅ Ab env variables load ho chuke hain
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://rezon.up.railway.app' 
    : 'http://localhost:8000';

// ✅ Cloudinary Buffer Upload Helper
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
// ✨ AI SMART ASSIST
// ==========================================
export const getAISuggestions = async (req, res) => {
    try {
        const { category } = req.body; 
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "Kam se kam ek image upload karein" });
        }

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

        const promptText = `
Strictly analyze the provided images for the "${category}" category.

1. **OCR Focus**: Read any 'Battery Health' or 'About' screenshots. Extract Max Capacity, Cycle Count, and Model details.
2. **Hardware Check**: Identify physical traits (e.g., USB-C vs Lightning, Color, Scratches).
3. **Price Suggestion**: Realistic market price in PKR (Pakistan).
4. **Duplicate & Fraud Audit**: 
   - Check if the image is a "Screenshot of another app" (look for UI elements from OLX, Instagram, or other marketplaces).
   - Detect if it's a "Stock/Internet photo" (too perfect, studio background, or watermarks).
   - Create a "uniqueVisualKey": A short string summarizing the background + object (e.g., "iphone-on-red-carpet") to identify re-uploads.
   - Assign "imageQuality": "Original" (Real photo), "Stock" (Internet photo), "Screenshot" (Stolen from other app), or "Suspicious".

**LANGUAGE RULE**: "aiDescription" MUST be in Roman Urdu.

Return ONLY a JSON object:
{
  "product": "string",
  "condition": "string",
  "aiDescription": "string",
  "estimatedPrice": number,
  "imageQuality": "string",
  "isDuplicateRisk": boolean,
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
        let dataSource = `AI Audit: ${aiData.imageQuality}`;
        if (aiData.isDuplicateRisk) {
            dataSource += ` | Warning: High Duplicate Risk Detected`;
        }

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
                imageQuality: aiData.imageQuality, 
                isDuplicateRisk: aiData.isDuplicateRisk,
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
        const { uid, name, email, photoURL, provider } = req.body;
        let user = await User.findOne({ uid });

        if (user) {
            user.name = name;
            user.email = email;
            if (photoURL) user.profilePic = photoURL;
            await user.save();
            return res.status(200).json({ message: "User profile updated", user });
        }

        user = new User({ 
            uid, 
            name, 
            email,
            profilePic: photoURL || null,
            provider: provider || "password"
        });
        await user.save();
        res.status(201).json({ message: "User registered successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Registration failed", error: error.message });
    }
};

// ==========================================
// 🛡️ CREATE AD (With Duplicate Detection)
// ==========================================
export const create = async (req, res) => {
    try {
        console.log("🔍 POST AD REQUEST:", {
            files: req.files?.length,
            bodyFields: Object.keys(req.body),
            user: req.user?.uid
        });

        const posted_by_uid = req.user.uid;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: "📸 Images required" 
            });
        }

        const { price, title, description, category, condition, location, imageQualityByAI } = req.body;

        if (!title?.trim()) return res.status(400).json({ success: false, message: "📝 Title is required" });
        if (!price || isNaN(Number(price))) return res.status(400).json({ success: false, message: "💰 Valid price is required" });
        if (!location?.trim()) return res.status(400).json({ success: false, message: "📍 Location is required" });
        if (!description?.trim()) return res.status(400).json({ success: false, message: "📝 Description is required" });
        if (!category) return res.status(400).json({ success: false, message: "🏷️ Category is required" });

        if (imageQualityByAI === "Stock" || imageQualityByAI === "Screenshot") {
            return res.status(400).json({ 
                success: false,
                message: "🛡️ Rezon Security: Internet photos / screenshots not allowed." 
            });
        }

        // 🛡️ DUPLICATE SHIELD
        const imageHashes = [];
        for (const file of req.files) {
            const hash = crypto.createHash('md5').update(file.buffer).digest('hex');
            const duplicate = await Ad.findOne({ 
                imageHashes: hash, 
                isDeleted: false 
            });
            if (duplicate) {
                return res.status(400).json({ 
                    success: false,
                    message: "🛡️ Rezon Shield: Ye image pehle hi use ho chuki hai. Nayi photo upload karein." 
                });
            }
            imageHashes.push(hash);
        }

        const imageUrls = await Promise.all(
            req.files.map(file => uploadBufferToCloudinary(file.buffer, 'rezon_products'))
        );

        let parsedDetails = {};
        if (req.body.details) {
            try {
                parsedDetails = typeof req.body.details === 'string' 
                    ? JSON.parse(req.body.details) 
                    : req.body.details;
            } catch (e) {
                console.log("⚠️ Details parse failed");
            }
        }

        const newAd = new Ad({
            images: imageUrls,
            imageHashes: imageHashes,
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            condition: condition || "Used",
            price: Number(price),
            category,
            posted_by_uid,
            status: 'Active',
            aiAuditStatus: imageQualityByAI || "Original",
            details: parsedDetails
        });

        await newAd.save();
        console.log("✅ AD SAVED:", newAd._id);

        res.status(201).json({ 
            success: true, 
            message: "Ad Posted successfully! 🎉",
            data: newAd
        });

    } catch (error) {
        console.error("🔥 CREATE AD ERROR:", error);
        res.status(500).json({ 
            success: false,
            message: "Post failed", 
            error: error.message 
        });
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
// UPDATE AD (FIXED)
// ==========================================
export const updateAd = async (req, res) => {
    try {
        const adId = req.params.id;
        const userUid = req.user.uid;
        const currentAd = await Ad.findById(adId);

        if (!currentAd) return res.status(404).json({ message: "Ad not found" });
        if (currentAd.posted_by_uid !== userUid) return res.status(403).json({ message: "Ownership Mismatch" });
        if (currentAd.status === 'Sold') return res.status(400).json({ message: "Sold items cannot be edited" });

        const updateData = { ...req.body };

        let existingImages = [];
        let imagesToDelete = [];

        try {
            if (req.body.existingImages) existingImages = JSON.parse(req.body.existingImages);
            if (req.body.imagesToDelete) imagesToDelete = JSON.parse(req.body.imagesToDelete);
        } catch (e) {
            console.log("Parse error:", e);
        }

        if (imagesToDelete.length > 0) {
            for (const imageUrl of imagesToDelete) {
                try {
                    const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.log("Cloudinary delete error:", err);
                }
            }
        }

        let newImageUrls = [];
        if (req.files && req.files.length > 0) {
            newImageUrls = await Promise.all(
                req.files.map(file => uploadBufferToCloudinary(file.buffer, 'rezon_products'))
            );
        }

        updateData.images = [...existingImages, ...newImageUrls];

        if (updateData.details && typeof updateData.details === 'string') {
            try { updateData.details = JSON.parse(updateData.details); } catch (e) {}
        }

        delete updateData.existingImages;
        delete updateData.imagesToDelete;

        const updatedAd = await Ad.findByIdAndUpdate(adId, updateData, { new: true });
        res.status(200).json({ success: true, message: "Ad Updated Successfully", data: updatedAd });

    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: "Update failed", error: error.message });
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

        if (ad.images && ad.images.length > 0) {
            for (const imageUrl of ad.images) {
                try {
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

        const ad = await Ad.findById(adId);
        if (!ad) return res.status(404).json({ message: "Ad nahi mili" });
        if (ad.posted_by_uid !== sellerUid) return res.status(403).json({ message: "Sirf owner dekh sakta hai" });

        const chats = await Chat.find({
            adId: adId,
            participants: { $in: [sellerUid] }
        });

        if (!chats.length) {
            return res.status(404).json({ message: "Is ad pe koi chat nahi hai", buyers: [] });
        }

        const buyerUids = [...new Set(
            chats.flatMap(chat => chat.participants.filter(uid => uid !== sellerUid))
        )];

        const buyers = await Promise.all(
            buyerUids.map(async (uid) => {
                const user = await User.findOne({ uid }).select("name uid profilePic rating");
                const chat = chats.find(c => c.participants.includes(uid));
                return {
                    ...user?.toObject(),
                    lastMessage: chat?.lastMessage?.substring(0, 50) || "",
                    chatId: chat?._id
                };
            })
        );

        res.status(200).json({ adTitle: ad.title, adPrice: ad.price, buyers });
    } catch (error) {
        console.error("Get Chat Users Error:", error);
        res.status(500).json({ message: "Users load nahi huay", error: error.message });
    }
};

export const markAsSold = async (req, res) => {
    try {
        const { adId } = req.params;
        const { buyerUid, buyerObjectId } = req.body;
        const sellerUid = req.user.uid;

        if (!buyerUid || !buyerObjectId) {
            return res.status(400).json({ message: "Buyer select karna zaroori hai" });
        }

        const ad = await Ad.findById(adId);
        if (!ad) return res.status(404).json({ message: "Ad nahi mili" });
        if (ad.posted_by_uid !== sellerUid) return res.status(403).json({ message: "Sirf owner mark kar sakta hai" });
        if (ad.status === 'Sold') return res.status(400).json({ message: "Yeh item already sold hai" });

        const chatExists = await Chat.findOne({
            adId: adId,
            participants: { $all: [sellerUid, buyerUid] }
        });
        if (!chatExists) {
            return res.status(400).json({ message: "Yeh buyer is ad par message nahi kiya" });
        }

        const buyer = await User.findOne({ uid: buyerUid });
        if (!buyer) return res.status(404).json({ message: "Buyer nahi mila" });

        const deleteDate = new Date();
        deleteDate.setDate(deleteDate.getDate() + 30);

        ad.status = 'Sold';
        ad.soldTo = buyer._id;
        ad.soldToUid = buyerUid;
        ad.soldAt = new Date();
        ad.isDeleted = true;
        ad.deleteAfter = deleteDate;
        await ad.save();

        await User.findByIdAndUpdate(buyer._id, {
            $push: {
                notifications: {
                    type: 'purchase_complete',
                    title: 'Purchase Completed! 🎉',
                    message: `You bought "${ad.title}" for Rs ${ad.price}. Leave a review!`,
                    adId: ad._id,
                    read: false,
                    createdAt: new Date()
                }
            }
        });

        res.status(200).json({
            success: true,
            message: "🎉 Item successfully sold!",
            soldTo: { name: buyer.name, uid: buyerUid, _id: buyer._id },
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
        if (!buyer) return res.status(404).json({ message: "User nahi mila" });

        const ad = await Ad.findOne({
            _id: adId,
            status: 'Sold',
            $or: [{ soldTo: buyer._id }, { soldToUid: buyerUid }]
        });

        if (!ad) {
            return res.status(403).json({ canReview: false, message: "Sirf actual buyer hi review de sakta hai" });
        }

        const existingReview = await Review.findOne({ buyerId: buyer._id, adId: adId });
        const daysSinceSold = Math.floor((new Date() - ad.soldAt) / (1000 * 60 * 60 * 24));
        const canStillReview = daysSinceSold <= 30;

        res.status(200).json({
            canReview: !existingReview && canStillReview,
            alreadyReviewed: !!existingReview,
            expired: !canStillReview,
            daysRemaining: Math.max(0, 30 - daysSinceSold)
        });
    } catch (error) {
        res.status(500).json({ message: "Error checking eligibility" });
    }
};

// ==========================================
// REVIEWS & RATINGS
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
        if (!buyer || !seller) return res.status(404).json({ message: "User nahi mila." });

        const ad = await Ad.findOne({ _id: adId, status: 'Sold', soldTo: buyer._id });
        if (!ad) {
            return res.status(403).json({ message: "❌ Sirf actual buyer review de sakta hai." });
        }

        const existingReview = await Review.findOne({ buyerId: buyer._id, adId: adId });
        if (existingReview) return res.status(400).json({ message: "⚠️ Already reviewed" });

        const newReview = new Review({ buyerId: buyer._id, sellerId: seller._id, adId, rating, comment });
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

        res.status(200).json({ seller, reviews });
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
        if (!reporterUser) return res.status(404).json({ message: "Aapka account nahi mila." });
        if (!targetUser) return res.status(404).json({ message: "Target user nahi mila." });

        const newReport = new Report({
            reporterId: reporterUser._id,
            reportedUserId: targetUser._id,
            adId,
            reason,
            description
        });
        await newReport.save();
        res.status(201).json({ message: "Report Admin ko bhej di gayi hai." });
    } catch (error) {
        console.error("Report Error:", error.message);
        res.status(500).json({ message: "Report fail ho gayi" });
    }
};

// ==========================================
// 🛡️ KYC VERIFICATION (FIXED SYNTAX)
// ==========================================
export const verifyIdentity = async (req, res) => {
    try {
        const userUid = req.user.uid;
        const existingUser = await User.findOne({ uid: userUid });

        if (existingUser?.isVerified) {
            return res.status(400).json({ 
                success: false,
                message: "Aapka account pehle se verified hai! ✅" 
            });
        }

        if (!req.files || !req.files.idFront || !req.files.idBack || !req.files.liveSelfie) {
            return res.status(400).json({ 
                success: false,
                message: "ID Front, ID Back aur Live Selfie lazmi hain. 📸" 
            });
        }

        const timestamp = Date.now();

        console.log("🔍 Starting OCR on CNIC...");
        const ocrResult = await extractCNICData(req.files.idFront[0].buffer);

        if (ocrResult.success) {
            console.log("✅ OCR Extracted:", {
                name: ocrResult.name,
                fatherName: ocrResult.fatherName,
                cnicNumber: ocrResult.cnicNumber
            });
        }

        if (ocrResult.success && ocrResult.cnicNumber) {
            const existingCNIC = await User.findOne({ 
                cnicNumber: ocrResult.cnicNumber,
                uid: { $ne: userUid }
            });
            if (existingCNIC) {
                return res.status(409).json({
                    success: false,
                    message: "Ye CNIC number already registered hai! ❌",
                    error: "DUPLICATE_CNIC"
                });
            }
        }

        if (req.body.phoneNumber) {
            const existingPhone = await User.findOne({
                phoneNumber: req.body.phoneNumber,
                uid: { $ne: userUid }
            });
            if (existingPhone) {
                return res.status(409).json({
                    success: false,
                    message: "Ye phone number already registered hai! ❌",
                    error: "DUPLICATE_PHONE"
                });
            }
        }

        const [idFrontUrl, idBackUrl, selfieUrl] = await Promise.all([
            uploadBufferToCloudinary(req.files.idFront[0].buffer, 'rezon_kyc', `idFront-${userUid}-${timestamp}`),
            uploadBufferToCloudinary(req.files.idBack[0].buffer, 'rezon_kyc', `idBack-${userUid}-${timestamp}`),
            uploadBufferToCloudinary(req.files.liveSelfie[0].buffer, 'rezon_kyc', `selfie-${userUid}-${timestamp}`)
        ]);

        // 🔥 FIXED: Template literal use karo, escape nahi
        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { 
                            type: "text", 
                            text: `Compare the face in the selfie with the face on the ID card. Are they the same person? Return JSON: { "isMatched": boolean, "confidence": number, "reason": "string" }`
                        },
                        { type: "image_url", image_url: { url: idFrontUrl } },
                        { type: "image_url", image_url: { url: selfieUrl } }
                    ],
                },
            ],
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(aiResponse.choices[0].message.content);

        const isActuallyMatched = result.isMatched || 
                                 (result.confidence >= 55) || 
                                 result.reason.toLowerCase().includes("similar");

        if (!isActuallyMatched) {
            return res.status(400).json({ 
                success: false, 
                message: `Verification fail: ${result.reason} ❌`,
                error: "VERIFICATION_FAILED"
            });
        }

        const updateData = {
            profilePic: selfieUrl,
            isVerified: true,
            verificationStatus: 'Verified',
            verifiedAt: new Date(),
            kycDocuments: { idFront: idFrontUrl, idBack: idBackUrl, selfie: selfieUrl },
            kycDetails: {
                method: "AI + OCR Verification",
                aiCheck: true,
                faceMatchScore: result.confidence,
                reason: result.reason,
                ocrData: { extracted: ocrResult.success, rawText: ocrResult.rawText || null }
            }
        };

        if (ocrResult.success) {
            if (ocrResult.name) updateData.name = ocrResult.name;
            if (ocrResult.fatherName) updateData.fatherName = ocrResult.fatherName;
            if (ocrResult.cnicNumber) updateData.cnicNumber = ocrResult.cnicNumber;
            if (ocrResult.dateOfBirth) updateData.dateOfBirth = ocrResult.dateOfBirth;
            if (ocrResult.gender) updateData.gender = ocrResult.gender;
        }

        if (req.body.phoneNumber) {
            updateData.phoneNumber = req.body.phoneNumber;
            updateData.isPhoneVerified = true;
        }

        const updatedUser = await User.findOneAndUpdate(
            { uid: userUid },
            updateData,
            { new: true }
        );

        return res.status(200).json({ 
            success: true, 
            message: "Verified successfully! 🎉",
            data: {
                name: updatedUser.name,
                fatherName: updatedUser.fatherName || null,
                cnicNumber: updatedUser.cnicNumber || null,
                phoneNumber: updatedUser.phoneNumber || null,
                isVerified: true
            }
        });

    } catch (error) {
        console.error("🔥 Rezon KYC Error:", error);
        res.status(500).json({ 
            success: false,
            message: "Server error during verification", 
            error: error.message 
        });
    }
};

// ==========================================
// 👤 GET CURRENT USER
// ==========================================
export const me = async (req, res) => {
    try {
        const userUid = req.user.uid;
        const user = await User.findOne({ uid: userUid });
        if (!user) return res.status(404).json({ message: "User database mein nahi mila" });
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
// 💬 CHAT SYSTEM
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
        .populate({ path: 'adId', select: 'title images price' })
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
        if (!chat) return res.status(404).json({ message: "Chat nahi mili" });
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
        if (unreadCount > 0) await chat.save();

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
        const { message, recipientId, tempId } = req.body;
        const senderId = req.user.uid;

        if (!message?.trim()) return res.status(400).json({ message: "Message empty nahi ho sakta" });

        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { 
                $push: { messages: { senderId, message: message.trim(), timestamp: new Date(), read: false } },
                $set: { lastMessage: message.trim(), updatedAt: new Date() } 
            },
            { new: true }
        ).populate('adId', 'title images');

        if (!updatedChat) return res.status(404).json({ message: "Chat nahi mili" });

        const savedMessage = updatedChat.messages[updatedChat.messages.length - 1];
        const io = req.app.get("io");

        io.to(chatId).emit("receive_message", {
            _id: savedMessage._id,
            senderId: savedMessage.senderId,
            message: savedMessage.message,
            timestamp: savedMessage.timestamp,
            chatId,
            tempId
        });

        io.to(recipientId).emit("new_message_notification", {
            chatId,
            message: savedMessage.message,
            senderId
        });

        res.status(200).json({ success: true, data: savedMessage });
    } catch (error) {
        console.error("🔥 SendMessage Error:", error);
        res.status(500).json({ message: "Message send nahi ho saka" });
    }
};

export const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.uid;

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ message: "Chat nahi mili" });
        if (!chat.participants.includes(userId)) return res.status(403).json({ message: "Access denied" });

        if (!chat.deletedBy.includes(userId)) {
            chat.deletedBy.push(userId);
            await chat.save();
        }

        res.status(200).json({ success: true, message: "Conversation delete ho gayi" });
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

        let chat = await Chat.findOne({ adId, participants: { $all: [buyerId, sellerId] } });
        if (chat) {
            chat.deletedBy = chat.deletedBy.filter(id => id !== buyerId && id !== sellerId);
            await chat.save();
            return res.status(200).json({ success: true, chatId: chat._id, message: "Existing chat restore ho gayi" });
        }

        chat = new Chat({ participants: [buyerId, sellerId], adId, messages: [], lastMessage: "", deletedBy: [] });
        await chat.save();
        res.status(201).json({ success: true, chatId: chat._id, message: "Nayi chat shuru ho gayi" });
    } catch (error) {
        console.error("🔥 Start Chat Error:", error);
        res.status(500).json({ message: "Chat start nahi ho saki", error: error.message });
    }
};