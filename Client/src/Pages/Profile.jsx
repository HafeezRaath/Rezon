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
  FaEnvelope,
  FaBoxOpen,
  FaPlus,
  FaArrowLeft,
  FaSignOutAlt        // 🔥 NEW: Logout icon
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { signOut } from "firebase/auth";        // 🔥 NEW: Firebase signOut
import { auth } from "../firebase.config";      // 🔥 NEW: Auth instance
import EditProfileModal from "../Components/EditProfileModal";
import Ads from "../CRUD/ads";

const API_BASE_URL = "https://rezon.up.railway.app/api";
const BASE_URL = "https://rezon.up.railway.app";

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [myAds, setMyAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [showMyAds, setShowMyAds] = useState(false);

  const [sellerStats, setSellerStats] = useState({
    avgRating: 0,
    totalAds: 0,
    totalSold: 0,
    memberSince: "Jan 2025",
    verified: false,
    phone: "",
    email: ""
  });

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

      const [reviewsRes, userRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/reviews/seller/${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }),
        axios.get(`${API_BASE_URL}/users/me`, {
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

      let userData = {};
      if (userRes.status === 'fulfilled') {
        userData = userRes.value.data || {};
      }

      const avgRating = sellerData.rating || (reviewsData.length > 0 
        ? (reviewsData.reduce((acc, r) => acc + r.rating, 0) / reviewsData.length).toFixed(1)
        : "0.0");

      setReviews(reviewsData);
      setSellerStats({
        avgRating: parseFloat(avgRating).toFixed(1),
        totalAds: userData.totalAds || 0,
        totalSold: userData.totalSold || 0,
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

  const fetchMyAds = useCallback(async () => {
    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      toast.error("Please login first");
      return;
    }

    setAdsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/myads`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      setMyAds(res.data?.ads || res.data || []);
      setShowMyAds(true);
    } catch (err) {
      console.error("My ads error:", err);
      toast.error("Failed to load your ads");
      setMyAds([]);
    } finally {
      setAdsLoading(false);
    }
  }, []);

  // 🔥 NEW: Logout handler
  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('firebaseIdToken');
      toast.success("Logged out successfully!");
      navigate('/');
      window.location.reload(); // Force reload to clear all states
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Failed to logout");
    }
  }, [navigate]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleProfileUpdate = useCallback((updatedData) => {
    if (user && typeof user === 'object') {
      user.displayName = updatedData.displayName;
      user.photoURL = updatedData.photoURL;
    }
    setSellerStats(prev => ({ ...prev }));
    toast.success("Profile refreshed!");
  }, [user]);

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
                  src={getImageUrl(user.photoURL)}
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

            <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full border-3 border-white shadow-sm flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>

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

          {/* 🔥 FIXED: Buttons with Logout */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto">
            <button 
              onClick={() => setShowEditModal(true)}
              className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-slate-900 transition shadow-md active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              <FaEdit size={14} /> Edit Profile
            </button>
            <button 
              onClick={fetchMyAds}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition shadow-md active:scale-95 text-sm"
            >
              My Ads
            </button>
            {/* 🔥 NEW: Logout Button */}
            <button 
              onClick={handleLogout}
              className="bg-rose-50 text-rose-600 border border-rose-200 px-6 py-2.5 rounded-lg font-bold hover:bg-rose-100 hover:text-rose-700 transition shadow-sm active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              <FaSignOutAlt size={14} /> Logout
            </button>
          </div>
        </div>

        {/* My Ads Section */}
        {showMyAds && (
          <div className="mt-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <FaBoxOpen className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">My Ads</h2>
                  <p className="text-xs text-slate-500">{myAds.length} {myAds.length === 1 ? 'ad' : 'ads'} posted</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/post-ad')}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition font-bold text-sm active:scale-95"
                >
                  <FaPlus size={12} /> New Ad
                </button>
                <button
                  onClick={() => setShowMyAds(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  <FaArrowLeft size={18} />
                </button>
              </div>
            </div>

            {adsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm">
                <FaSpinner className="animate-spin text-3xl text-emerald-600 mb-3" />
                <p className="text-slate-500">Loading your ads...</p>
              </div>
            ) : myAds.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaBoxOpen className="text-3xl text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No ads yet</h3>
                <p className="text-slate-500 mb-6">Start selling by posting your first ad</p>
                <button 
                  onClick={() => navigate('/post-ad')}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg"
                >
                  Post Your First Ad
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myAds.map((ad) => (
                  <div 
                    key={ad._id} 
                    className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-md ${
                      ad.status === 'sold' ? 'border-slate-300 opacity-75' : 'border-slate-100 hover:border-emerald-200'
                    }`}
                  >
                    {ad.status === 'sold' && (
                      <div className="bg-slate-800 text-white px-3 py-1 text-xs font-bold text-center">
                        SOLD
                      </div>
                    )}

                    {ad.images?.[0] && (
                      <div className="h-48 overflow-hidden bg-slate-100">
                        <img 
                          src={ad.images[0]} 
                          alt={ad.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                          {ad.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(ad.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-800 mb-2 line-clamp-2">{ad.title}</h3>

                      <p className="text-emerald-600 font-black text-lg mb-3">
                        Rs {ad.price?.toLocaleString()}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                        <span>{ad.condition}</span>
                        <span className="flex items-center gap-1">
                          <FaMapMarkerAlt /> {ad.location}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setShowMyAds(false);
                          navigate(`/allads?openAd=${ad._id}`);
                        }}
                        className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-900 transition active:scale-95"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Content Grid */}
        {!showMyAds && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
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

            <div className="space-y-4">
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
        )}
      </div>

      {showEditModal && (
        <EditProfileModal 
          user={user}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
};

export default Profile;