import React, { useState, useEffect, useCallback } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebook, FaSpinner } from "react-icons/fa";
import Signin from "../loginsetup/signnumber";
import axios from "axios";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { auth } from "../firebase.config";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const Signinpopup = ({ onClose, isOpen, onSwitchToLogin }) => {
  const [showSignin, setShowSignin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // API URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Google Sign In Handler
  const handleGoogleSignIn = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user) throw new Error("No user data received");

      const firebaseIdToken = await user.getIdToken();
      localStorage.setItem('firebaseIdToken', firebaseIdToken);

      // Sync with MongoDB
      try {
        await axios.post(`${API_BASE_URL}/auth/register`, {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || "User",
          email: user.email,
          photoURL: user.photoURL,
          provider: "google"
        }, {
          headers: {
            'Authorization': `Bearer ${firebaseIdToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        toast.success(`Welcome ${user.displayName || "User"}!`);
      } catch (dbError) {
        console.error("MongoDB Sync Error:", dbError);
        // Don't block login if DB sync fails, but warn user
        toast.success("Logged in! (Profile sync pending)");
      }

      onClose();
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      
      let errorMessage = "Google Sign-In failed.";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign-in cancelled.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "Popup blocked! Please allow popups.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = "Account exists with different login method.";
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, API_BASE_URL, onClose]);

  // Placeholder handlers
  const handleAppleSignIn = useCallback(() => {
    toast.info("Apple Sign-in coming soon!");
  }, []);

  const handleFacebookSignIn = useCallback(() => {
    toast.info("Facebook Sign-in coming soon!");
  }, []);

  const handleShowPhoneSignin = useCallback(() => {
    setShowSignin(true);
  }, []);

  const handleClosePhoneSignin = useCallback(() => {
    setShowSignin(false);
  }, []);

  // Handle login link click
  const handleLoginClick = useCallback((e) => {
    e.preventDefault();
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      onClose();
    }
  }, [onSwitchToLogin, onClose]);

  if (!isOpen) return null;

  const popupContent = (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 z-[1000] animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
    >
      {/* Close Button - Moved inside for better positioning */}
      <div className="relative w-full max-w-[500px]">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-pink-400 text-3xl font-bold transition-colors z-10 focus:outline-none"
          aria-label="Close popup"
        >
          &times;
        </button>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-h-[90vh] overflow-y-auto">
          <h2 
            id="signup-title"
            className="text-3xl font-extrabold text-center bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-transparent bg-clip-text mb-1 pt-2"
          >
            USP
          </h2>
          <h4 className="text-lg md:text-xl font-bold text-center text-pink-600 mb-6">
            Create a New Account on <span className="font-black">USP</span>
          </h4>

          <div className="flex flex-col gap-3">
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-pink-500 py-3.5 rounded-xl text-gray-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <FaSpinner className="animate-spin text-pink-600" size={22} />
              ) : (
                <FcGoogle size={22} className="group-hover:scale-110 transition-transform" />
              )}
              <span className="text-sm font-semibold">
                {isLoading ? "Signing in..." : "Sign up with Google"}
              </span>
            </button>

            {/* Apple Sign In */}
            <button 
              onClick={handleAppleSignIn}
              className="flex items-center justify-center gap-3 bg-black hover:bg-gray-900 border-2 border-black py-3.5 rounded-xl text-white transition-all shadow-sm hover:shadow-md group"
            >
              <FaApple size={22} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">Sign up with Apple</span>
            </button>

            {/* Facebook Sign In */}
            <button 
              onClick={handleFacebookSignIn}
              className="flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] border-2 border-[#1877F2] py-3.5 rounded-xl text-white transition-all shadow-sm hover:shadow-md group"
            >
              <FaFacebook size={22} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">Sign up with Facebook</span>
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">OR</span>
              </div>
            </div>

            {/* Phone Sign In */}
            <button
              onClick={handleShowPhoneSignin}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 py-3.5 rounded-xl text-white transition-all shadow-md hover:shadow-lg font-semibold"
            >
              <span className="text-sm">Sign up with Phone Number</span>
            </button>

            {/* Nested Phone Signin Component */}
            {showSignin && (
              <div className="mt-4 animate-in slide-in-from-top-2">
                <Signin onClose={handleClosePhoneSignin} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 space-y-3">
            <p className="text-xs text-center text-gray-500 leading-relaxed">
              By creating an account, you agree to USP's{" "}
              <a href="/terms" className="text-pink-600 hover:underline font-medium">Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" className="text-pink-600 hover:underline font-medium">Privacy Policy</a>
            </p>
            
            <p className="text-sm text-center text-gray-600">
              Already have an account?{" "}
              <button
                onClick={handleLoginClick}
                className="font-semibold text-pink-600 hover:text-pink-700 hover:underline transition-colors"
              >
                Log in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
};

export default Signinpopup;