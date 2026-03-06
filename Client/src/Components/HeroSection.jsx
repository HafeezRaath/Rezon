import React from "react";
import heroimage from '../assets/images/OIP.jpg';
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase.config";
import axios from "axios";
import toast from "react-hot-toast";

const HeroSection = ({ setShowLogin, setShowAds, setShowVerification }) => {
    const navigate = useNavigate();

    // ✅ Dynamic API URL for Local and Live
   // ✅ Railway Live URL Update
const API_URL = window.location.hostname === "localhost" 
    ? "http://localhost:8000/api" 
    : "https://rezon.up.railway.app/api"; // Naya Railway URL

    // ✅ Reusable Sell Logic (Navbar jaisa)
    const handleStartSelling = async () => {
        const currentUser = auth.currentUser;

        if (!currentUser) {
            toast.error("Pehle login karein! 🔒");
            setShowLogin(true);
            return;
        }

        try {
            const token = await currentUser.getIdToken();
            const res = await axios.get(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Agar verified nahi hai toh VerificationFlow kholo
            if (!res.data.isVerified) {
                toast("Pehle apni identity verify karein 🛡️");
                setShowVerification(true);
            } else {
                setShowAds(true);
            }
        } catch (err) {
            console.error("Verification check failed");
            setShowVerification(true);
        }
    };

    return (
        <div className="w-full bg-[#f8f9fc] py-16 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
                
                {/* Left: Image */}
                <div className="md:w-1/2 w-full">
                    <div className="relative">
                        <img
                            src={heroimage}
                            alt="Rezon Marketplace"
                            className="w-full h-auto rounded-[2rem] shadow-2xl border-8 border-white transform hover:scale-[1.01] transition-transform duration-500"
                        />
                        {/* Floating Badge */}
                        <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-xl hidden lg:block">
                            <p className="text-blue-600 font-black text-xl">100% Secure</p>
                            <p className="text-gray-500 text-xs font-bold uppercase">AI Verified Deals</p>
                        </div>
                    </div>
                </div>

                {/* Right: Content */}
                <div className="md:w-1/2 w-full text-center md:text-left flex flex-col items-center md:items-start pl-0 md:pl-10">
                    {/* Icon/Emoji */}
                    <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-sm">
                        📦
                    </div>

                    {/* Heading */}
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.1] mb-6 tracking-tighter uppercase">
                        Pakistan’s <span className="text-blue-600">Smartest</span> Way to Buy & Sell
                    </h1>

                    {/* Supporting Text */}
                    <p className="text-gray-600 text-lg md:text-xl font-medium max-w-md mb-10 leading-relaxed">
                        Discover Pakistan’s first AI-powered resale marketplace — where verified listings meet local trust. 
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap gap-4 justify-center md:justify-start w-full">
                        <button 
                            onClick={handleStartSelling}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl text-lg font-black shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-tight"
                        >
                            Start Selling Now
                        </button>
                        <button 
                            onClick={() => navigate('/mobiles')}
                            className="bg-white border-2 border-gray-200 text-gray-700 px-10 py-4 rounded-2xl text-lg font-black hover:border-blue-600 hover:text-blue-600 transition-all active:scale-95 uppercase tracking-tight"
                        >
                            Browse Store
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default HeroSection;