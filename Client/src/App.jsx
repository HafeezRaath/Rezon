import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
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
import Footer from "./Components/Footer"; // 🔥 ADDED: Footer import

// 🔥 NEW: AllAds and Placeholder pages
import AllAds from "./Components/allads"; // 🔥 ADDED: AllAds import
import PlaceholderPage from "./Pages/PlaceholderPage"; // 🔥 ADDED: Placeholder page

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const background = location.state?.backgroundLocation;

  // --- 🔐 AUTH STATE ---
  const [user, setUser] = useState(null);

  // --- ⚙️ UI STATES ---
  const [showLogin, setShowLogin] = useState(false);
  const [showAds, setShowAds] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    return () => unsubscribe();
  }, []);

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
    <div className="min-h-screen flex flex-col"> {/* 🔥 ADDED: flex flex-col for footer */}
      {/* 🔥 TOASTER */}
      <Toaster 
        position="top-center"
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{
          style: {
            background: '#fff',
            color: '#000',
            fontWeight: 'bold',
            padding: '16px 24px',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          },
          success: {
            style: { background: '#10b981', color: '#fff' },
            iconTheme: { primary: '#fff', secondary: '#10b981' }
          },
          error: {
            style: { background: '#ef4444', color: '#fff' },
            iconTheme: { primary: '#fff', secondary: '#ef4444' }
          }
        }}
      />

      <Navbar 
        user={user} 
        onSearch={handleSearch} 
        onLocationChange={handleLocationChange} 
      /> 

      {/* 🔥 ADDED: main wrapper for flex-grow */}
      <main className="flex-1">
        <Routes location={background || location}>
          <Route path="/" element={
            <Home 
              user={user} 
              setShowLogin={setShowLogin} 
              setShowAds={setShowAds} 
              setShowVerification={setShowVerification} 
            />
          } />
          
          <Route path="/profile" element={<Profile user={user}/>}/>
          
          {/* 🔥 PostAd as normal route */}
          <Route path="/post-ad" element={<PostAd user={user} />} />
          
          <Route path="/update-ad/:id" element={<UpdateAd user={user} />} />
          
          {/* 🔥 ADDED: All Ads route */}
          <Route path="/all-ads" element={<AllAds user={user} />} />
          
          {/* Categories */}
          <Route path="/mobiles" element={<CategoryAds user={user} category="Mobile" />} /> 
          <Route path="/vehicles" element={<CategoryAds user={user} category="Car" />} /> 
          <Route path="/property-for-sale" element={<CategoryAds user={user} category="PropertySale" />} />
          <Route path="/electronics" element={<CategoryAds user={user} category="Electronics" />} />
          <Route path="/bikes" element={<CategoryAds user={user} category="Bikes" />} />
          <Route path="/furniture" element={<CategoryAds user={user} category="Furniture" />} />
          <Route path="/category/:slug" element={<CategoryAds user={user} />} /> 

          {/* Chat */}
          <Route path="/conversations" element={<ConversationList user={user} />} />
          <Route path="/chat/:conversationId" element={<ChatRoom user={user} />} />
          
          {/* Auth */}
          <Route path="/PhoneLogin" element={<PhoneLogin user={user}/>}/>
          <Route path="/verify" element={<VerificationFlow user={user} />} />
          
          {/* 🔥 ADDED: Footer pages */}
          <Route path="/about" element={<PlaceholderPage />} />
          <Route path="/blog" element={<PlaceholderPage />} />
          <Route path="/help" element={<PlaceholderPage />} />
          <Route path="/contact" element={<PlaceholderPage />} />
          <Route path="/privacy" element={<PlaceholderPage />} />
          <Route path="/terms" element={<PlaceholderPage />} />
          
          {/* Admin */}
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
          
          {/* 404 */}
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
      </main>

      {/* Modal Routes */}
      {background && (
        <Routes>
          <Route path="/login" element={<LoginPopup onClose={() => navigate(-1)} />} />
          <Route path="/signin" element={<SigninPopup onClose={() => navigate(-1)} />} />
          <Route path="/ads" element={<Ads onClose={() => navigate(-1)} user={user} />} />
        </Routes>
      )}

      {/* Manual Popups */}
      {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}

      {/* 🔥 ADDED: Footer at bottom */}
      <Footer />
    </div>
  );
}

export default App;