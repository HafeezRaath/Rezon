import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebook } from "react-icons/fa";
import Signin from "../loginsetup/signnumber";
import axios from "axios"; // 🔑 Import Axios
import toast from "react-hot-toast";

// ✅ Import Firebase Auth
import { auth } from "../firebase.config";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const Signinpopup = ({ onClose }) => {
  const [showSignin, setShowSignin] = useState(false);

  // 🔑 Google Sign In Handler with MongoDB Sync
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account", 
      });

      // 1. Firebase Sign In
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log("✅ User signed in Firebase:", user);

      // 2. Firebase ID Token fetch karen
      const firebaseIdToken = await user.getIdToken();
      localStorage.setItem('firebaseIdToken', firebaseIdToken);
      
      // 🚀 3. NAYA: MongoDB mein User register/sync karen
      try {
        await axios.post("http://localhost:8000/api/register", {
          uid: user.uid,
          name: user.displayName,
          email: user.email
        });
        console.log("✅ User synced with MongoDB");
      } catch (dbError) {
        console.error("❌ MongoDB Sync Error:", dbError);
      }

      // 4. Local Storage mein user info save karen
      localStorage.setItem(
        "user",
        JSON.stringify({
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photo: user.photoURL,
        })
      );

      toast.success(`Welcome ${user.displayName}!`);
      onClose(); // Popup band karen
    } catch (error) {
      console.error("❌ Google Sign-In Error:", error.message);
      toast.error("Google Sign-In failed.");
    }
  };

  return (
    <div className="fixed inset-0 bg-white bg-opacity-30 backdrop-blur-sm flex items-center justify-center px-4">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-pink-600 hover:text-yellow-200 text-2xl font-bold z-10"
      >
        &times;
      </button>

      {/* Scrollable Inner Content (Aapka Pehla Design) */}
      <div className="">
        <h2 className="text-3xl font-extrabold text-center bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-transparent bg-clip-text mb-1 pt-3">
          <b>USP</b>
        </h2>
        <h4 className="text-xl font-bold text-center text-pink-600 mb-3">
          Create a New Account on <b>USP</b>
        </h4>

        <div className="flex flex-col gap-4">
          {/* ✅ Google Sign In Button with New Logic */}
          <button
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center gap-3 bg-white hover:bg-yellow-200 border-2 border-pink-600 py-3 rounded-xl text-black drop-shadow"
          >
            <FcGoogle size={22} />
            <span className="text-sm font-medium">SignUp with Google</span>
          </button>

          <button className="flex items-center justify-center gap-3 bg-white hover:bg-yellow-200 border-2 border-red-500 py-3 rounded-xl text-black drop-shadow">
            <FaApple size={22} />
            <span className="text-sm font-medium">SignUp with Apple</span>
          </button>

          <button className="flex items-center justify-center gap-3 bg-white hover:bg-orange-500 py-3 border-2 border-orange-500 rounded-xl text-black drop-shadow transition-all">
            <FaFacebook size={22} />
            <span className="text-sm font-medium">SignUp with Facebook</span>
          </button>

          {/* Divider */}
          <div className="text-center my-1">
            <span className="font-semibold text-pink-600">OR</span>
          </div>

          <button
            onClick={() => setShowSignin(true)}
            className="flex items-center justify-center gap-3 bg-white hover:bg-yellow-200 border-2 border-pink-600 py-3 rounded-xl text-black transition-all drop-shadow"
          >
            <span className="text-sm font-medium">
              Signin with Phone Number
            </span>
          </button>

          {showSignin && <Signin onClose={() => setShowSignin(false)} />}
        </div>

        {/* Footer */}
        <p className="mt-6 text-sm text-center text-pink-600">
          When creating a new account you agree to USP's Terms and Privacy Policy
        </p>
        <p className="mt-2 text-sm text-center text-pink-600 pb-4">
          Already have an account on <b>USP</b>?{" "}
          <a
            href="#"
            className="font-semibold hover:text-yellow-200 hover:underline"
          >
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signinpopup;