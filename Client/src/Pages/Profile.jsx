import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaStar, FaUserCircle, FaAd, FaShieldAlt, FaSpinner, FaExclamationTriangle, FaEdit, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE_URL = "https://rezon.up.railway.app/api";

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
    verified: false
  });

  // 🔒 Secure API call with error handling
  const fetchProfileData = useCallback(async () => {
    if (!user?.uid) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('firebaseIdToken') || user?.accessToken;
      if (!token) {
        throw new Error("Authentication required");
      }

      // Parallel API calls for better performance
      const [reviewsRes, adsRes, userRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/reviews/seller/${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }),
        axios.get(`${API_BASE_URL}/myads`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }),
        axios.get(`${API_BASE_URL}/users/${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }).catch(() => ({ data: null })) // Optional call
      ]);

      // Process reviews
      let reviewsData = [];
      let sellerData = {};
      if (reviewsRes.status === 'fulfilled') {
        reviewsData = reviewsRes.value.data?.reviews || [];
        sellerData = reviewsRes.value.data?.seller || {};
      } else {
        console.error("Reviews fetch failed:", reviewsRes.reason);
      }

      // Process ads
      let adsData = [];
      if (adsRes.status === 'fulfilled') {
        adsData = adsRes.value.data?.ads || adsRes.value.data || [];
      }

      // Process user data
      let userData = {};
      if (userRes.status === 'fulfilled' && userRes.value.data) {
        userData = userRes.value.data;
      }

      // Calculate stats
      const avgRating = sellerData.rating || (reviewsData.length > 0 
        ? (reviewsData.reduce((acc, r) => acc + r.rating, 0) / reviewsData.length).toFixed(1)
        : "0.0");

      const soldAds = adsData.filter(ad => ad.status === 'sold').length;

      setReviews(reviewsData);
      setSellerStats({
        avgRating: parseFloat(avgRating).toFixed(1),
        totalAds: adsData.length,
        totalSold: soldAds,
        memberSince: userData.createdAt 
          ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : "Jan 2025",
        verified: userData.isVerified || user?.emailVerified || false
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

  // 🎨 Memoized star rating component
  const StarRating = useMemo(() => ({ rating }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar 
          key={star} 
          className={`text-sm ${star <= rating ? "text-yellow-400" : "text-gray-200"}`} 
        />
      ))}
    </div>
  ), []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <FaSpinner className="animate-spin text-4xl text-pink-600 mb-4" />
        <p className="text-gray-600 font-medium">Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <FaExclamationTriangle className="text-4xl text-red-500 mb-4" />
        <p className="text-gray-800 font-bold mb-2">Oops! Something went wrong</p>
        <p className="text-gray-500 text-sm mb-4 text-center">{error}</p>
        <button 
          onClick={fetchProfileData}
          className="bg-pink-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-pink-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <FaUserCircle className="text-6xl text-gray-300 mb-4" />
        <p className="text-gray-800 font-bold mb-2">Not logged in</p>
        <button 
          onClick={() => navigate('/login')}
          className="bg-pink-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-pink-700 transition"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Cover Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 h-48 w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 -mt-20 relative z-10">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 border border-gray-100">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full items-center justify-center ${user?.photoURL ? 'hidden' : 'flex'}`}>
                <FaUserCircle className="w-full h-full text-gray-300" />
              </div>
            </div>
            
            {/* Online Status */}
            <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-3 border-white shadow-sm flex items-center justify-center">
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              {user?.displayName || user?.name || "Rezon Member"}
            </h1>
            <p className="text-gray-500 flex items-center justify-center md:justify-start gap-2 mt-1 text-sm">
              <FaShieldAlt className={sellerStats.verified ? "text-blue-500" : "text-gray-400"} /> 
              {sellerStats.verified ? "Rezon Verified" : "Member"} • Joined {sellerStats.memberSince}
            </p>
            
            {/* Stats Grid */}
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 px-4 py-3 rounded-xl border border-orange-200 text-center min-w-[100px]">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Rating</p>
                <p className="text-xl font-black text-orange-600 flex items-center justify-center gap-1">
                  {sellerStats.avgRating} <FaStar className="text-yellow-400 text-sm" />
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 px-4 py-3 rounded-xl border border-pink-200 text-center min-w-[100px]">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Active Ads</p>
                <p className="text-xl font-black text-pink-600">
                  {sellerStats.totalAds}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 px-4 py-3 rounded-xl border border-green-200 text-center min-w-[100px]">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Sold</p>
                <p className="text-xl font-black text-green-600">
                  {sellerStats.totalSold}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button 
              onClick={() => navigate('/profile/edit')}
              className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <FaEdit size={16} /> Edit Profile
            </button>
            <button 
              onClick={() => navigate('/myads')}
              className="bg-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-pink-700 transition shadow-lg active:scale-95"
            >
              My Ads
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Reviews Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-pink-100 p-2 rounded-lg">
                  <FaStar className="text-pink-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Reviews & Feedback</h2>
              </div>
              <span className="bg-pink-100 text-pink-600 px-3 py-1 rounded-full text-xs font-bold">
                {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
              </span>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {reviews.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {reviews.map((rev, index) => (
                    <div key={rev._id || index} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {(rev.buyerId?.name || "B").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-800">
                              {rev.buyerId?.name || "Verified Buyer"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : "Recently"}
                            </p>
                          </div>
                        </div>
                        <StarRating rating={rev.rating} />
                      </div>
                      
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        "{rev.comment || "Great transaction!"}"
                      </p>
                      
                      {rev.adId?.title && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400">Purchased:</span>
                          <span className="text-pink-600 font-semibold bg-pink-50 px-2 py-1 rounded">
                            {rev.adId.title}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaStar className="text-3xl text-gray-300" />
                  </div>
                  <p className="text-gray-800 font-bold mb-1">No reviews yet</p>
                  <p className="text-gray-400 text-sm">Complete sales to get reviews from buyers</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Trust Tips */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-4 text-white">
                <h3 className="font-bold flex items-center gap-2">
                  <FaShieldAlt /> Seller Tips
                </h3>
              </div>
              <div className="p-4">
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Respond to messages quickly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Use clear, high-quality photos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Be honest about item condition</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Meet in safe, public places</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Verification Status */}
            <div className={`rounded-2xl p-6 text-white shadow-xl ${
              sellerStats.verified 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
                : 'bg-gradient-to-br from-gray-600 to-gray-700'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${sellerStats.verified ? 'bg-white/20' : 'bg-white/10'}`}>
                  {sellerStats.verified ? <FaCheckCircle size={24} /> : <FaShieldAlt size={24} />}
                </div>
                <div>
                  <h4 className="font-bold text-lg">
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
                  className="w-full mt-2 bg-white text-gray-800 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition"
                >
                  Start Verification
                </button>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h4 className="font-bold text-gray-800 mb-4 text-sm">Quick Stats</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Response Rate</span>
                  <span className="font-bold text-green-600">98%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Avg. Response</span>
                  <span className="font-bold text-gray-800">15 min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Member For</span>
                  <span className="font-bold text-gray-800">{sellerStats.memberSince}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;