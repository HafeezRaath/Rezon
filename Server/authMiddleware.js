// Server/authMiddleware.js
import admin from 'firebase-admin';

/**
 * Yeh function Firebase ID Token ko verify karta hai.
 * Isey hum protected routes (like posting ad, chat) mein use karenge.
 */
const authenticate = async (req, res, next) => {
    // 1. Authorization Header check (Authorization: Bearer <TOKEN>)
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Auth Error: Token missing in headers');
        return res.status(401).json({ 
            error: 'Unauthorized: Token is missing or formatted incorrectly.' 
        });
    }
    
    // Token ko 'Bearer ' prefix se alag karein
    const idToken = authHeader.split(' ')[1];
    
    try {
        // 2. Token Verification (Firebase Admin SDK se)
        // Yaad rakhein aapka serviceAccount.json Hostinger par setup hona chahiye
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // 3. User UID aur baki data request object mein daal dein
        req.user = { 
            uid: decodedToken.uid,
            email: decodedToken.email
        };
        
        // Sab theek hai, next middleware ya controller par jayein
        next(); 
    } catch (error) {
        // Token invalid hai (expired, tampered, etc.)
        console.error('Firebase Auth Error:', error.message);
        return res.status(401).json({ 
            error: 'Unauthorized: Invalid or expired token.' 
        });
    }
};

export default authenticate;