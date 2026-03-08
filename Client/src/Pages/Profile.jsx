import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  FaStar, 
  FaUserCircle, 
  FaAd, 
  FaShieldAlt, 
  FaSpinner, 
  FaExclamationTriangle, 
  FaEdit, 
  FaCheckCircle,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

// 🔧 FIXED: API Config
const API_BASE_URL = "https://rezon.up.railway.app/api";  // ← Space hatadein
const BASE_URL = "https://rezon.up.railway.app";

// 🔧 Image URL Helper
const getImageUrl = (path) => {
  if (!path) return '/default-avatar.png';
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
};

const Profile = ({ user }) => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sellerStats, setSellerStats] = useState({
    avgRating: 0,
    totalAds: 0,
    totalSold: 0,
    memberSince: "Jan 2025",
    verified: false,
    phone: "",
    email: ""
  });

  // 🔧 FIXED: API calls with correct endpoints
  const fetchProfileData = useCallback(async () => {
    if (!user?.uid) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('firebaseIdToken');
      if (!token) {
        throw new Error("Authentication required");
      }

      // 🔧 FIXED: Correct endpoints
      const [reviewsRes, adsRes, userRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/reviews/seller/${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }),
        axios.get(`${API_BASE_URL}/myads`, {  // ← Correct endpoint
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }),
        axios.get(`${API_BASE_URL}/users/me`, {  // ← /me use karein
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        })
      ]);

      let reviewsData = [];
      let sellerData = {};
      if (reviewsRes.status === 'fulfilled') {
        reviewsData = reviewsRes.value.data?.reviews || [];
        sellerData = reviewsRes.value.data?.seller || {};
      }

      let adsData = [];
      if (adsRes.status === 'fulfilled') {
        adsData = adsRes.value.data || [];  // ← Direct array
      }

      let userData = {};
      if (userRes.status === 'fulfilled') {
        userData = userRes.value.data || {};
      }

      const avgRating = sellerData.rating || (reviewsData.length > 0 
        ? (reviewsData.reduce((acc, r) => acc + r.rating, 0) / reviewsData.length).toFixed(1)
        : "0.0");

      const soldAds = adsData.filter(ad => ad.status === 'Sold').length;

      setReviews(reviewsData);
      setSellerStats({
        avgRating: parseFloat(avgRating).toFixed(1),
        totalAds: adsData.length,
        totalSold: soldAds,
        memberSince: userData.createdAt 
          ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : "Jan 2025",
        verified: userData.isVerified || false,
        phone: userData.phoneNumber || "",
        email: userData.email || user?.email || ""
      });

    } catch (error) {
      console.error("Profile fetch error:", error);
      setError(error.message || "Failed to load profile data");
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // 🎨 FIXED: Professional Color Scheme - Emerald + Slate
  const StarRating = useMemo(() => ({ rating }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar 
          key={star} 
          className={`text-sm ${star <= rating ? "text-amber-400" : "text-slate-200"}`} 
        />
      ))}
    </div>
  ), []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <FaSpinner className="animate-spin text-4xl text-emerald-600 mb-4" />
        <p className="text-slate-600 font-medium">Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <FaExclamationTriangle className="text-4xl text-rose-500 mb-4" />
        <p className="text-slate-800 font-bold mb-2">Oops! Something went wrong</p>
        <p className="text-slate-500 text-sm mb-4 text-center">{error}</p>
        <button 
          onClick={fetchProfileData}
          className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <FaUserCircle className="text-6xl text-slate-300 mb-4" />
        <p className="text-slate-800 font-bold mb-2">Not logged in</p>
        <button 
          onClick={() => navigate('/login')}
          className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* 🎨 FIXED: Professional Cover - Slate Gradient */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 h-48 w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 to-transparent"></div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 border border-slate-100">
          <div className="relative">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-100">
              {user?.photoURL ? (
                <img 
                  src={getImageUrl(user.photoURL)}  // 🔧 Helper use kiya
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full items-center justify-center ${user?.photoURL ? 'hidden' : 'flex'}`}>
                <FaUserCircle className="w-full h-full text-slate-300" />
              </div>
            </div>
            
            {/* Online Status */}
            <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full border-3 border-white shadow-sm flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>

            {/* Verified Badge */}
            {sellerStats.verified && (
              <div className="absolute -top-1 -right-1 bg-blue-500 text-white p-1.5 rounded-full border-2 border-white shadow-md" title="Verified">
                <FaCheckCircle size={14} />
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
              {user?.displayName || user?.name || "Rezon Member"}
            </h1>
            
            {/* 🔧 ADDED: Contact Info */}
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2 sm:gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <FaEnvelope className="text-slate-400" />
                {sellerStats.email}
              </span>
              {sellerStats.phone && (
                <span className="flex items-center gap-1">
                  <FaPhone className="text-slate-400" />
                  {sellerStats.phone}
                </span>
              )}
            </div>

            <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2 mt-2 text-sm">
              <FaShieldAlt className={sellerStats.verified ? "text-blue-500" : "text-slate-400"} /> 
              {sellerStats.verified ? "Rezon Verified" : "Member"} • Joined {sellerStats.memberSince}
            </p>
            
            {/* 🎨 FIXED: Stats Grid - Emerald Theme */}
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              <div className="bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100 text-center min-w-[90px]">
                <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider mb-1">Rating</p>
                <p className="text-xl font-black text-emerald-700 flex items-center justify-center gap-1">
                  {sellerStats.avgRating} <FaStar className="text-amber-400 text-sm" />
                </p>
              </div>
              
              <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-center min-w-[90px]">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Active Ads</p>
                <p className="text-xl font-black text-slate-700">
                  {sellerStats.totalAds}
                </p>
              </div>

              <div className="bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100 text-center min-w-[90px]">
                <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider mb-1">Sold</p>
                <p className="text-xl font-black text-emerald-700">
                  {sellerStats.totalSold}
                </p>
              </div>
            </div>
          </div>

          {/* 🔧 FIXED: Buttons - Responsive */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto">
            <button 
              onClick={() => navigate('/profile/edit')}
              className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-slate-900 transition shadow-md active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              <FaEdit size={14} /> Edit Profile
            </button>
            <button 
              onClick={() => navigate('/myads')}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition shadow-md active:scale-95 text-sm"
            >
              My Ads
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Reviews Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <FaStar className="text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Reviews & Feedback</h2>
              </div>
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
              </span>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {reviews.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {reviews.map((rev, index) => (
                    <div key={rev._id || index} className="p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                            {(rev.buyerId?.name || "B").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-800">
                              {rev.buyerId?.name || "Verified Buyer"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : "Recently"}
                            </p>
                          </div>
                        </div>
                        <StarRating rating={rev.rating} />
                      </div>
                      
                      <p className="text-slate-600 text-sm leading-relaxed mb-3">
                        "{rev.comment || "Great transaction!"}"
                      </p>
                      
                      {rev.adId?.title && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400">Purchased:</span>
                          <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded">
                            {rev.adId.title}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaStar className="text-3xl text-slate-300" />
                  </div>
                  <p className="text-slate-800 font-bold mb-1">No reviews yet</p>
                  <p className="text-slate-400 text-sm">Complete sales to get reviews from buyers</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Trust Tips */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                  <FaShieldAlt /> Seller Tips
                </h3>
              </div>
              <div className="p-4">
                <ul className="space-y-3 text-sm text-slate-600">
                  {[
                    "Respond to messages quickly",
                    "Use clear, high-quality photos",
                    "Be honest about item condition",
                    "Meet in safe, public places"
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Verification Status */}
            <div className={`rounded-xl p-5 text-white shadow-lg ${
              sellerStats.verified 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
                : 'bg-gradient-to-br from-slate-600 to-slate-700'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${sellerStats.verified ? 'bg-white/20' : 'bg-white/10'}`}>
                  {sellerStats.verified ? <FaCheckCircle size={20} /> : <FaShieldAlt size={20} />}
                </div>
                <div>
                  <h4 className="font-bold">
                    {sellerStats.verified ? "Identity Verified" : "Get Verified"}
                  </h4>
                  <p className="text-xs opacity-80">
                    {sellerStats.verified 
                      ? "Your account is fully verified" 
                      : "Verify to increase trust by 40%"}
                  </p>
                </div>
              </div>
              
              {!sellerStats.verified && (
                <button 
                  onClick={() => navigate('/verify')}
                  className="w-full mt-2 bg-white text-slate-800 py-2 rounded-lg font-bold text-sm hover:bg-slate-100 transition"
                >
                  Start Verification
                </button>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <h4 className="font-bold text-slate-800 mb-4 text-sm">Quick Stats</h4>
              <div className="space-y-3">
                {[
                  { label: "Response Rate", value: "98%", color: "text-emerald-600" },
                  { label: "Avg. Response", value: "15 min", color: "text-slate-800" },
                  { label: "Member For", value: sellerStats.memberSince, color: "text-slate-800" }
                ].map((stat, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">{stat.label}</span>
                    <span className={`font-bold ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;