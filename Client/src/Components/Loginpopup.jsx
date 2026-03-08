import React, { useState, useEffect, useCallback, useRef } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebook, FaSpinner, FaTimes } from "react-icons/fa";
import { createPortal } from "react-dom";
import Signinpopup from "./Signinpopup";
import Login from "../loginsetup/login";
import { auth, google } from "../firebase.config"; 
import { signInWithPopup } from "firebase/auth";
import toast from "react-hot-toast";
import axios from "axios"; // 🔧 ADDED: For backend sync

// 🔧 ADDED: API URL
const API_BASE_URL = "https://rezon.up.railway.app/api";

export default function LoginPopup({ onClose, isOpen }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignin, setShowSignin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // 🔧 FIXED: Stable callback
  const stableOnClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // 🔒 Prevent background scroll - FIXED
  useEffect(() => {
    if (!isOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  // 🎯 Close on Escape + Focus Trap - FIXED
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        stableOnClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Auto-focus close button
    closeButtonRef.current?.focus();
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stableOnClose]);

  // 🔑 Google Login Handler - 🔧 FIXED: Backend sync added
  const handleGoogleLogin = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, google);
      const user = result.user;
      
      if (!user) throw new Error("No user data received");

      // 🔧 ADDED: Backend sync (same as Signinpopup)
      const firebaseIdToken = await user.getIdToken();
      localStorage.setItem('firebaseIdToken', firebaseIdToken);

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
        
        toast.success(`Welcome back, ${user.displayName || "User"}! 👋`);
      } catch (dbError) {
        console.error("MongoDB Sync Error:", dbError);
        toast.success("Logged in! (Profile sync pending)");
      }

      stableOnClose();
    } catch (error) {
      console.error("Login Error:", error);
      
      const errorMessages = {
        'auth/popup-closed-by-user': "Sign-in cancelled.",
        'auth/cancelled-popup-request': "Multiple popups open.",
        'auth/network-request-failed': "Check your internet connection.",
        'auth/invalid-credential': "Invalid credentials.",
        'auth/account-disabled': "Account has been disabled."
      };
      
      toast.error(errorMessages[error.code] || "Google login failed.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, stableOnClose]);

  // 🍎 Apple Login Handler
  const handleAppleLogin = useCallback(() => {
    toast.info("Apple login coming soon! 🍎");
  }, []);

  // 📘 Facebook Login Handler
  const handleFacebookLogin = useCallback(() => {
    toast.info("Facebook login coming soon! 📘");
  }, []);

  // 🔄 Toggle handlers
  const handleShowLogin = useCallback(() => {
    setShowSignin(false);
    setShowLogin(true);
  }, []);

  const handleShowSignin = useCallback((e) => {
    e.preventDefault();
    setShowLogin(false);
    setShowSignin(true);
  }, []);

  // 🔧 FIXED: Backdrop click handler
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      stableOnClose();
    }
  }, [stableOnClose]);

  if (!isOpen) return null;

  const popupContent = (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-md bg-white shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto border border-slate-100"
      >
        {/* 🔧 FIXED: Better close button with icon */}
        <button
          ref={closeButtonRef}
          onClick={stableOnClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all z-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          aria-label="Close popup"
        >
          <FaTimes size={20} />
        </button>

        <div className="p-6 md:p-8">
          {/* 🔧 FIXED: Emerald gradient */}
          <h2 
            id="login-title"
            className="text-3xl font-black text-center bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-transparent bg-clip-text mb-2"
          >
            Welcome Back
          </h2>
          <p className="text-center text-slate-500 mb-8 text-sm font-medium">
            Sign in to continue to <span className="font-bold text-emerald-600">USP</span>
          </p>
    
          {/* Social Login Buttons */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-emerald-500 py-3.5 rounded-xl text-slate-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
            >
              {isLoading ? (
                <FaSpinner className="animate-spin text-emerald-600" size={22} />
              ) : (
                <FcGoogle size={22} className="group-hover:scale-110 transition-transform" />
              )}
              <span className="text-sm font-semibold">
                {isLoading ? "Signing in..." : "Login with Google"}
              </span>
            </button>

            <button 
              onClick={handleAppleLogin}
              className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 border-2 border-slate-900 py-3.5 rounded-xl text-white transition-all shadow-sm hover:shadow-md group active:scale-[0.98]"
            >
              <FaApple size={22} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">Login with Apple</span>
            </button>

            <button 
              onClick={handleFacebookLogin}
              className="flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] border-2 border-[#1877F2] py-3.5 rounded-xl text-white transition-all shadow-sm hover:shadow-md group active:scale-[0.98]"
            >
              <FaFacebook size={22} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">Login with Facebook</span>
            </button>

            {/* OR Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500 font-medium">OR</span>
              </div>
            </div>

            {/* Email/Phone Login */}
            <button
              onClick={handleShowLogin}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 py-3.5 rounded-xl text-white transition-all shadow-md hover:shadow-lg font-semibold active:scale-[0.98]"
            >
              <span className="text-sm">Login with Email & Phone</span>
            </button>

            {/* Nested Login Component */}
            {showLogin && (
              <div className="mt-4 animate-in slide-in-from-top-2">
                <Login onClose={() => setShowLogin(false)} />
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="mt-8 text-sm text-center text-slate-600">
            New on <span className="font-bold text-emerald-600">USP</span>?{" "}
            <button
              onClick={handleShowSignin}
              className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              Sign up
            </button>
          </p>

          {/* Nested Signin Component */}
          {showSignin && (
            <div className="mt-4 animate-in slide-in-from-top-2">
              <Signinpopup 
                onClose={() => setShowSignin(false)} 
                isOpen={showSignin}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
}