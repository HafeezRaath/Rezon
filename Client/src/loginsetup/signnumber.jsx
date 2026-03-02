import React, { useState } from 'react';
import { CgSpinner } from 'react-icons/cg';
import OTPInput from 'react-otp-input';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { auth } from '../firebase.config';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

export default function Signin({ onClose }) {
  const [otp, setOtp] = useState('');
  const [ph, setPh] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [userData, setUserData] = useState(null);

  function onCaptchVerify() {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { onSignup(); }
      });
    }
  }

  function onSignup() {
    setLoading(true);
    onCaptchVerify();
    const appVerifier = window.recaptchaVerifier;
    const formatPh = '+' + ph;

    signInWithPhoneNumber(auth, formatPh, appVerifier)
      .then((confirmationResult) => {
        window.confirmationResult = confirmationResult;
        setLoading(false);
        setShowOTP(true);
        toast.success('OTP sent successfully!');
      })
      .catch((error) => {
        toast.error('Failed to send OTP');
        setLoading(false);
      });
  }

  function onOTPVerify() {
    setLoading(true);
    window.confirmationResult.confirm(otp)
      .then(async (res) => {
        setUserData(res.user);
        setShowOTP(false);
        setShowPasswordStep(true); // OTP verify hone par password mangen
        setLoading(false);
        toast.success('Phone verified! Now set a password.');
      })
      .catch(() => {
        toast.error('Invalid OTP');
        setLoading(false);
      });
  }

  const handleFinalSubmit = async () => {
    if (password.length < 6) return toast.error("Password kam se kam 6 digits ka ho");
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/api/users/register", {
        uid: userData.uid,
        phoneNumber: userData.phoneNumber,
        password: password,
        name: "New User", // Aap name input bhi le sakte hain
        email: `${userData.uid}@rezon.com` // Temporary email agar na ho
      });
      
      if (response.data.success) {
        toast.success("Registration Complete!");
        onClose();
      }
    } catch (err) {
      toast.error("Database registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white bg-opacity-40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-black rounded-xl p-6 shadow-2xl relative border border-pink-600">
        <button onClick={onClose} className="absolute top-2 right-2 text-white hover:text-pink-500 text-2xl">&times;</button>
        <Toaster />
        <div id="recaptcha-container"></div>

        <h2 className="text-2xl font-bold text-center text-pink-500 mb-6">Join Rezon</h2>

        {!showPasswordStep ? (
          showOTP ? (
            <div className='flex flex-col items-center'>
              <label className="text-white mb-4">Enter 6-digit OTP</label>
              <OTPInput
                value={otp}
                onChange={setOtp}
                numInputs={6}
                renderInput={(props) => <input {...props} className="!w-12 h-12 bg-gray-800 text-white border border-pink-500 rounded mx-1 text-center text-xl" />}
              />
              <button onClick={onOTPVerify} className="w-full mt-6 py-3 bg-pink-600 text-white rounded-lg font-bold">
                {loading && <CgSpinner className="animate-spin inline mr-2" />} Verify OTP
              </button>
            </div>
          ) : (
            <div>
              <label className="text-white mb-2 block">Phone Number</label>
              <PhoneInput country={'pk'} value={ph} onChange={setPh} inputClass="!w-full !h-12 !text-black" />
              <button onClick={onSignup} className="w-full mt-6 py-3 bg-pink-600 text-white rounded-lg font-bold">
                {loading && <CgSpinner className="animate-spin inline mr-2" />} Send OTP
              </button>
            </div>
          )
        ) : (
          <div>
            <label className="text-white mb-2 block">Set Your Password</label>
            <input 
              type="password" 
              placeholder="Min 6 characters" 
              className="w-full p-3 bg-gray-800 text-white border border-pink-500 rounded-lg outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleFinalSubmit} className="w-full mt-6 py-3 bg-green-600 text-white rounded-lg font-bold">
              {loading && <CgSpinner className="animate-spin inline mr-2" />} Complete Signup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}