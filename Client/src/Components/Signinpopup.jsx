import React, { useState, useEffect, useCallback, useRef } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebook, FaSpinner, FaTimes } from "react-icons/fa";
import Signin from "../loginsetup/signnumber";
import axios from "axios";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { auth } from "../firebase.config";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const API_BASE_URL = "https://rezon.up.railway.app/api";

const Signinpopup = ({ onClose, isOpen, onSwitchToLogin }) => {

  const [showSignin, setShowSignin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  const stableOnClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const stableOnSwitchToLogin = useCallback(() => {
    onSwitchToLogin?.();
  }, [onSwitchToLogin]);

  useEffect(() => {
    if (!isOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        stableOnClose();
      }
    };

    closeButtonRef.current?.focus();

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, stableOnClose]);

  // ✅ GOOGLE LOGIN
  const handleGoogleSignIn = useCallback(async () => {

    if (isLoading) return;

    setIsLoading(true);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user) throw new Error("No user data");

      const firebaseIdToken = await user.getIdToken();
      localStorage.setItem("firebaseIdToken", firebaseIdToken);

      // 🔥 FIXED MONGODB SYNC
      try {

        await axios.post(`${API_BASE_URL}/register`, {

          uid: user.uid,
          name: user.displayName || user.email?.split("@")[0] || "Rezon User",
          email: user.email,
          photoURL: user.photoURL,
          provider: "google"

        }, {
          headers: {
            Authorization: `Bearer ${firebaseIdToken}`,
            "Content-Type": "application/json"
          }
        });

        toast.success(`Welcome ${user.displayName || "User"}! 🎉`);

      } catch (dbError) {

        console.error(
          "MongoDB Sync Error:",
          dbError.response?.data || dbError.message
        );

        toast.success("Logged in successfully!");

      }

      stableOnClose();

    } catch (error) {

      console.error("Google Sign-In Error:", error);

      const errorMessages = {
        "auth/popup-closed-by-user": "Sign-in cancelled.",
        "auth/popup-blocked": "Popup blocked! Please allow popups.",
        "auth/network-request-failed": "Network error.",
      };

      toast.error(errorMessages[error.code] || "Google login failed");

    } finally {

      setIsLoading(false);

    }

  }, [isLoading, stableOnClose]);

  const handleAppleSignIn = () => {
    toast("Apple login coming soon 🍎");
  };

  const handleFacebookSignIn = () => {
    toast("Facebook login coming soon 📘");
  };

  const handleShowPhoneSignin = () => {
    setShowSignin(true);
  };

  const handleClosePhoneSignin = () => {
    setShowSignin(false);
  };

  if (!isOpen) return null;

  const popupContent = (

    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4 z-[1000]"
      onClick={(e) => {
        if (e.target === e.currentTarget) stableOnClose();
      }}
    >

      <div className="relative w-full max-w-[500px]" ref={modalRef}>

        <button
          ref={closeButtonRef}
          onClick={stableOnClose}
          className="absolute -top-12 right-0 text-white hover:text-rose-400"
        >
          <FaTimes size={28} />
        </button>

        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl">

          <h2 className="text-3xl font-black text-center text-emerald-600">
            USP
          </h2>

          <h4 className="text-lg text-center text-slate-600 mb-6">
            Create a New Account
          </h4>

          <div className="flex flex-col gap-3">

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 border py-3 rounded-xl"
            >
              {isLoading
                ? <FaSpinner className="animate-spin"/>
                : <FcGoogle size={22}/>
              }

              <span>
                {isLoading ? "Signing in..." : "Sign up with Google"}
              </span>
            </button>

            <button
              onClick={handleAppleSignIn}
              className="bg-black text-white py-3 rounded-xl"
            >
              <FaApple className="inline mr-2"/>
              Apple
            </button>

            <button
              onClick={handleFacebookSignIn}
              className="bg-blue-600 text-white py-3 rounded-xl"
            >
              <FaFacebook className="inline mr-2"/>
              Facebook
            </button>

            <button
              onClick={handleShowPhoneSignin}
              className="bg-emerald-500 text-white py-3 rounded-xl"
            >
              Sign up with Phone
            </button>

            {showSignin && (
              <Signin onClose={handleClosePhoneSignin}/>
            )}

          </div>

        </div>

      </div>

    </div>
  );

  return createPortal(popupContent, document.body);

};

export default Signinpopup;