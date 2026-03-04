import React from 'react'
import Navbar from '../Components/Navbar'
import Hero from '../Components/HeroSection';
import { MdShoppingCart } from "react-icons/md";
import CategoriesSection from '../Components/CategoriesSection';
import AllAds from '../Components/allads';
import Footer from '../Components/footer';

// 🔑 'user' prop ko yahan receive karein
const Home = ({ user }) => {
  return (
    <>
      <HeroSection 
  setShowLogin={setShowLogin} 
  setShowAds={setShowAds} 
  setShowVerification={setShowVerification} 
/>
      <CategoriesSection/>
      {/* 🚀 AllAds ko yahan user pass karna sabse zaroori hai */}
      <AllAds user={user} />  
      <Footer/>
    </>
  )
}

export default Home