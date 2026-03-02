// Server/authMiddleware.js
import admin from 'firebase-admin';

// Yeh function Firebase ID Token ko verify karta hai.
const authenticate = async (req, res, next) => {
    // 1. Authorization Header check (Authorization: Bearer <TOKEN>)
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Token is missing or formatted incorrectly.' });
    }
    
    // Token ko 'Bearer ' se alag karen
    const idToken = req.headers.authorization.split('Bearer ')[1];
    
    try {
        // 2. Token Verification (Firebase Admin SDK se)
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // 3. User UID ko request object mein daal dein
        req.user = { 
            uid: decodedToken.uid 
        };
        
        // Sab theek hai, aage badhein
        next(); 
    } catch (error) {
        // Token invalid hai (expired, tampered, etc.)
        console.error('Error verifying token:', error.message);
        return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }
};

export default authenticate;