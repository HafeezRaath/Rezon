import React, { useState } from 'react'
import HeroSection from '../Components/HeroSection';
import CategoriesSection from '../Components/CategoriesSection';
import AllAds from '../Components/allads';
import PostAd from '../CRUD/postad'; 

const Home = ({ user, setShowLogin, setShowAds, setShowVerification }) => {
  // Naya ad post karne ke liye modal state
  const [showPostAd, setShowPostAd] = useState(false);

  // Jab naya ad successfully post ho jaye
  const handleAdPosted = (newAd) => {
    setShowPostAd(false);
    // Yahan aap mazeed logic add kar sakte hain (e.g. success message ya list refresh)
  };

  return (
    <>
      {/* 
          HeroSection ko 'setShowMyAds' prop ke tor par 'setShowPostAd' pass kiya hai 
          taake HeroSection ke andar 'setShowMyAds(true)' chalne par PostAd modal khul jaye.
      */}
      <HeroSection 
        setShowLogin={setShowLogin} 
        setShowMyAds={setShowPostAd} 
        setShowVerification={setShowVerification}
      />
      
      <CategoriesSection />
      
      {/* Saare ads dikhane wala section */}
      <AllAds user={user} />  

      {/* Jab showPostAd true ho aur user login ho tab hi modal dikhao */}
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