import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { createPortal } from 'react-dom';
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
    FaRedo,
    FaExclamationTriangle
} from 'react-icons/fa';
import { auth } from "../firebase.config";
import toast, { Toaster } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const VerificationFlow = ({ user, onClose, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    
    const [phone, setPhone] = useState("");
    const [idFront, setIdFront] = useState(null);
    const [idFrontPreview, setIdFrontPreview] = useState(null);
    const [idBack, setIdBack] = useState(null);
    const [idBackPreview, setIdBackPreview] = useState(null);
    const [selfie, setSelfie] = useState(null);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState({});

    const webcamRef = useRef(null);

    // 🧹 Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            if (idFrontPreview) URL.revokeObjectURL(idFrontPreview);
            if (idBackPreview) URL.revokeObjectURL(idBackPreview);
        };
    }, [idFrontPreview, idBackPreview]);

    // Step validation
    useEffect(() => {
        const newErrors = {};
        
        if (phone && !/^03\d{9}$/.test(phone)) {
            newErrors.phone = "Invalid format. Use 03XXXXXXXXX";
        }
        
        if (password && password.length < 6) {
            newErrors.password = "Minimum 6 characters";
        }
        
        if (confirmPassword && password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords don't match";
        }

        setErrors(newErrors);

        // Auto-advance logic
        if (currentStep === 1 && phone.length === 11 && password.length >= 6 && password === confirmPassword && !newErrors.phone) {
            setCurrentStep(2);
        }
        if (currentStep === 2 && idFront && idBack) {
            setCurrentStep(3);
        }
    }, [phone, password, confirmPassword, idFront, idBack, currentStep]);

    const validateFile = (file) => {
        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file");
            return false;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error("File too large (max 5MB)");
            return false;
        }
        return true;
    };

    const handleIdFrontChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (!validateFile(file)) return;
        
        // Cleanup previous
        if (idFrontPreview) URL.revokeObjectURL(idFrontPreview);
        
        setIdFront(file);
        setIdFrontPreview(URL.createObjectURL(file));
    }, [idFrontPreview]);

    const handleIdBackChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (!validateFile(file)) return;
        
        if (idBackPreview) URL.revokeObjectURL(idBackPreview);
        
        setIdBack(file);
        setIdBackPreview(URL.createObjectURL(file));
    }, [idBackPreview]);

    const captureSelfie = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) {
            toast.error("Camera access denied or not ready");
            return;
        }
        setSelfie(imageSrc);
        toast.success("Selfie captured!");
    }, []);

    const retakeSelfie = useCallback(() => {
        setSelfie(null);
    }, []);

    const handleFinalSubmit = useCallback(async () => {
        if (!selfie) {
            toast.error("Please capture a selfie first");
            return;
        }
        
        if (!idFront || !idBack) {
            toast.error("Please upload both ID card images");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Submitting verification...");

        try {
            const formData = new FormData();
            
            // Append files
            formData.append('idFront', idFront);
            formData.append('idBack', idBack);
            
            // Convert base64 selfie to Blob
            const selfieBlob = await fetch(selfie).then(r => r.blob());
            formData.append('liveSelfie', selfieBlob, 'selfie.jpg');
            
            // Append other data
            formData.append('password', password);
            formData.append('phoneNumber', phone);
            formData.append('uid', user?.uid);

            // Get fresh token
            const token = await auth.currentUser?.getIdToken(true);
            if (!token) throw new Error("Authentication required");

            const res = await axios.post(`${API_BASE_URL}/verify-identity`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
                timeout: 60000
            });

            if (res.data?.success) {
                toast.success("Verification completed successfully!", { id: toastId });
                if (onComplete) onComplete(res.data.profilePic);
                setTimeout(() => onClose(), 1500);
            } else {
                throw new Error(res.data?.message || "Verification failed");
            }
        } catch (err) {
            console.error("Verification Error:", err);
            const errorMsg = err.response?.data?.message || err.message || "Verification failed. Please try again.";
            toast.error(errorMsg, { id: toastId });
        } finally {
            setLoading(false);
        }
    }, [selfie, idFront, idBack, password, phone, user, onComplete, onClose]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !loading) onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose, loading]);

    const StepIndicator = useCallback(() => (
        <div className="flex items-center justify-between mb-8 px-2 max-w-md mx-auto">
            {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                    <button
                        onClick={() => step < currentStep && setCurrentStep(step)}
                        disabled={step >= currentStep}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                            step < currentStep ? 'bg-green-500 text-white cursor-pointer hover:scale-110' :
                            step === currentStep ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-110 ring-4 ring-blue-200' : 
                            'bg-gray-200 text-gray-500'
                        }`}
                    >
                        {step < currentStep ? <FaCheckCircle /> : step}
                    </button>
                    {step < 3 && (
                        <div className={`w-16 md:w-24 h-1 mx-2 rounded-full transition-all duration-500 ${
                            step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                    )}
                </div>
            ))}
        </div>
    ), [currentStep]);

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-0 md:p-4"
            onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
        >
            <div className="bg-white w-full max-w-5xl h-full md:h-auto md:max-h-[95vh] md:rounded-3xl shadow-2xl relative overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white p-4 md:p-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
                            <FaShieldAlt className="text-2xl text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">Identity Verification</h1>
                            <p className="text-xs md:text-sm text-gray-300">Secure 3-step verification process</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => !loading && onClose()} 
                        disabled={loading}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                    >
                        <FaTimes className="text-xl" />
                    </button>
                </div>

                <Toaster position="top-center" />

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto p-4 md:p-8">
                        <StepIndicator />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Step 1: Account Security */}
                            <div className={`bg-gray-50 rounded-2xl p-6 border-2 transition-all duration-300 ${
                                currentStep === 1 ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-lg' : 
                                (phone && password && password === confirmPassword) ? 'border-green-500 bg-green-50/30' : 
                                currentStep > 1 ? 'opacity-60' : 'border-gray-200'
                            }`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-3 rounded-xl ${(phone && password && password === confirmPassword) ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
                                        <FaPhone className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">Step 1: Account Security</h3>
                                        <p className="text-xs text-gray-500">Secure your account</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <input 
                                            type="tel" 
                                            placeholder="03XXXXXXXXX" 
                                            maxLength={11}
                                            className={`w-full p-4 pl-12 bg-white border-2 rounded-xl outline-none transition-all font-medium ${
                                                errors.phone ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                                            }`}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} 
                                            value={phone}
                                        />
                                        <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    {errors.phone && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <FaExclamationTriangle /> {errors.phone}
                                        </p>
                                    )}

                                    <div className="relative">
                                        <input 
                                            type="password" 
                                            placeholder="Create Password (min 6 chars)" 
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`w-full p-4 pl-12 bg-white border-2 rounded-xl outline-none transition-all ${
                                                errors.password ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'
                                            }`}
                                        />
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>

                                    <div className="relative">
                                        <input 
                                            type="password" 
                                            placeholder="Confirm Password" 
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`w-full p-4 pl-12 bg-white border-2 rounded-xl outline-none transition-all ${
                                                errors.confirmPassword ? 'border-red-300 focus:border-red-500' : 
                                                confirmPassword && password === confirmPassword ? 'border-green-500' : 'border-gray-200 focus:border-blue-500'
                                            }`}
                                        />
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        {confirmPassword && password === confirmPassword && (
                                            <FaCheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                                        )}
                                    </div>
                                    {errors.confirmPassword && (
                                        <p className="text-xs text-red-500">{errors.confirmPassword}</p>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: ID Documents */}
                            <div className={`bg-gray-50 rounded-2xl p-6 border-2 transition-all duration-300 ${
                                currentStep === 2 ? 'border-purple-500 ring-4 ring-purple-500/10 shadow-lg' : 
                                (idFront && idBack) ? 'border-green-500 bg-green-50/30' : 
                                currentStep > 2 ? 'opacity-60' : currentStep < 2 ? 'opacity-50 pointer-events-none' : 'border-gray-200'
                            }`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-3 rounded-xl ${(idFront && idBack) ? 'bg-green-500' : 'bg-purple-500'} text-white`}>
                                        <FaIdCard className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">Step 2: ID Documents</h3>
                                        <p className="text-xs text-gray-500">Upload CNIC front & back</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className={`relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed h-36 flex flex-col items-center justify-center p-2 transition-all ${
                                            idFront ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-purple-400 bg-white'
                                        }`}>
                                            <input type="file" hidden accept="image/*" onChange={handleIdFrontChange} />
                                            {idFrontPreview ? (
                                                <img src={idFrontPreview} className="w-full h-full object-cover absolute inset-0" alt="ID Front" />
                                            ) : (
                                                <>
                                                    <FaCloudUploadAlt className="text-3xl text-gray-400 mb-2" />
                                                    <span className="text-xs font-bold text-gray-500">FRONT SIDE</span>
                                                    <span className="text-[10px] text-gray-400 mt-1">Click to upload</span>
                                                </>
                                            )}
                                            {idFront && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-white text-xs font-bold">Change</span>
                                                </div>
                                            )}
                                        </label>
                                        {idFront && <p className="text-xs text-green-600 font-medium text-center">✓ Front uploaded</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className={`relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed h-36 flex flex-col items-center justify-center p-2 transition-all ${
                                            idBack ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-purple-400 bg-white'
                                        }`}>
                                            <input type="file" hidden accept="image/*" onChange={handleIdBackChange} />
                                            {idBackPreview ? (
                                                <img src={idBackPreview} className="w-full h-full object-cover absolute inset-0" alt="ID Back" />
                                            ) : (
                                                <>
                                                    <FaCloudUploadAlt className="text-3xl text-gray-400 mb-2" />
                                                    <span className="text-xs font-bold text-gray-500">BACK SIDE</span>
                                                    <span className="text-[10px] text-gray-400 mt-1">Click to upload</span>
                                                </>
                                            )}
                                            {idBack && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-white text-xs font-bold">Change</span>
                                                </div>
                                            )}
                                        </label>
                                        {idBack && <p className="text-xs text-green-600 font-medium text-center">✓ Back uploaded</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Face Authentication */}
                            <div className={`bg-gray-50 rounded-2xl p-6 border-2 transition-all duration-300 lg:col-span-2 ${
                                currentStep === 3 ? 'border-orange-500 shadow-lg' : 
                                selfie ? 'border-green-500 bg-green-50/30' : 
                                currentStep < 3 ? 'opacity-50 pointer-events-none' : 'border-gray-200'
                            }`}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`p-3 rounded-xl ${selfie ? 'bg-green-500' : 'bg-orange-500'} text-white`}>
                                        <FaUserCheck className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">Step 3: Face Authentication</h3>
                                        <p className="text-xs text-gray-500">Take a clear selfie for verification</p>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                                    {!selfie ? (
                                        <div className="relative">
                                            <div className="w-56 h-56 rounded-full overflow-hidden border-4 border-orange-200 shadow-2xl bg-gray-900">
                                                <Webcam 
                                                    ref={webcamRef} 
                                                    screenshotFormat="image/jpeg" 
                                                    className="w-full h-full object-cover"
                                                    mirrored={true}
                                                    videoConstraints={{
                                                        width: 720,
                                                        height: 720,
                                                        facingMode: "user"
                                                    }}
                                                />
                                            </div>
                                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                                <button 
                                                    onClick={captureSelfie} 
                                                    className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full border-4 border-white shadow-lg transition-transform hover:scale-110 active:scale-95"
                                                >
                                                    <FaCamera size={24} />
                                                </button>
                                            </div>
                                            <p className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-sm text-gray-500 whitespace-nowrap">
                                                Position your face in the circle
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="relative inline-block">
                                                <img 
                                                    src={selfie} 
                                                    className="w-56 h-56 rounded-full object-cover border-4 border-green-500 shadow-2xl" 
                                                    alt="Captured Selfie" 
                                                />
                                                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full border-4 border-white">
                                                    <FaCheckCircle size={20} />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={retakeSelfie} 
                                                className="mt-6 flex items-center gap-2 mx-auto text-orange-600 font-bold hover:text-orange-700 transition-colors px-4 py-2 rounded-lg hover:bg-orange-50"
                                            >
                                                <FaRedo /> Retake Photo
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Submit Section */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-3 mb-4 text-sm text-gray-600 bg-blue-50 p-4 rounded-xl">
                                <FaShieldAlt className="text-blue-500 text-xl" />
                                <p>Your data is encrypted and securely stored. We only use it for verification purposes.</p>
                            </div>
                            
                            <button 
                                onClick={handleFinalSubmit} 
                                disabled={loading || !selfie || !idFront || !idBack}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl font-bold text-lg shadow-xl transition-all hover:shadow-2xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <>
                                        <FaSpinner className="animate-spin" /> 
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <FaShieldAlt /> Complete Verification
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default VerificationFlow;