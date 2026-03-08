import React, { useState, useEffect, useCallback, useRef } from "react";
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

  const registerInBackend = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      await axios.post(`${API_BASE_URL}/auth/register`, {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.log("Backend register error:", err.message);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      await registerInBackend(result.user);
      toast.success("Welcome back! Login successful.");
      onClose();
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, google);
      await registerInBackend(result.user);
      toast.success("Google login successful.");
      onClose();
      navigate("/");
    } catch (error) {
      toast.error("Google login failed");
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
            <button onClick={handleGoogleLogin} className="w-full bg-white border-2 border-slate-200 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-emerald-500 transition-all">
              <FcGoogle size={22} /> Login with Google
            </button>
            <button onClick={() => setLoginMethod("email")} className="w-full bg-slate-100 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-50 text-slate-700 transition-all">
              <FaEnvelope className="text-emerald-600" /> Use Email Address
            </button>
            <button onClick={() => setLoginMethod("phone")} className="w-full bg-slate-100 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-50 text-slate-700 transition-all">
              <FaPhone className="text-emerald-600" /> Use Phone Number
            </button>
          </div>
        ) : loginMethod === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-4 animate-in slide-in-from-right-4">
            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl outline-none" required />
            </div>
            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl outline-none" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <FaEyeSlash /> : <FaEye />}</button>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all">{loading ? <FaSpinner className="animate-spin" /> : "LOG IN"}</button>
            <button type="button" onClick={() => setLoginMethod("social")} className="w-full text-slate-400 text-xs font-bold uppercase py-2">← Back to Options</button>
          </form>
        ) : (
          <div className="animate-in slide-in-from-right-4">
            <PhoneLogin onAuthSuccess={onClose} />
            <button onClick={() => setLoginMethod("social")} className="w-full text-slate-400 text-xs font-bold uppercase py-4">← Back to Options</button>
          </div>
        )}

        <p className="mt-8 text-sm text-center text-slate-600">
          New on Rezon? <button onClick={() => setShowSignin(true)} className="text-emerald-600 font-bold hover:underline">Sign Up</button>
        </p>

        {showSignin && <Signinpopup onClose={() => setShowSignin(false)} isOpen={showSignin} onSwitchToLogin={() => setShowSignin(false)} />}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}