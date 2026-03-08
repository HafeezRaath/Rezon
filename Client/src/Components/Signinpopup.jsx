import React, { useState, useEffect, useCallback, useRef } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebook, FaSpinner, FaTimes } from "react-icons/fa";
import Signin from "../loginsetup/signnumber";
import axios from "axios";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { auth } from "../firebase.config";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// 🔧 FIXED: Space removed
const API_BASE_URL = "https://rezon.up.railway.app/api";

const Signinpopup = ({ onClose, isOpen, onSwitchToLogin }) => {
  const [showSignin, setShowSignin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // 🔧 FIXED: Stable callback references
  const stableOnClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const stableOnSwitchToLogin = useCallback(() => {
    onSwitchToLogin?.();
  }, [onSwitchToLogin]);

  // Prevent background scroll - 🔧 FIXED: Proper cleanup
  useEffect(() => {
    if (!isOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  // 🔧 FIXED: Focus trap and escape key
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

    // Focus close button on open
    closeButtonRef.current?.focus();
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stableOnClose]);

  // Google Sign In Handler - 🔧 FIXED: Dependencies
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
        
        toast.success(`Welcome ${user.displayName || "User"}! 🎉`);
      } catch (dbError) {
        console.error("MongoDB Sync Error:", dbError);
        toast.success("Logged in! (Profile sync pending)");
      }

      stableOnClose();
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      
      const errorMessages = {
        'auth/popup-closed-by-user': "Sign-in cancelled.",
        'auth/popup-blocked': "Popup blocked! Please allow popups.",
        'auth/account-exists-with-different-credential': "Account exists with different login method.",
        'auth/network-request-failed': "Network error. Check your connection.",
        'auth/invalid-credential': "Invalid credentials. Try again."
      };
      
      toast.error(errorMessages[error.code] || "Google Sign-In failed.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, stableOnClose]);

  // Placeholder handlers
  const handleAppleSignIn = useCallback(() => {
    toast.info("Apple Sign-in coming soon! 🍎");
  }, []);

  const handleFacebookSignIn = useCallback(() => {
    toast.info("Facebook Sign-in coming soon! 📘");
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
    if (stableOnSwitchToLogin) {
      stableOnSwitchToLogin();
    } else {
      stableOnClose();
    }
  }, [stableOnSwitchToLogin, stableOnClose]);

  // 🔧 FIXED: Backdrop click handler
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      stableOnClose();
    }
  }, [stableOnClose]);

  if (!isOpen) return null;

  const popupContent = (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4 z-[1000] animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
    >
      <div className="relative w-full max-w-[500px]" ref={modalRef}>
        {/* 🔧 FIXED: Better close button with icon */}
        <button
          ref={closeButtonRef}
          onClick={stableOnClose}
          className="absolute -top-12 right-0 text-white hover:text-rose-400 transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full p-1"
          aria-label="Close popup"
        >
          <FaTimes size={28} />
        </button>

        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto">
          <h2 
            id="signup-title"
            className="text-3xl font-black text-center bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-transparent bg-clip-text mb-1 pt-2"
          >
            USP
          </h2>
          <h4 className="text-lg md:text-xl font-bold text-center text-emerald-600 mb-6">
            Create a New Account on <span className="font-black">USP</span>
          </h4>

          <div className="flex flex-col gap-3">
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-emerald-500 py-3.5 rounded-xl text-slate-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <FaSpinner className="animate-spin text-emerald-600" size={22} />
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
              className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 border-2 border-slate-900 py-3.5 rounded-xl text-white transition-all shadow-sm hover:shadow-md group"
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
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500 font-medium">OR</span>
              </div>
            </div>

            {/* Phone Sign In */}
            <button
              onClick={handleShowPhoneSignin}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 py-3.5 rounded-xl text-white transition-all shadow-md hover:shadow-lg font-semibold active:scale-[0.98]"
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
            <p className="text-xs text-center text-slate-500 leading-relaxed">
              By creating an account, you agree to USP's{" "}
              <a href="/terms" className="text-emerald-600 hover:underline font-medium">Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" className="text-emerald-600 hover:underline font-medium">Privacy Policy</a>
            </p>
            
            <p className="text-sm text-center text-slate-600">
              Already have an account?{" "}
              <button
                onClick={handleLoginClick}
                className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
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