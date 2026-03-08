import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.config";

// Components & Pages Imports
import Navbar from "./Components/Navbar";
import Home from "./Pages/Home";
import Profile from "./Pages/Profile";
import LoginPopup from "./Components/Loginpopup";
import SigninPopup from "./Components/Signinpopup";
import Ads from "./CRUD/ads";
import PostAd from "./CRUD/postad";
import UpdateAd from "./CRUD/updatead";
import CategoryAds from "./Components/Categoryads"; 
import ConversationList from "./Components/ConservationList"; 
import ChatRoom from "./Components/ChatRoom";
import PhoneLogin from "./Components/PhoneLogin";
import VerificationFlow from "./loginsetup/VerificationFlow";
import AdminPanel from "./Admin";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const background = location.state?.backgroundLocation;

  // --- 🔐 AUTH STATE ---
  const [user, setUser] = useState(null);

  // --- ⚙️ UI STATES (Hero & Navbar Logic) ---
  const [showLogin, setShowLogin] = useState(false);
  const [showAds, setShowAds] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    return () => unsubscribe();
  }, []);

  // --- 🔍 HANDLERS ---
  const handleSearch = (query) => {
    navigate(`/?search=${encodeURIComponent(query)}`);
  };

  const handleLocationChange = (loc) => {
    navigate(`/?city=${encodeURIComponent(loc)}`);
  };

  const isAdmin = (userUid) => {
    const ADMIN_UIDS = ["btVq523cTvh4pTUS7AErSyVNER53"];
    return ADMIN_UIDS.includes(userUid);
  };

  return (
    <>
      {/* 🟢 NAVBAR: Passing all required props */}
      <Navbar 
        user={user} 
        onSearch={handleSearch} 
        onLocationChange={handleLocationChange} 
      /> 

      <Routes location={background || location}>
        {/* 🏠 HOME: Passing states to trigger HeroSection logic */}
        <Route path="/" element={
          <Home 
            user={user} 
            setShowLogin={setShowLogin} 
            setShowAds={setShowAds} 
            setShowVerification={setShowVerification} 
          />
        } />
        
        <Route path="/profile" element={<Profile user={user}/>}/>
        <Route path="/post-ad" element={<PostAd user={user} />} />
        <Route path="/update-ad/:id" element={<UpdateAd user={user} />} />
        
        {/* 📱 CATEGORIES */}
        <Route path="/mobiles" element={<CategoryAds user={user} category="Mobile" />} /> 
        <Route path="/vehicles" element={<CategoryAds user={user} category="Car" />} /> 
        <Route path="/property-for-sale" element={<CategoryAds user={user} category="PropertySale" />} />
        <Route path="/electronics" element={<CategoryAds user={user} category="Electronics" />} />
        <Route path="/bikes" element={<CategoryAds user={user} category="Bikes" />} />
        <Route path="/furniture" element={<CategoryAds user={user} category="Furniture" />} />
        <Route path="/category/:slug" element={<CategoryAds user={user} />} /> 

        {/* 💬 CHAT */}
        <Route path="/conversations" element={<ConversationList user={user} />} />
        <Route path="/chat/:conversationId" element={<ChatRoom user={user} />} />
        
        {/* 🔑 AUTH */}
        <Route path="/PhoneLogin" element={<PhoneLogin user={user}/>}/>
        <Route path="/verify" element={<VerificationFlow user={user} />} />
        
        {/* 🛡️ ADMIN */}
        <Route path="/admin/*" element={
          user && isAdmin(user.uid) ? (
            <AdminPanel />
          ) : (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-center p-10 bg-white rounded-3xl shadow-2xl border border-slate-100">
                <h1 className="text-5xl font-black text-rose-600 mb-4">🚫 Access Denied</h1>
                <p className="text-slate-500 mb-8 font-medium">Sirf admin is page ko access kar sakta hai.</p>
                <button 
                  onClick={() => navigate('/')}
                  className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                  Home Par Jao
                </button>
              </div>
            </div>
          )
        } />
        
        {/* ⚠️ 404 */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <h1 className="text-9xl font-black text-slate-200">404</h1>
              <p className="text-xl font-bold text-slate-600 -mt-6">Page nahi mila!</p>
              <button onClick={() => navigate('/')} className="mt-6 text-emerald-600 font-bold hover:underline">
                Wapas Home Par Chalein
              </button>
            </div>
          </div>
        } />
      </Routes>

      {/* 📦 MODAL ROUTES (background state) */}
      {background && (
        <Routes>
          <Route path="/login" element={<LoginPopup onClose={() => navigate(-1)} />} />
          <Route path="/signin" element={<SigninPopup onClose={() => navigate(-1)} />} />
          <Route path="/ads" element={<Ads onClose={() => navigate(-1)} user={user} />} />
        </Routes>
      )}

      {/* 🛠️ MANUAL POPUP TRIGGER (Optional: if not using /login route) */}
      {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}
    </>
  );
}

export default App;