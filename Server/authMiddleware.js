// Server/authMiddleware.js

import admin from "firebase-admin";

// 🔐 Firebase Authentication Middleware
const authenticate = async (req, res, next) => {

    const authHeader = req.headers.authorization;

    // ❌ No token provided
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Token is missing."
        });
    }

    const idToken = authHeader.split(" ")[1];

    try {

        // ⚠️ Check Firebase Admin initialization
        if (!admin.apps.length) {
            throw new Error("Firebase Admin SDK not initialized");
        }

        // 🔍 Verify Firebase ID Token
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // 📦 Attach user data to request
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email || "",
            name: decodedToken.name || ""
        };

        next();

    } catch (error) {

        console.error("🛡️ Auth Shield Error:", error.message);

        return res.status(401).json({
            success: false,
            message: "Session expired. Please login again.",
            error: error.message
        });

    }

};

export default authenticate;