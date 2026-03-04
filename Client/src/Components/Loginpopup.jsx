import React, { useState, useEffect, useCallback } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebook } from "react-icons/fa";
import { createPortal } from "react-dom";
import Signinpopup from "./Signinpopup";
import Login from "../loginsetup/login";
import { auth, google } from "../firebase.config"; 
import { signInWithPopup } from "firebase/auth";
import toast from "react-hot-toast";

export default function LoginPopup({ onClose, isOpen }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignin, setShowSignin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 🔒 Prevent background scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // 🎯 Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // 🔑 Google Login Handler with Loading State
  const handleGoogleLogin = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, google);
      if (result.user) {
        toast.success("Mubarak ho! Google se login ho gaya.");
        onClose();
      }
    } catch (error) {
      console.error("Login Error:", error);
      // Specific error messages
      let errorMsg = "Google login fail ho gaya.";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMsg = "Popup band kar diya gaya.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMsg = "Multiple popups open hain.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMsg = "Internet connection check karein.";
      }
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onClose]);

  // 🍎 Apple Login Handler (Placeholder)
  const handleAppleLogin = useCallback(async () => {
    toast.info("Apple login jald aa raha hai!");
    // Future implementation: signInWithPopup(auth, appleProvider)
  }, []);

  // 📘 Facebook Login Handler (Placeholder)
  const handleFacebookLogin = useCallback(async () => {
    toast.info("Facebook login jald aa raha hai!");
    // Future implementation: signInWithPopup(auth, facebookProvider)
  }, []);

  // 🔄 Toggle handlers to prevent both popups open simultaneously
  const handleShowLogin = useCallback(() => {
    setShowSignin(false);
    setShowLogin(true);
  }, []);

  const handleShowSignin = useCallback((e) => {
    e.preventDefault();
    setShowLogin(false);
    setShowSignin(true);
  }, []);

  // Don't render if not open
  if (!isOpen) return null;

  const popupContent = (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
    >
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto border-2 border-white/50 animate-in fade-in zoom-in duration-300">
        
        {/* Close Button - Improved accessibility */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-pink-600 hover:bg-pink-50 transition-all text-2xl font-bold z-10"
          aria-label="Close popup"
        >
          &times;
        </button>

        <div className="p-6 md:p-8">
          {/* Gradient Heading */}
          <h2 
            id="login-title"
            className="text-3xl font-extrabold text-center bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-transparent bg-clip-text drop-shadow-sm mb-8"
          >
            Welcome Back To <span className="font-black">USP</span>
          </h2>
    
          {/* Social Login Buttons */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-pink-500 py-3.5 rounded-xl text-gray-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <FcGoogle size={22} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">
                {isLoading ? "Loading..." : "Login with Google"}
              </span>
            </button>

            <button 
              onClick={handleAppleLogin}
              className="flex items-center justify-center gap-3 bg-black hover:bg-gray-900 border-2 border-black py-3.5 rounded-xl text-white transition-all shadow-sm hover:shadow-md group"
            >
              <FaApple size={22} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">Login with Apple</span>
            </button>

            <button 
              onClick={handleFacebookLogin}
              className="flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] border-2 border-[#1877F2] py-3.5 rounded-xl text-white transition-all shadow-sm hover:shadow-md group"
            >
              <FaFacebook size={22} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">Login with Facebook</span>
            </button>

            {/* OR Divider - Improved */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">OR</span>
              </div>
            </div>

            {/* Email/Phone Login */}
            <button
              onClick={handleShowLogin}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 py-3.5 rounded-xl text-white transition-all shadow-md hover:shadow-lg font-semibold"
            >
              <span className="text-sm">Login with Email & Phone Number</span>
            </button>

            {/* Nested Login Component */}
            {showLogin && (
              <div className="mt-4 animate-in slide-in-from-top-2">
                <Login onClose={() => setShowLogin(false)} />
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="mt-8 text-sm text-center text-gray-600">
            New on <span className="font-bold text-pink-600">USP</span>?{" "}
            <button
              onClick={handleShowSignin}
              className="font-semibold text-pink-600 hover:text-pink-700 hover:underline transition-colors"
            >
              Sign up
            </button>
          </p>

          {/* Nested Signin Component */}
          {showSignin && (
            <div className="mt-4 animate-in slide-in-from-top-2">
              <Signinpopup onClose={() => setShowSignin(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use Portal for better z-index management
  return createPortal(popupContent, document.body);
}