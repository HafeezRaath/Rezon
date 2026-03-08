import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash, FaSpinner, FaTimes, FaEnvelope, FaPhone, FaLock } from "react-icons/fa";
import Signinpopup from "../Components/Signinpopup";
import PhoneLogin from "../Components/PhoneLogin";
import { auth, google } from "../firebase.config";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import toast from "react-hot-toast";
import axios from "axios";

// 🔧 API Config
const API_BASE_URL = "https://rezon.up.railway.app/api";

export default function LoginPopup({ onClose, isOpen, onSwitchToSignin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState("email");
  const [showSignin, setShowSignin] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();

  // Prevent scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = 'unset'; };
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // 🔧 FIXED: Register user in backend after Firebase login
  const registerInBackend = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      await axios.post(`${API_BASE_URL}/register`, {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email: firebaseUser.email
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.log("Backend register error (might already exist):", err.message);
    }
  };

  const handleEmailLogin = useCallback(async (e) => {
    e.preventDefault();
    
    if (!email.trim() || !password) {
      toast.error("Please fill in all fields!");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      if (result.user) {
        const token = await result.user.getIdToken();
        localStorage.setItem('firebaseIdToken', token);
        
        // 🔧 Register in backend
        await registerInBackend(result.user);
        
        toast.success("Welcome back! Login successful.");
        onClose();
        navigate("/");
      }
    } catch (error) {
      console.error("Login Error:", error);
      
      let errorMessage = "Login failed. Please try again.";
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password. Please try again.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Invalid email address format.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        default:
          errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [email, password, onClose, navigate]);

  const handleGoogleLogin = useCallback(async () => {
    if (googleLoading) return;
    
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, google);
      
      if (result.user) {
        const token = await result.user.getIdToken();
        localStorage.setItem('firebaseIdToken', token);
        
        // 🔧 Register in backend
        await registerInBackend(result.user);
        
        toast.success("Welcome! Google login successful.");
        onClose();
        navigate("/");
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      
      let errorMessage = "Google login failed.";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Login cancelled.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "Popup blocked! Please allow popups for this site.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = "An account already exists with this email using a different method.";
      }
      
      toast.error(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading, onClose, navigate]);

  const handleFinalSuccess = useCallback((userData) => {
    toast.success("Login successful!");
    onClose();
    navigate("/");
  }, [onClose, navigate]);

  const handleShowSignin = useCallback(() => {
    if (onSwitchToSignin) {
      onSwitchToSignin();
    } else {
      setShowSignin(true);
    }
  }, [onSwitchToSignin]);

  const handleCloseSignin = useCallback(() => {
    setShowSignin(false);
  }, []);

  const switchMethod = useCallback((method) => {
    setLoginMethod(method);
    if (method === "phone") {
      setEmail("");
      setPassword("");
    }
  }, []);

  if (!isOpen) return null;

  // 🎨 FIXED: Emerald + Slate Theme
  const modalContent = (
    <div 
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md bg-white shadow-2xl rounded-2xl p-6 md:p-8 border-t-4 border-emerald-600 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-all text-xl"
          aria-label="Close"
        >
          <FaTimes />
        </button>

        {/* 🎨 FIXED: Emerald Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white text-2xl font-black">R</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800">
            Welcome to <span className="text-emerald-600">Rezon</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">Login to continue buying & selling</p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex mb-6 bg-slate-100 p-1 rounded-xl">
          {["email", "phone"].map((method) => (
            <button
              key={method}
              onClick={() => switchMethod(method)}
              className={`flex-1 py-2.5 rounded-lg capitalize font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                loginMethod === method
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {method === "email" ? <FaEnvelope size={14} /> : <FaPhone size={14} />}
              {method === "email" ? "Email" : "Phone"}
            </button>
          ))}
        </div>

        {loginMethod === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 pl-12 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl outline-none transition-all"
                required
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 pl-12 pr-12 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl outline-none transition-all"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>

            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => toast.info("Password reset coming soon!")}
                className="text-xs text-emerald-600 font-semibold hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Logging in...
                </>
              ) : (
                "LOG IN"
              )}
            </button>

            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="px-4 text-slate-400 text-xs font-bold uppercase">Or</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full bg-white border-2 border-slate-200 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
            >
              {googleLoading ? (
                <FaSpinner className="animate-spin text-slate-600" />
              ) : (
                <FcGoogle size={22} />
              )}
              <span className="text-slate-700">
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </span>
            </button>
          </form>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <PhoneLogin onAuthSuccess={handleFinalSuccess} />
          </div>
        )}

        <p className="mt-8 text-sm text-center text-slate-600">
          Don't have an account?{" "}
          <button
            onClick={handleShowSignin}
            className="text-emerald-600 font-bold hover:underline underline-offset-4 transition-colors"
          >
            Sign Up
          </button>
        </p>

        {/* Signin Modal */}
        {showSignin && (
          <Signinpopup 
            onClose={handleCloseSignin} 
            isOpen={showSignin}
            onSwitchToLogin={() => setShowSignin(false)}
          />
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}