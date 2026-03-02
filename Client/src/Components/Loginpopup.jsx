import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebook } from "react-icons/fa";
import Signinpopup from "./Signinpopup";
import Login from "../loginsetup/login";

export default function LoginPopup({ onClose }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignin, setShowSignin] = useState(false);


  return (
    <div className="fixed inset-0 bg-dark bg-opacity-20 backdrop-blur-sm z-50 flex items-center justify-center">

      <div className="relative w-full max-w-md bg-white bg-opacity-20 backdrop-blur-md shadow-2xl rounded-2xl mx-4 my-2 p-6 md:p-8  overflow-y-auto border-[3px] border-white">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-pink-600 hover:text-yellow-200 text-xl font-bold"
        >
          &times;
        </button>

        {/* Gradient Heading */}
        <h2 className="text-3xl font-extrabold text-center bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-transparent bg-clip-text drop-shadow-lg mb-6">
          Welcome Back To <b>USP</b>
        </h2>
 
        {/* Social Login Buttons */}
        <div className="flex flex-col gap-4">
          <button className="flex items-center justify-center gap-3 bg-white hover:bg-yellow-200 border-2 border-pink-600 py-3 rounded-xl text-black transition-all drop-shadow">
            <FcGoogle size={22} />
            <span className="text-sm font-medium">Login with Google</span>
          </button>

          <button className="flex items-center justify-center gap-3 bg-white hover:bg-yellow-200 border-2 border-red-500 py-3 rounded-xl text-black transition-all drop-shadow">
            <FaApple size={22} />
            <span className="text-sm font-medium">Login with Apple</span>
          </button>

          <button className="flex items-center justify-center gap-3 bg-white hover:bg-yellow-200 border-2 border-orange-500 py-3 rounded-xl text-black transition-all drop-shadow">
            <FaFacebook size={22} />
            <span className="text-sm font-medium">Login with Facebook</span>
          </button>

          {/* OR Divider */}
          <div className="text-center my-4">
            <span className="font-semibold text-pink-600">OR</span>
          </div>

          {/* Email/Phone Login */}
          <button
            onClick={() => setShowLogin(true)}
            className="flex items-center justify-center gap-3 bg-white hover:bg-yellow-200 border-2 border-pink-600 py-3 rounded-xl text-black transition-all drop-shadow"
          >
            <span className="text-sm font-medium">
              Login with Email & Phone Number
            </span>
          </button>

          {showLogin && (
            <Login onClose={() => setShowLogin(false)} />
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-sm text-center text-pink-600">
  New on <b>USP</b>?{" "}
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

{showSignin && (
  <Signinpopup onClose={() => setShowSignin(false)} />
)}

      </div>
    </div>
  );
}
