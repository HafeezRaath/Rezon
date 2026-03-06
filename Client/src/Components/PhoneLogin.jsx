import React, { useState } from "react";

export default function PhoneLogin({ onAuthSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phoneNumber || !password) {
      return alert("Phone aur Password dono lazmi hain!");
    }

    setLoading(true);
    try {
      // Backend Login API Call
      const response = await fetch("https://rezon.up.railway.app/api/users/login-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          password: password,
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        onAuthSuccess(data.user);
        alert("Khush amdeed! Login ho gaya.");
      } else {
        alert(data.message || "Login fail ho gaya.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("Server connection mein masla hai.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Phone Number Input */}
      <input
        type="tel"
        placeholder="Phone number (e.g. 03077850656)"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        className="w-full mb-4 p-3 border-2 border-pink-600 rounded-lg focus:outline-none bg-white text-black font-semibold"
      />

      {/* Password Input */}
      <input
        type="password"
        placeholder="Enter Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full mb-4 p-3 border-2 border-pink-600 rounded-lg focus:outline-none bg-white text-black font-semibold"
      />

      {/* Login Button */}
      <button
        onClick={handleLogin}
        disabled={loading}
        className={`w-full bg-white border-2 border-pink-600 text-black py-3 rounded-lg font-bold hover:bg-yellow-200 transition-all shadow-md ${
          loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {loading ? "Logging in..." : "Log in"}
      </button>
    </div>
  );
}