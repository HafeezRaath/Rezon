
import React from "react";
import heroimage from '../assets/images/OIP.jpg'

const HeroSection = () => {

  return (
   <div className="w-full bg-[#f8f9fc] py-12 px-6">
  <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
    
    {/* Left: Image */}
    <div className="md:w-1/2 w-full mb-8 md:mb-0">
      <img
        src={heroimage}
        alt="Hero"
        className="w-full h-auto rounded-xl shadow-md"
      />
    </div>

    {/* Right: Content */}
    <div className="md:w-1/2 w-full text-center md:text-left flex flex-col items-center md:items-start pl-4">
      {/* Icon */}
      <div className="text-blue-600 text-4xl mb-4">
        📦
      </div>

      {/* Heading */}
      <h1 className="text-4xl font-extrabold text-gray-900 leading-snug mb-4">
  Pakistan’s Smartest Way to Buy & Sell – Instantly, Locally, & Safely
</h1>


    {/* Supporting Text */}
    <p className="text-gray-700 text-lg max-w-md mb-6">
  Discover Pakistan’s first AI-powered resale marketplace — where verified listings meet local trust. No scams. No stress. Just smart deals.
</p>


      {/* CTA Buttons */}
      <div className="flex gap-4">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-sm font-semibold transition">
          Start Selling
        </button>
        <button className="border border-blue-600 text-blue-600 px-6 py-3 rounded-md text-sm font-semibold hover:bg-blue-100 transition">
          Browse Products
        </button>
      </div>
    </div>

  </div>
</div>
  )
}
export default HeroSection;
