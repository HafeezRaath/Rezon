import React, { useState } from 'react'
import HeroSection from '../Components/HeroSection';
import CategoriesSection from '../Components/CategoriesSection';
import AllAds from '../Components/allads';
import PostAd from '../CRUD/postad';  // 🔥 Import PostAd modal

const Home = ({ user, setShowLogin, setShowAds, setShowVerification }) => {
  // 🔥 NEW: PostAd modal state
  const [showPostAd, setShowPostAd] = useState(false);

  // 🔥 NEW: Handle new ad posted
  const handleAdPosted = (newAd) => {
    setShowPostAd(false);
    // Optionally refresh ads list or show success
  };

  return (
    <>
      <HeroSection 
        setShowLogin={setShowLogin} 
        setShowAds={setShowAds} 
        setShowVerification={setShowVerification}
        setShowPostAd={setShowPostAd}  // 🔥 NEW: Pass PostAd setter
      />
      <CategoriesSection/>
      <AllAds user={user} />  

      {/* 🔥 NEW: PostAd Modal */}
      {showPostAd && user && (
        <PostAd 
          user={user}
          onClose={() => setShowPostAd(false)}
          onAdAdded={handleAdPosted}
        />
      )}
    </>
  )
}

export default Home;