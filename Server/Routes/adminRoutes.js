import express from "express";
import authenticate from "../authMiddleware.js";
import { 
    getDashboardStats, 
    getAllAdsAdmin, 
    deleteAdAdmin, 
    updateAdStatusAdmin,
    getAllReports,
    getReportById,
    updateReportStatus,
    deleteReport, // 👈 Ye controller import karna zaroori hai
    getAllUsers,         
    toggleBlockUser,     
    deleteUserAdmin,     
    getFlaggedUsers,
    warnUser,
    suspendUser,
    banUser,
    getUserReportHistory,
    getUserAds,
    getUserDetails
} from "../Controller/adminController.js";

const router = express.Router();

// ==========================================
// ✅ ADMIN CHECK MIDDLEWARE
// ==========================================
const isAdmin = (req, res, next) => {
    const ADMIN_UIDS = process.env.ADMIN_UIDS?.split(',') || [];
    
    if (!ADMIN_UIDS.includes(req.user.uid)) {
        return res.status(403).json({ 
            success: false,
            message: "❌ Access Denied: Admin only" 
        });
    }
    next();
};

// Sabhi routes par authentication aur admin check apply karein
router.use(authenticate, isAdmin);

// ==========================================
// 📊 DASHBOARD
// ==========================================
router.get("/dashboard", getDashboardStats);

// ==========================================
// 📦 ADS MANAGEMENT
// ==========================================
router.get("/ads", getAllAdsAdmin);
router.delete("/ads/:adId", deleteAdAdmin);
router.put("/ads/:adId/status", updateAdStatusAdmin);
router.put("/ads/:adId/hide", updateAdStatusAdmin); 

// ==========================================
// 🚩 REPORTS MANAGEMENT
// ==========================================
router.get("/reports", getAllReports);
router.get("/reports/:reportId", getReportById);
router.put("/reports/:reportId", updateReportStatus);
router.delete("/reports/:reportId", deleteReport); // 👈 🆕 YE ROUTE ADD KIYA HAI

// ==========================================
// 👥 USER MANAGEMENT
// ==========================================
router.get("/users/all", getAllUsers);                
router.get("/users/flagged", getFlaggedUsers);
router.get("/users/:userId", getUserDetails);
router.get("/users/:userId/ads", getUserAds);
router.get("/users/:userId/report-history", getUserReportHistory);

router.post("/users/toggle-block", toggleBlockUser);   
router.delete("/users/:userId", deleteUserAdmin);     
router.post("/users/:userId/warn", warnUser);
router.post("/users/:userId/suspend", suspendUser);
router.post("/users/:userId/ban", banUser);

// ==========================================
// 🔔 NOTIFICATIONS
// ==========================================
router.post("/notifications/send", async (req, res) => {
    try {
        const { userId, title, message, type } = req.body;
        res.json({ success: true, message: "Notification sent successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;