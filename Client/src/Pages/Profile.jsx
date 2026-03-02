import React, { useState, useEffect } from "react";
import { FaStar, FaUserCircle, FaAd, FaShieldAlt } from "react-icons/fa";
import axios from "axios";
import ReviewCard from "../Components/ReviewCard";

const Profile = ({ user }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellerStats, setSellerStats] = useState({
    avgRating: 0,
    totalAds: 0,
    memberSince: "Jan 2025"
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch reviews (Ab response object format mein hai)
        const reviewsRes = await axios.get(`http://localhost:8000/api/reviews/seller/${user.uid}`);
        
        // CHECK: Yahan hum res.data.reviews access karenge kyunke controller change hua hai
        const reviewsData = reviewsRes.data.reviews || [];
        const sellerData = reviewsRes.data.seller || {};
        
        setReviews(reviewsData);

        // 2. Fetch total ads
        const adsRes = await axios.get(`http://localhost:8000/api/myads`, {
          headers: { Authorization: `Bearer ${user?.accessToken}` }
        });

        setSellerStats(prev => ({
          ...prev,
          totalAds: adsRes.data.length,
          // Agar backend se rating aa rahi hai toh wo use karein, warna calculate karein
          avgRating: sellerData.rating || (reviewsData.length > 0 
            ? (reviewsData.reduce((acc, r) => acc + r.rating, 0) / reviewsData.length).toFixed(1)
            : 0)
        }));

      } catch (error) {
        console.error("Error fetching live profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.uid) {
      fetchProfileData();
    }
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-orange-600">Loading Live Profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 h-48 w-full"></div>
      
      <div className="max-w-5xl mx-auto px-4 -mt-16">
        <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="relative">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-32 h-32 rounded-full border-4 border-white shadow-lg" />
            ) : (
              <FaUserCircle className="w-32 h-32 text-gray-300 bg-white rounded-full" />
            )}
            <div className="absolute bottom-2 right-2 bg-green-500 w-5 h-5 rounded-full border-2 border-white"></div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-800">{user?.displayName || user?.name || "User"}</h1>
            <p className="text-gray-500 flex items-center justify-center md:justify-start gap-2 mt-1">
              <FaShieldAlt className="text-blue-500" /> Verified Seller • Member since {sellerStats.memberSince}
            </p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <div className="bg-orange-50 px-4 py-2 rounded-lg border border-orange-100 text-center">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Rating</p>
                <p className="text-lg font-extrabold text-orange-600 flex items-center gap-1">
                  {sellerStats.avgRating} <FaStar className="text-yellow-400 text-sm" />
                </p>
              </div>
              <div className="bg-pink-50 px-4 py-2 rounded-lg border border-pink-100 text-center">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Ads</p>
                <p className="text-lg font-extrabold text-pink-600 flex items-center gap-1">
                  {sellerStats.totalAds} <FaAd className="text-sm" />
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button className="bg-orange-500 text-white px-6 py-2 rounded-lg font-bold">Edit Profile</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              Recent Reviews <span className="text-sm font-normal text-gray-500">({reviews.length})</span>
            </h2>
            
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
              {reviews.length > 0 ? (
                reviews.map((rev) => (
                  <div key={rev._id} className="border-b last:border-0 pb-4 last:pb-0 mt-4">
                    <div className="flex justify-between items-center mb-1">
                        {/* Buyer ka naam populate se aa raha hai */}
                        <span className="font-bold text-sm text-gray-800">{rev.buyerId?.name || "Buyer"}</span>
                        <div className="flex text-yellow-400 text-xs">
                            {[...Array(5)].map((_, i) => (
                                <FaStar key={i} className={i < rev.rating ? "text-yellow-400" : "text-gray-200"} />
                            ))}
                        </div>
                    </div>
                    <p className="text-xs text-gray-600 italic">"{rev.comment}"</p>
                    {/* Item ka title bhi populate ho kar aa raha hai */}
                    <p className="text-[10px] text-gray-400 mt-2">Item: {rev.adId?.title}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                    <p className="text-gray-400 text-sm">No reviews yet for this seller.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Account Safety</h2>
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-yellow-400">
              <p className="text-sm text-gray-600 italic">
                "Always conduct your deals in safe public places and provide honest descriptions to maintain a high rating."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;