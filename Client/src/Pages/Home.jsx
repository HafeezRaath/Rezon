import React from 'react'
import HeroSection from '../Components/HeroSection';
import CategoriesSection from '../Components/CategoriesSection';
import AllAds from '../Components/allads';
import Footer from '../Components/footer';

const Home = ({ user, setShowLogin, setShowAds, setShowVerification }) => {
  return (
    <>
      <HeroSection 
        setShowLogin={setShowLogin} 
        setShowAds={setShowAds} 
        setShowVerification={setShowVerification} 
      />
      <CategoriesSection/>
      <AllAds user={user} />  
      <Footer/>
    </>
  )
}

export default Home;