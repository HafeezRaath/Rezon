import Ad from "../model/userModel.js";
import User from "../model/user.js";
import Report from "../model/Report.js";
import Review from "../model/Review.js";
import Chat from "../model/chat.js";
import mongoose from "mongoose";

// ==========================================
// 📊 DASHBOARD STATS
// ==========================================
export const getDashboardStats = async (req, res) => {
    try {
        const totalAds = await Ad.countDocuments();
        const activeAds = await Ad.countDocuments({ status: 'Active', isDeleted: { $ne: true } });
        const soldAds = await Ad.countDocuments({ status: 'Sold' });
        const totalUsers = await User.countDocuments();
        const totalReports = await Report.countDocuments();
        const pendingReports = await Report.countDocuments({ status: 'Pending' });
        
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        
        const recentAds = await Ad.countDocuments({ createdAt: { $gte: last7Days } });
        const recentReports = await Report.countDocuments({ createdAt: { $gte: last7Days } });

        res.status(200).json({
            success: true,
            stats: { totalAds, activeAds, soldAds, totalUsers, totalReports, pendingReports, recentAds, recentReports }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Stats load nahi huay", error: error.message });
    }
};

// ==========================================
// 📢 ADS MANAGEMENT
// ==========================================
export const getAllAdsAdmin = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = {};
        if (status && status !== 'all') query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const ads = await Ad.find(query).sort({ createdAt: -1 });
        const adsWithUser = await Promise.all(ads.map(async (ad) => {
            const user = await User.findOne({ uid: ad.posted_by_uid }).select('name email uid');
            return { ...ad._doc, postedBy: user || { name: 'Unknown', email: 'N/A' } };
        }));
        res.status(200).json({ success: true, ads: adsWithUser });
    } catch (error) {
        res.status(500).json({ success: false, message: "Ads load nahi huay", error: error.message });
    }
};

export const deleteAdAdmin = async (req, res) => {
    try {
        const { adId } = req.params;
        await Ad.findByIdAndDelete(adId);
        await Report.deleteMany({ adId: adId });
        res.status(200).json({ success: true, message: "✅ Ad delete ho gayi" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Delete failed" });
    }
};

export const updateAdStatusAdmin = async (req, res) => {
    try {
        const { adId } = req.params;
        const { status } = req.body;
        const ad = await Ad.findByIdAndUpdate(adId, { status }, { new: true });
        res.status(200).json({ success: true, message: `Status ${status} kar diya`, ad });
    } catch (error) {
        res.status(500).json({ success: false, message: "Update failed" });
    }
};

// ==========================================
// 🚩 REPORTS MANAGEMENT
// ==========================================
export const getAllReports = async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        if (status && status !== 'all') query.status = status;
        const reports = await Report.find(query)
            .populate('reporterId', 'name email uid')
            .populate('reportedUserId', 'name email uid')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, reports });
    } catch (error) {
        res.status(500).json({ success: false, message: "Reports load nahi huay" });
    }
};

export const getReportById = async (req, res) => {
    try {
        const report = await Report.findById(req.params.reportId)
            .populate('reporterId', 'name email uid profilePic')
            .populate('reportedUserId', 'name email uid profilePic')
            .populate('adId');
        if (!report) return res.status(404).json({ success: false, message: "Report nahi mili" });
        res.status(200).json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error loading report" });
    }
};

export const updateReportStatus = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const report = await Report.findByIdAndUpdate(
            req.params.reportId,
            { status, adminNotes, resolvedAt: new Date() },
            { new: true }
        );
        res.status(200).json({ success: true, message: `Report ${status}`, report });
    } catch (error) {
        res.status(500).json({ success: false, message: "Update failed" });
    }
};

// ==========================================
// 👤 USER MANAGEMENT (The Missing Parts)
// ==========================================

export const getFlaggedUsers = async (req, res) => {
    try {
        const users = await User.find({ 
            $or: [{ warningCount: { $gt: 0 } }, { isFlagged: true }]
        }).sort({ warningCount: -1 });
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Users load nahi huay" });
    }
};

export const getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: "User nahi mila" });
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching user" });
    }
};

export const getUserAds = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: "User nahi mila" });
        const ads = await Ad.find({ posted_by_uid: user.uid });
        res.status(200).json({ success: true, ads });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching user ads" });
    }
};

export const getUserReportHistory = async (req, res) => {
    try {
        const reports = await Report.find({ reportedUserId: req.params.userId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, reports });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching history" });
    }
};

export const warnUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { $inc: { warningCount: 1 }, isFlagged: true }, { new: true });
        res.status(200).json({ success: true, message: "User ko warning de di gayi hai", user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Action failed" });
    }
};

export const suspendUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { status: 'Suspended' }, { new: true });
        res.status(200).json({ success: true, message: "User account suspend kar diya gaya", user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Action failed" });
    }
};

export const banUser = async (req, res) => {
    try {
        const { isBanned } = req.body;
        const user = await User.findByIdAndUpdate(req.params.userId, { isBanned, status: isBanned ? 'Banned' : 'Active' }, { new: true });
        res.status(200).json({ success: true, message: isBanned ? "User ban ho gaya" : "User unban ho gaya", user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Action failed" });
    }
};
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });

        // Data ko map karke name missing wala masla hal karein
        const sanitizedUsers = users.map(user => {
            let finalName = user.displayName || user.name || user.fullName;

            // Agar DB mein name bilkul khali hai, to email se name nikalo
            if (!finalName || finalName === "" || finalName === "Unknown User") {
                finalName = user.email.split('@')[0]; // raathdeveloper@gmail.com -> raathdeveloper
            }

            return {
                ...user._doc,
                displayName: finalName // Frontend hamesha isi key ko read karega
            };
        });

        res.status(200).json(sanitizedUsers);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. Toggle Block/Unblock
export const toggleBlockUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isBlocked = !user.isBlocked;
        await user.save();
        res.status(200).json({ success: true, message: `User ${user.isBlocked ? 'Blocked' : 'Unblocked'}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. Delete User & Their Ads
export const deleteUserAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        await Ad.deleteMany({ sellerId: userId }); // User ke ads bhi khatam
        await User.findByIdAndDelete(userId);
        res.status(200).json({ success: true, message: "User and their ads deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
export const deleteReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        await Report.findByIdAndDelete(reportId);
        res.status(200).json({ success: true, message: "Report deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
// ================= DASHBOARD STATS =================

