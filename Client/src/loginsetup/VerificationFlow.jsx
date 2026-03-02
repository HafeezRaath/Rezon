import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from "../firebase.config";
import { 
    FaPhone, 
    FaIdCard, 
    FaUserCheck, 
    FaLock, 
    FaCloudUploadAlt, 
    FaCamera,
    FaCheckCircle,
    FaShieldAlt,
    FaArrowRight,
    FaSpinner,
    FaTimes,
    FaRedo
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';

const VerificationFlow = ({ user, onClose, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [idFront, setIdFront] = useState(null);
    const [idBack, setIdBack] = useState(null);
    const [selfie, setSelfie] = useState(null);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const webcamRef = useRef(null);

    useEffect(() => {
        if (isPhoneVerified) setCurrentStep(2);
        if (idFront && idBack) setCurrentStep(3);
        if (selfie) setCurrentStep(4);
    }, [isPhoneVerified, idFront, idBack, selfie]);

    const handleSendOTP = async () => {
        if (!phone || phone.length < 10) return toast.error("Sahi mobile number darj karen");
        setLoading(true);
        try {
            if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
            const confirmation = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
            window.confirmationResult = confirmation;
            setIsOtpSent(true);
            toast.success("Verification code bhej diya gaya!");
        } catch (err) { 
            toast.error("Error: " + err.message); 
            if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
        }
        setLoading(false);
    };

    const handleVerifyOTP = async () => {
        if (!otp) return toast.error("Code darj karen");
        try {
            await window.confirmationResult.confirm(otp);
            setIsPhoneVerified(true);
            toast.success("Mobile number verify ho gaya!");
        } catch (err) { toast.error("Ghalat code"); }
    };

    const captureSelfie = () => {
        const imageSrc = webcamRef.current.getScreenshot();
        setSelfie(imageSrc);
        toast.success("Selfie capture ho gaya!");
    };

    const handleFinalSubmit = async () => {
        if (!isPhoneVerified) return toast.error("Pehle mobile verify karen");
        if (password !== confirmPassword) return toast.error("Password match nahi ho rahe");
        if (password.length < 6) return toast.error("Password kam az kam 6 characters ka ho");
        if (!idFront || !idBack) return toast.error("ID card ki dono sides upload karen");
        if (!selfie) return toast.error("Selfie lazmi hai");

        setLoading(true);
        const formData = new FormData();
        formData.append('idFront', idFront);
        formData.append('idBack', idBack);
        const selfieBlob = await fetch(selfie).then(r => r.blob());
        formData.append('liveSelfie', selfieBlob, 'selfie.jpg');
        formData.append('password', password);
        formData.append('phoneNumber', phone);
        formData.append('uid', user.uid);

        try {
            const res = await axios.post('http://localhost:5000/api/users/verify-identity', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                toast.success("Mubarak ho! Account verified ho gaya.");
                onComplete();
            }
        } catch (err) { 
            toast.error(err.response?.data?.message || "Verification fail ho gayi"); 
        }
        setLoading(false);
    };

    const StepIndicator = () => (
        <div className="flex items-center justify-between mb-8 px-2">
            {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold transition-all duration-300 ${
                        step <= currentStep ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-110' : 'bg-gray-200 text-gray-500'
                    }`}>
                        {step < currentStep ? <FaCheckCircle /> : step}
                    </div>
                    {step < 4 && (
                        <div className={`w-8 md:w-16 h-1 mx-1 md:mx-2 rounded-full transition-all duration-500 ${
                            step < currentStep ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-200'
                        }`} />
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-0 md:p-4 overflow-hidden">
            <div className="bg-white w-full max-w-6xl h-full md:h-auto md:max-h-[90vh] md:rounded-3xl shadow-2xl relative overflow-hidden flex flex-col animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white p-4 md:p-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                            <FaShieldAlt className="text-2xl text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">Identity Verification</h1>
                            <p className="text-xs md:text-sm text-gray-300">Secure your account in 4 simple steps</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <FaTimes className="text-xl" />
                    </button>
                </div>

                <Toaster position="top-center" />
                <div id="recaptcha-container"></div>

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto p-4 md:p-8">
                        <StepIndicator />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                            
                            {/* Step 1: Mobile */}
                            <div className={`bg-gray-50 rounded-2xl p-6 border-2 transition-all duration-300 ${
                                currentStep === 1 ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-lg' : 
                                isPhoneVerified ? 'border-green-500 bg-green-50/30' : 'border-gray-200 opacity-70'
                            }`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-3 rounded-xl ${isPhoneVerified ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
                                        <FaPhone className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">Mobile Number</h3>
                                        <p className="text-sm text-gray-500">SMS verification</p>
                                    </div>
                                    {isPhoneVerified && <FaCheckCircle className="text-green-500 text-2xl ml-auto" />}
                                </div>

                                <div className="space-y-3">
                                    <div className="relative">
                                        <input 
                                            type="tel" 
                                            disabled={isPhoneVerified}
                                            placeholder="03XX-XXXXXXX" 
                                            className="w-full p-4 pl-12 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                                            onChange={(e)=>setPhone(e.target.value)} 
                                            value={phone}
                                        />
                                        <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    
                                    {!isPhoneVerified && (
                                        <button 
                                            onClick={handleSendOTP} 
                                            disabled={loading}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                        >
                                            {loading ? <FaSpinner className="animate-spin" /> : <><FaArrowRight /> Send Code</>}
                                        </button>
                                    )}

                                    {isOtpSent && !isPhoneVerified && (
                                        <div className="space-y-3 animate-fade-in">
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Enter 6-digit code" 
                                                    className="flex-1 p-4 bg-white border-2 border-blue-200 rounded-xl outline-none text-center text-2xl tracking-widest font-bold"
                                                    onChange={(e)=>setOtp(e.target.value)}
                                                    maxLength={6}
                                                />
                                                <button 
                                                    onClick={handleVerifyOTP}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-6 rounded-xl font-semibold transition-colors"
                                                >
                                                    Verify
                                                </button>
                                            </div>
                                            <button onClick={handleSendOTP} className="text-sm text-blue-600 hover:underline w-full text-center">
                                                Resend Code
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: ID Card */}
                            <div className={`bg-gray-50 rounded-2xl p-6 border-2 transition-all duration-300 ${
                                currentStep === 2 ? 'border-purple-500 ring-4 ring-purple-500/10 shadow-lg' : 
                                (idFront && idBack) ? 'border-green-500 bg-green-50/30' : 
                                !isPhoneVerified ? 'opacity-50 pointer-events-none' : 'border-gray-200'
                            }`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-3 rounded-xl ${(idFront && idBack) ? 'bg-green-500' : 'bg-purple-500'} text-white`}>
                                        <FaIdCard className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">ID Card</h3>
                                        <p className="text-sm text-gray-500">Front & Back sides</p>
                                    </div>
                                    {(idFront && idBack) && <FaCheckCircle className="text-green-500 text-2xl ml-auto" />}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all hover:scale-[1.02] ${
                                        idFront ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-purple-400 bg-white'
                                    }`}>
                                        <input type="file" hidden accept="image/*" onChange={(e)=>setIdFront(e.target.files[0])} />
                                        {idFront ? (
                                            <div className="relative h-32">
                                                <img src={URL.createObjectURL(idFront)} className="w-full h-full object-cover" alt="ID Front" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <FaRedo className="text-white text-2xl" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-32 flex flex-col items-center justify-center p-4 text-center">
                                                <FaCloudUploadAlt className="text-3xl text-gray-400 mb-2 group-hover:text-purple-500 transition-colors" />
                                                <span className="text-xs font-bold text-gray-600">FRONT SIDE</span>
                                                <span className="text-[10px] text-gray-400 mt-1">Click to upload</span>
                                            </div>
                                        )}
                                    </label>

                                    <label className={`relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all hover:scale-[1.02] ${
                                        idBack ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-purple-400 bg-white'
                                    }`}>
                                        <input type="file" hidden accept="image/*" onChange={(e)=>setIdBack(e.target.files[0])} />
                                        {idBack ? (
                                            <div className="relative h-32">
                                                <img src={URL.createObjectURL(idBack)} className="w-full h-full object-cover" alt="ID Back" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <FaRedo className="text-white text-2xl" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-32 flex flex-col items-center justify-center p-4 text-center">
                                                <FaCloudUploadAlt className="text-3xl text-gray-400 mb-2 group-hover:text-purple-500 transition-colors" />
                                                <span className="text-xs font-bold text-gray-600">BACK SIDE</span>
                                                <span className="text-[10px] text-gray-400 mt-1">Click to upload</span>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* Step 3: Face Scan */}
                            <div className={`bg-gray-50 rounded-2xl p-6 border-2 transition-all duration-300 ${
                                currentStep === 3 ? 'border-orange-500 ring-4 ring-orange-500/10 shadow-lg' : 
                                selfie ? 'border-green-500 bg-green-50/30' : 
                                !(idFront && idBack) ? 'opacity-50 pointer-events-none' : 'border-gray-200'
                            }`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-3 rounded-xl ${selfie ? 'bg-green-500' : 'bg-orange-500'} text-white`}>
                                        <FaUserCheck className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">Face Scan</h3>
                                        <p className="text-sm text-gray-500">Live photo capture</p>
                                    </div>
                                    {selfie && <FaCheckCircle className="text-green-500 text-2xl ml-auto" />}
                                </div>

                                <div className="flex justify-center">
                                    {!selfie ? (
                                        <div className="relative">
                                            <div className="w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-orange-200 shadow-xl bg-black">
                                                <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" mirrored={true} />
                                            </div>
                                            <button 
                                                onClick={captureSelfie} 
                                                className="absolute bottom-2 right-2 bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full shadow-lg border-4 border-white hover:scale-110 active:scale-95 transition-all"
                                            >
                                                <FaCamera className="text-xl" />
                                            </button>
                                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-gray-500 font-medium whitespace-nowrap">
                                                Position your face in the circle
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-green-500 shadow-xl mx-auto relative">
                                                <img src={selfie} className="w-full h-full object-cover" alt="Selfie" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-green-500/20 to-transparent" />
                                            </div>
                                            <button 
                                                onClick={() => setSelfie(null)} 
                                                className="mt-4 text-orange-600 hover:text-orange-700 font-semibold text-sm flex items-center gap-2 mx-auto hover:underline"
                                            >
                                                <FaRedo /> Retake Photo
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 4: Password */}
                            <div className={`bg-gray-50 rounded-2xl p-6 border-2 transition-all duration-300 ${
                                currentStep === 4 ? 'border-gray-700 ring-4 ring-gray-500/10 shadow-lg' : 
                                (password && confirmPassword && password === confirmPassword) ? 'border-green-500 bg-green-50/30' : 
                                !selfie ? 'opacity-50 pointer-events-none' : 'border-gray-200'
                            }`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-3 rounded-xl ${(password && confirmPassword && password === confirmPassword) ? 'bg-green-500' : 'bg-gray-700'} text-white`}>
                                        <FaLock className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">Security</h3>
                                        <p className="text-sm text-gray-500">Create password</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="relative">
                                        <input 
                                            type="password" 
                                            placeholder="Create password" 
                                            onChange={(e)=>setPassword(e.target.value)}
                                            className="w-full p-4 pl-12 bg-white border-2 border-gray-200 rounded-xl focus:border-gray-700 outline-none transition-all"
                                        />
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type="password" 
                                            placeholder="Confirm password" 
                                            onChange={(e)=>setConfirmPassword(e.target.value)}
                                            className={`w-full p-4 pl-12 bg-white border-2 rounded-xl outline-none transition-all ${
                                                confirmPassword && password !== confirmPassword ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-gray-700'
                                            }`}
                                        />
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    {confirmPassword && password !== confirmPassword && (
                                        <p className="text-red-500 text-xs font-medium">Passwords do not match</p>
                                    )}
                                    <div className="flex gap-1 mt-2">
                                        {[1,2,3,4].map(i => (
                                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                                                password.length >= i * 2 ? 'bg-green-500' : 'bg-gray-200'
                                            }`} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400">Use at least 6 characters</p>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="text-sm text-gray-500 text-center md:text-left">
                                    <p className="font-medium text-gray-700">Step {currentStep} of 4</p>
                                    <p className="text-xs mt-1">Complete all steps to verify your account</p>
                                </div>
                                
                                <button 
                                    onClick={handleFinalSubmit} 
                                    disabled={loading || currentStep < 4}
                                    className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 min-w-[200px]"
                                >
                                    {loading ? (
                                        <><FaSpinner className="animate-spin" /> Processing...</>
                                    ) : (
                                        <><FaShieldAlt /> Complete Verification</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificationFlow;