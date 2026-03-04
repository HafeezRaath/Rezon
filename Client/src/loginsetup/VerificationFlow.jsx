import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { 
    FaPhone, 
    FaIdCard, 
    FaUserCheck, 
    FaLock, 
    FaCloudUploadAlt, 
    FaCamera,
    FaCheckCircle,
    FaShieldAlt,
    FaSpinner,
    FaTimes,
    FaRedo
} from 'react-icons/fa';
import { auth } from "../firebase.config"; // Firebase auth import lazmi hai
import toast, { Toaster } from 'react-hot-toast';

const VerificationFlow = ({ user, onClose, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    const [phone, setPhone] = useState("");
    const [idFront, setIdFront] = useState(null);
    const [idBack, setIdBack] = useState(null);
    const [selfie, setSelfie] = useState(null);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const webcamRef = useRef(null);

    // Steps Logic: Step 1 (Info), Step 2 (ID Card), Step 3 (Selfie)
    useEffect(() => {
        if (phone.length >= 10 && password.length >= 6 && password === confirmPassword) {
            setCurrentStep(2);
        }
        if (idFront && idBack) {
            setCurrentStep(3);
        }
    }, [phone, password, confirmPassword, idFront, idBack]);

    const captureSelfie = () => {
        const imageSrc = webcamRef.current.getScreenshot();
        setSelfie(imageSrc);
        toast.success("Selfie capture ho gaya!");
    };

   const handleFinalSubmit = async () => {
    // ... validation ...
    setLoading(true);
    const formData = new FormData();
    
    // ✅ Field names backend (upload.fields) ke mutabiq hamesha same hone chahiye
    formData.append('idFront', idFront); 
    formData.append('idBack', idBack); 
    
    const selfieBlob = await fetch(selfie).then(r => r.blob());
    // ✅ Field name MUST match 'liveSelfie' as defined in userRoutes.js
    formData.append('liveSelfie', selfieBlob, 'selfie.jpg');
    
    formData.append('password', password);
    formData.append('phoneNumber', phone);
    formData.append('uid', user?.uid);

    try {
        const token = await auth.currentUser?.getIdToken();
        const res = await axios.post('http://localhost:8000/api/verify-identity', formData, {
            headers: { 
                'Content-Type': 'multipart/form-data', // Multer ke liye lazmi
                'Authorization': `Bearer ${token}` 
            }
        });
        // ... success logic ...
    } catch (err) {
        console.error("KYC Server Message:", err.response?.data?.message); // 👈 Terminal/Console check karein
        toast.error(err.response?.data?.message || "Verification fail ho gayi");
    } finally {
        setLoading(false);
    }
};
    const StepIndicator = () => (
        <div className="flex items-center justify-between mb-8 px-2 max-w-md mx-auto">
            {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold transition-all duration-300 ${
                        step <= currentStep ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-110' : 'bg-gray-200 text-gray-500'
                    }`}>
                        {step < currentStep ? <FaCheckCircle /> : step}
                    </div>
                    {step < 3 && (
                        <div className={`w-12 md:w-24 h-1 mx-1 md:mx-2 rounded-full transition-all duration-500 ${
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
                            <p className="text-xs md:text-sm text-gray-300">Quick 3-step secure verification</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <FaTimes className="text-xl" />
                    </button>
                </div>

                <Toaster position="top-center" />

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto p-4 md:p-8">
                        <StepIndicator />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                            
                            {/* Step 1: Info & Password */}
                            <div className={`bg-gray-50 rounded-2xl p-6 border-2 transition-all duration-300 ${
                                currentStep === 1 ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-lg' : 'border-gray-200 opacity-70'
                            }`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 rounded-xl bg-blue-500 text-white">
                                        <FaPhone className="text-xl" />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-800">Account Security</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <input 
                                            type="tel" 
                                            placeholder="Mobile Number (03XX-XXXXXXX)" 
                                            className="w-full p-4 pl-12 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all font-medium"
                                            onChange={(e)=>setPhone(e.target.value)} 
                                            value={phone}
                                        />
                                        <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>

                                    <div className="relative">
                                        <input 
                                            type="password" 
                                            placeholder="Create Password" 
                                            onChange={(e)=>setPassword(e.target.value)}
                                            className="w-full p-4 pl-12 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                                        />
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>

                                    <div className="relative">
                                        <input 
                                            type="password" 
                                            placeholder="Confirm Password" 
                                            onChange={(e)=>setConfirmPassword(e.target.value)}
                                            className={`w-full p-4 pl-12 bg-white border-2 rounded-xl outline-none transition-all ${
                                                confirmPassword && password !== confirmPassword ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'
                                            }`}
                                        />
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: ID Card */}
                            <div className={`bg-gray-50 rounded-2xl p-6 border-2 transition-all duration-300 ${
                                currentStep === 2 ? 'border-purple-500 ring-4 ring-purple-500/10 shadow-lg' : 
                                (idFront && idBack) ? 'border-green-500 bg-green-50/30' : 
                                currentStep < 2 ? 'opacity-50 pointer-events-none' : 'border-gray-200'
                            }`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-3 rounded-xl ${(idFront && idBack) ? 'bg-green-500' : 'bg-purple-500'} text-white`}>
                                        <FaIdCard className="text-xl" />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-800">ID Documents</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <label className="relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 bg-white h-32 flex flex-col items-center justify-center p-2">
                                        <input type="file" hidden accept="image/*" onChange={(e)=>setIdFront(e.target.files[0])} />
                                        {idFront ? <img src={URL.createObjectURL(idFront)} className="w-full h-full object-cover" alt="ID Front" /> : 
                                        <><FaCloudUploadAlt className="text-2xl text-gray-400" /><span className="text-[10px] font-bold">FRONT</span></>}
                                    </label>
                                    <label className="relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 bg-white h-32 flex flex-col items-center justify-center p-2">
                                        <input type="file" hidden accept="image/*" onChange={(e)=>setIdBack(e.target.files[0])} />
                                        {idBack ? <img src={URL.createObjectURL(idBack)} className="w-full h-full object-cover" alt="ID Back" /> : 
                                        <><FaCloudUploadAlt className="text-2xl text-gray-400" /><span className="text-[10px] font-bold">BACK</span></>}
                                    </label>
                                </div>
                            </div>

                            {/* Step 3: Face Scan */}
                            <div className={`bg-gray-50 rounded-2xl p-6 border-2 transition-all duration-300 lg:col-span-2 ${
                                currentStep === 3 ? 'border-orange-500 shadow-lg' : 
                                selfie ? 'border-green-500' : 
                                currentStep < 3 ? 'opacity-50 pointer-events-none' : 'border-gray-200'
                            }`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 rounded-xl bg-orange-500 text-white">
                                        <FaUserCheck className="text-xl" />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-800">Face Authentication</h3>
                                </div>

                                <div className="flex flex-col items-center">
                                    {!selfie ? (
                                        <div className="relative">
                                            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-orange-200 shadow-xl">
                                                <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" mirrored={true} />
                                            </div>
                                            <button onClick={captureSelfie} className="absolute bottom-2 right-2 bg-orange-500 text-white p-4 rounded-full border-4 border-white shadow-lg transition-transform hover:scale-110">
                                                <FaCamera />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <img src={selfie} className="w-48 h-48 rounded-full object-cover border-4 border-green-500 shadow-lg" alt="Captured Selfie" />
                                            <button onClick={() => setSelfie(null)} className="mt-4 text-orange-600 flex items-center gap-2 mx-auto text-sm font-bold hover:underline">
                                                <FaRedo /> Retake
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="mt-8 pt-6 border-t">
                            <button 
                                onClick={handleFinalSubmit} 
                                disabled={loading || !selfie}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl font-bold text-lg shadow-xl transition-all hover:shadow-2xl hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {loading ? <FaSpinner className="animate-spin" /> : <><FaShieldAlt /> Submit Verification</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificationFlow;