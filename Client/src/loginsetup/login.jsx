import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Signinpopup from "../Components/Signinpopup";
import PhoneLogin from "../Components/PhoneLogin"; // Import the new component

export default function LoginPopup({ onClose }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState("email");
  const [showSignin, setShowSignin] = useState(false);
  const navigate = useNavigate();

  const handleFinalSuccess = (userData) => {
    console.log("Authenticated User:", userData);
    onClose();
    navigate("/dashboard");
  };

  return (
    <div className="fixed inset-0 bg-white bg-opacity-30 backdrop-blur-sm z-50 flex items-center justify-center ">
      <div className="relative w-full max-w-[500px] bg-opacity-20 backdrop-blur-md shadow-2xl rounded-2xl mx-4 my-8 p-6 md:p-8 border-[3px] border-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-pink-600 hover:text-yellow-200 text-xl font-bold"
        >
          &times;
        </button>

        {/* Gradient Heading */}
        <h2 className="text-3xl font-extrabold text-center bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-transparent bg-clip-text drop-shadow-lg mb-6">
          Log in to <b>Rezon</b>
        </h2>

        {/* Toggle Buttons */}
        <div className="flex mb-6 space-x-4 justify-center">
          {["email", "phone"].map((method) => (
            <button
              key={method}
              onClick={() => setLoginMethod(method)}
              className={`px-6 py-2 rounded-full border-2 transition-all capitalize font-semibold ${
                loginMethod === method
                  ? "border-pink-600 bg-white text-black shadow-inner"
                  : "border-pink-600 text-pink-600 hover:bg-yellow-200"
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        {/* Dynamic Content Based on Method */}
        {loginMethod === "email" ? (
          <>
            {/* Email Input */}
            <input
              type="email"
              placeholder="Email address"
              className="w-full mb-4 p-3 border-2 border-pink-600 rounded-lg focus:outline-none placeholder-gray-500 bg-white text-black"
            />

            {/* Password Field */}
            <div className="relative mb-4">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full p-3 border-2 border-pink-600 rounded-lg focus:outline-none placeholder-gray-500 bg-white text-black"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-sm cursor-pointer font-semibold text-pink-600 hover:text-yellow-200"
              >
                {showPassword ? "Hide" : "Show"}
              </span>
            </div>

            {/* Remember Me and Forgot */}
            <div className="flex justify-between items-center mb-6 text-sm">
              <label className="flex items-center space-x-2 text-black">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="font-semibold text-pink-600 hover:text-yellow-200">
                Forgot password?
              </a>
            </div>

            {/* Login Button for Email */}
            <button className="w-full bg-white border-2 border-pink-600 text-black py-3 rounded-lg font-bold hover:bg-yellow-200 transition-all drop-shadow">
              Log in
            </button>
          </>
        ) : (
          /* Phone OTP Component */
          <PhoneLogin onAuthSuccess={handleFinalSuccess} />
        )}

        {/* Sign Up Link */}
        <p className="mt-6 text-sm text-center text-pink-600">
          Don’t have an account?{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setShowSignin(true);
            }}
            className="font-semibold hover:text-yellow-200 hover:underline"
          >
            Sign up
          </a>
        </p>

        {showSignin && <Signinpopup onClose={() => setShowSignin(false)} />}
      </div>
    </div>
  );
}