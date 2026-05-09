import React, { useCallback, useState } from "react";
import heroimage from '../assets/images/OIP.jpg';
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase.config";
import axios from "axios";
import toast from "react-hot-toast";

const getApiUrl = () => {
    const isLocal = window.location.hostname === "localhost" || 
                    window.location.hostname === "127.0.0.1";
    return isLocal 
        ? "http://localhost:8000/api" 
        : "https://rezon.up.railway.app/api";
};

// 🔥 Props: setShowLogin + setShowVerification + setShowPostAd (NEW)
const HeroSection = ({ setShowLogin, setShowVerification, setShowPostAd }) => {
    const navigate = useNavigate();
    const [isChecking, setIsChecking] = useState(false);

    const handleStartSelling = useCallback(async () => {
        const currentUser = auth.currentUser;

        if (!currentUser) {
            toast.error("Please login first! 🔒");
            setShowLogin(true);
            return;
        }

        // Agar already checking chal raha hai toh return
        if (isChecking) return;
        setIsChecking(true);

        const API_URL = getApiUrl();
        const toastId = toast.loading("Checking verification status...");

        try {
            const token = await currentUser.getIdToken();
            const res = await axios.get(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 10000
            });

            toast.dismiss(toastId);

            // 🔥 SAME LOGIC AS NAVBAR: Check verification
            if (!res.data?.isVerified) {
                toast("Please verify your identity first 🛡️", { icon: '⚠️' });
                // 🔥 Verification modal open karo, navigate mat karo
                setShowVerification?.(true);
            } else {
                // 🔥 User verified hai → PostAd modal open karo
                setShowPostAd?.(true);
            }
        } catch (err) {
            toast.dismiss(toastId);
            console.error("Verification check failed:", err);

            if (err.code === 'ECONNABORTED') {
                toast.error("Request timeout. Please check your connection.");
            } else if (err.response?.status === 401) {
                toast.error("Session expired. Please login again.");
                setShowLogin(true);
            } else {
                toast.error("Unable to verify status. Please try again.");
            }
        } finally {
            setIsChecking(false);
        }
    }, [setShowLogin, setShowVerification, setShowPostAd, isChecking]);

    const theme = {
        primary: "emerald",
        gradient: "from-emerald-500 to-teal-600",
        badge: "bg-emerald-100 text-emerald-700",
        buttonPrimary: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200",
        buttonSecondary: "hover:border-emerald-600 hover:text-emerald-600",
        iconBg: "bg-emerald-100"
    };

    return (
        <div className="w-full bg-slate-50 py-16 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">

                {/* Left: Image */}
                <div className="md:w-1/2 w-full">
                    <div className="relative group">
                        <img
                            src={heroimage}
                            alt="Rezon Marketplace"
                            className="w-full h-auto rounded-3xl shadow-2xl border-8 border-white transform group-hover:scale-[1.02] transition-transform duration-500"
                            loading="eager"
                        />
                        <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-xl hidden lg:block animate-in slide-in-from-bottom-2">
                            <p className={`${theme.badge.split(' ')[1]} font-black text-xl`}>100% Secure</p>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">AI Verified Deals</p>
                        </div>
                    </div>
                </div>

                {/* Right: Content */}
                <div className="md:w-1/2 w-full text-center md:text-left flex flex-col items-center md:items-start pl-0 md:pl-10">
                    <div className={`${theme.iconBg} w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-sm`}>
                        📦
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] mb-6 tracking-tight">
                        Pakistan's <span className="text-emerald-600">Smartest</span> Way to Buy & Sell
                    </h1>

                    <p className="text-slate-600 text-lg md:text-xl font-medium max-w-md mb-10 leading-relaxed">
                        Discover Pakistan's first AI-powered resale marketplace — where verified listings meet local trust. 
                    </p>

                    <div className="flex flex-wrap gap-4 justify-center md:justify-start w-full">
                        {/* 🔥 Start Selling → Verification check + PostAd modal */}
                        <button 
                            onClick={handleStartSelling}
                            disabled={isChecking}
                            className={`${theme.buttonPrimary} text-white px-10 py-4 rounded-2xl text-lg font-bold shadow-xl transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isChecking ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                    </svg>
                                    Checking...
                                </>
                            ) : (
                                "Start Selling Now"
                            )}
                        </button>

                        {/* 🔥 Browse Products → Home (All Ads) */}
                        <button 
                            onClick={() => navigate('/')}  
                            className={`bg-white border-2 border-slate-200 text-slate-700 px-10 py-4 rounded-2xl text-lg font-bold ${theme.buttonSecondary} transition-all active:scale-95`}
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