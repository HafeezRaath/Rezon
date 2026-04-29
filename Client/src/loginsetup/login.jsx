import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash, FaSpinner, FaTimes, FaEnvelope, FaPhone, FaLock, FaApple, FaFacebook } from "react-icons/fa";
import { auth, google } from "../firebase.config";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import toast from "react-hot-toast";
import axios from "axios";
import Signinpopup from "./Signinpopup";
import PhoneLogin from "./PhoneLogin";

const API_BASE_URL = "https://rezon.up.railway.app/api";

export default function LoginPopup({ onClose, isOpen }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState("social"); // social | email | phone
  const [showSignin, setShowSignin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = 'unset'; };
    }
  }, [isOpen]);

  // 🔥 FIXED: Backend sync function - EXACTLY like Signinpopup
  const syncUserToBackend = async (firebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken(true);
      
      // 🔥 Store token in localStorage (like Signinpopup does)
      localStorage.setItem("firebaseIdToken", idToken);

      // 🔥 Send EXACT same data as Signinpopup
      await axios.post(`${API_BASE_URL}/register`, {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Rezon User",
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        provider: firebaseUser.providerData?.[0]?.providerId || "password"
      }, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json"
        }
      });

      console.log("✅ User synced to backend successfully");
      return true;

    } catch (err) {
      // 🔥 Same error handling as Signinpopup - don't fail login if backend sync fails
      console.error("Backend sync error:", err.response?.data || err.message);
      // User is still logged in via Firebase, backend sync is best-effort
      return false;
    }
  };

  // 🔥 FIXED: Email login with backend sync
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Logging in...");

    try {
      // Step 1: Firebase Authentication
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = result.user;

      if (!firebaseUser) throw new Error("Login failed - no user data");

      // Step 2: Sync to backend (same as Signinpopup)
      await syncUserToBackend(firebaseUser);

      toast.success("Welcome back! Login successful.", { id: toastId });
      onClose();
      navigate("/");

    } catch (error) {
      console.error("Email login error:", error);
      
      const errorMessages = {
        "auth/user-not-found": "No account found with this email. Please sign up first.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/invalid-credential": "Invalid email or password.",
        "auth/invalid-email": "Invalid email address.",
        "auth/user-disabled": "This account has been disabled.",
        "auth/too-many-requests": "Too many failed attempts. Please try again later.",
      };

      toast.error(errorMessages[error.code] || error.message || "Login failed", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FIXED: Google login with backend sync (matches Signinpopup exactly)
  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    const toastId = toast.loading("Connecting to Google...");

    try {
      const result = await signInWithPopup(auth, google);
      const firebaseUser = result.user;

      if (!firebaseUser) throw new Error("No user data from Google");

      // 🔥 Sync to backend (same pattern as Signinpopup)
      await syncUserToBackend(firebaseUser);

      toast.success(`Welcome ${firebaseUser.displayName || "User"}! 🎉`, { id: toastId });
      onClose();
      navigate("/");

    } catch (error) {
      console.error("Google login error:", error);

      const errorMessages = {
        "auth/popup-closed-by-user": "Sign-in cancelled.",
        "auth/popup-blocked": "Popup blocked! Please allow popups.",
        "auth/network-request-failed": "Network error. Check your connection.",
        "auth/cancelled-popup-request": "Sign-in cancelled.",
      };

      toast.error(errorMessages[error.code] || "Google login failed", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md bg-white shadow-2xl rounded-3xl p-6 md:p-8 border-t-8 border-emerald-600 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-all text-xl">
          <FaTimes />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white text-2xl font-black">R</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800">Welcome Back</h2>
          <p className="text-slate-500 text-sm">Continue with <span className="text-emerald-600 font-bold">Rezon</span></p>
        </div>

        {loginMethod === "social" ? (
          <div className="space-y-3">
            <button 
              onClick={handleGoogleLogin} 
              disabled={loading}
              className="w-full bg-white border-2 border-slate-200 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-emerald-500 transition-all disabled:opacity-50"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FcGoogle size={22} />}
              {loading ? "Connecting..." : "Login with Google"}
            </button>
            <button 
              onClick={() => setLoginMethod("email")} 
              className="w-full bg-slate-100 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-50 text-slate-700 transition-all"
            >
              <FaEnvelope className="text-emerald-600" /> Use Email Address
            </button>
            <button 
              onClick={() => setLoginMethod("phone")} 
              className="w-full bg-slate-100 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-50 text-slate-700 transition-all"
            >
              <FaPhone className="text-emerald-600" /> Use Phone Number
            </button>
          </div>
        ) : loginMethod === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-4 animate-in slide-in-from-right-4">
            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="email" 
                placeholder="Email address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full p-4 pl-12 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl outline-none" 
                required 
              />
            </div>
            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full p-4 pl-12 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl outline-none" 
                required 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              {loading ? <FaSpinner className="animate-spin mx-auto" /> : "LOG IN"}
            </button>
            <button 
              type="button" 
              onClick={() => setLoginMethod("social")} 
              className="w-full text-slate-400 text-xs font-bold uppercase py-2 hover:text-slate-600"
            >
              ← Back to Options
            </button>
          </form>
        ) : (
          <div className="animate-in slide-in-from-right-4">
            <PhoneLogin onAuthSuccess={onClose} />
            <button 
              onClick={() => setLoginMethod("social")} 
              className="w-full text-slate-400 text-xs font-bold uppercase py-4 hover:text-slate-600"
            >
              ← Back to Options
            </button>
          </div>
        )}

        <p className="mt-8 text-sm text-center text-slate-600">
          New on Rezon?{" "}
          <button 
            onClick={() => setShowSignin(true)} 
            className="text-emerald-600 font-bold hover:underline"
          >
            Sign Up
          </button>
        </p>

        {showSignin && (
          <Signinpopup 
            onClose={() => setShowSignin(false)} 
            isOpen={showSignin} 
            onSwitchToLogin={() => setShowSignin(false)} 
          />
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}