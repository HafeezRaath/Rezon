import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash, FaSpinner, FaTimes } from "react-icons/fa";
import Signinpopup from "../Components/Signinpopup";
import PhoneLogin from "../Components/PhoneLogin";
import { auth, google } from "../firebase.config";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import toast from "react-hot-toast";

export default function LoginPopup({ onClose, isOpen, onSwitchToSignin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState("email");
  const [showSignin, setShowSignin] = useState(false);
  
  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();

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

  // Email/Password Login
  const handleEmailLogin = useCallback(async (e) => {
    e.preventDefault();
    
    if (!email.trim() || !password) {
      toast.error("Please fill in all fields!");
      return;
    }

    // Email validation
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

  // Google Login
  const handleGoogleLogin = useCallback(async () => {
    if (googleLoading) return;
    
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, google);
      
      if (result.user) {
        const token = await result.user.getIdToken();
        localStorage.setItem('firebaseIdToken', token);
        
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
    // Clear fields when switching
    if (method === "phone") {
      setEmail("");
      setPassword("");
    }
  }, []);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-[450px] bg-white shadow-2xl rounded-3xl p-6 md:p-8 border-t-4 border-pink-600 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-pink-600 transition-all text-xl"
          aria-label="Close"
        >
          <FaTimes />
        </button>

        <h2 className="text-3xl font-black text-center bg-gradient-to-r from-orange-500 via-pink-600 to-purple-600 text-transparent bg-clip-text mb-2">
          Rezon Login
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">Welcome back! Please login to continue</p>

        {/* Toggle Buttons */}
        <div className="flex mb-6 bg-gray-100 p-1 rounded-2xl">
          {["email", "phone"].map((method) => (
            <button
              key={method}
              onClick={() => switchMethod(method)}
              className={`flex-1 py-2.5 rounded-xl capitalize font-bold text-sm transition-all ${
                loginMethod === method
                  ? "bg-white text-pink-600 shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {method === "email" ? "Email" : "Phone"}
            </button>
          ))}
        </div>

        {loginMethod === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-pink-500 focus:bg-white rounded-2xl outline-none transition-all"
                required
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-pink-500 focus:bg-white rounded-2xl outline-none transition-all pr-12"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>

            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => toast.info("Password reset coming soon!")}
                className="text-xs text-pink-600 font-semibold hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 text-white py-4 rounded-2xl font-black shadow-lg hover:shadow-pink-200 hover:bg-pink-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="px-4 text-gray-400 text-xs font-bold uppercase tracking-widest">Or</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full bg-white border-2 border-gray-200 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
            >
              {googleLoading ? (
                <FaSpinner className="animate-spin text-gray-600" />
              ) : (
                <FcGoogle size={22} />
              )}
              <span className="text-gray-700">
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </span>
            </button>
          </form>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <PhoneLogin onAuthSuccess={handleFinalSuccess} />
          </div>
        )}

        <p className="mt-8 text-sm text-center text-gray-600">
          Don't have an account?{" "}
          <button
            onClick={handleShowSignin}
            className="text-pink-600 font-black hover:underline underline-offset-4 transition-colors"
          >
            Sign Up
          </button>
        </p>

        {/* Signin Modal */}
        {showSignin && (
          <Signinpopup 
            onClose={handleCloseSignin} 
            isOpen={showSignin}
            onSwitchToLogin={() => {
              setShowSignin(false);
            }}
          />
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}