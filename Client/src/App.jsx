import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.config";

import Home from "./Pages/Home";
import Profile from "./Pages/Profile";
import AdDetails from "./Pages/AdDetails";                    // ✅ ADDED
import LoginPopup from "./Components/Loginpopup";
import SigninPopup from "./Components/Signinpopup";
import Ads from "./CRUD/ads";
import PostAd from "./CRUD/postad";                          // ✅ ADDED
import UpdateAd from "./CRUD/updatead";                      // ✅ ADDED (optional)
import CategoryAds from "./Components/Categoryads"; 
import ConversationList from "./Components/ConservationList"; 
import ChatRoom from "./Components/ChatRoom";
import Navbar from "./Components/Navbar";
import PhoneLogin from "./Components/PhoneLogin";
import VerificationFlow from "./loginsetup/VerificationFlow"; // ✅ ADDED

// Admin Import
import AdminPanel from "./Admin";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const background = location.state?.backgroundLocation;

  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = (userUid) => {
    const ADMIN_UIDS = [
      "btVq523cTvh4pTUS7AErSyVNER53", // Your UID
    ];
    return ADMIN_UIDS.includes(userUid);
  };

  return (
    <>
      <Navbar user={user} /> 

      <Routes location={background || location}>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/profile" element={<Profile user={user}/>}/>
        
        {/* Ad Routes - ✅ FIXED */}
        <Route path="/ad/:id" element={<AdDetails />} />           // ✅ ADDED
        <Route path="/post-ad" element={<PostAd user={user} />} /> // ✅ ADDED
        <Route path="/update-ad/:id" element={<UpdateAd user={user} />} /> // ✅ ADDED
        
        {/* Category Routes */}
        <Route path="/mobiles" element={<CategoryAds user={user} category="Mobile" />} /> 
        <Route path="/vehicles" element={<CategoryAds user={user} category="Car" />} /> 
        <Route path="/property-for-sale" element={<CategoryAds user={user} category="PropertySale" />} />
        <Route path="/electronics" element={<CategoryAds user={user} category="Electronics" />} />
        <Route path="/bikes" element={<CategoryAds user={user} category="Bikes" />} />
        <Route path="/furniture" element={<CategoryAds user={user} category="Furniture" />} />
        <Route path="/category/:slug" element={<CategoryAds user={user} />} /> 

        {/* Chat Routes */}
        <Route path="/conversations" element={<ConversationList user={user} />} />
        <Route path="/chat/:conversationId" element={<ChatRoom user={user} />} />
        
        {/* Auth Routes */}
        <Route path="/PhoneLogin" element={<PhoneLogin user={user}/>}/>
        <Route path="/verify" element={<VerificationFlow user={user} />} /> // ✅ ADDED
        
        {/* Admin Route */}
        <Route 
          path="/admin/*" 
          element={
            user && isAdmin(user.uid) ? (
              <AdminPanel />
            ) : (
              <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-red-600 mb-4">🚫 Access Denied</h1>
                  <p className="text-gray-600 mb-4">Sirf admin is page ko access kar sakta hai</p>
                  <button 
                    onClick={() => navigate('/')}
                    className="bg-pink-600 text-white px-6 py-2 rounded-lg font-bold"
                  >
                    Home Par Jao
                  </button>
                </div>
              </div>
            )
          } 
        />
        
        {/* 404 Route - ✅ ADDED */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p>Page not found</p>
              <button onClick={() => navigate('/')} className="mt-4 text-blue-600">
                Go Home
              </button>
            </div>
          </div>
        } />
      </Routes>

      {/* Popup / Modal routes */}
      {background && (
        <Routes>
          <Route path="/login" element={<LoginPopup onClose={() => navigate(-1)} />} />
          <Route path="/signin" element={<SigninPopup onClose={() => navigate(-1)} />} />
          <Route path="/ads" element={<Ads onClose={() => navigate(-1)} user={user} />} />
        </Routes>
      )}
    </>
  );
}

export default App;