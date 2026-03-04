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
    deleteReport,
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
    // Trim spaces and handle empty variables safely
    const rawAdminUids = process.env.ADMIN_UIDS || "";
    const ADMIN_UIDS = rawAdminUids.split(',').map(uid => uid.trim());
    
    if (!req.user || !ADMIN_UIDS.includes(req.user.uid)) {
        console.error(`🚫 Unauthorized Admin Access Attempt by: ${req.user?.uid}`);
        return res.status(403).json({ 
            success: false,
            message: "❌ Access Denied: Admin privileges required" 
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
router.put("/ads/:id/status", updateAdStatusAdmin); // General status update
router.put("/ads/:adId/hide", updateAdStatusAdmin); 

// ==========================================
// 🚩 REPORTS MANAGEMENT
// ==========================================
router.get("/reports", getAllReports);
router.get("/reports/:reportId", getReportById);
router.put("/reports/:reportId", updateReportStatus);
router.delete("/reports/:reportId", deleteReport); 

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
        // Logic for sending notification can be added here
        res.json({ success: true, message: "Notification sent successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;