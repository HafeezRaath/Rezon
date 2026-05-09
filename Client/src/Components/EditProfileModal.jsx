import React, { useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { 
    FaCamera, 
    FaUser, 
    FaTimes, 
    FaSpinner,
    FaCheckCircle
} from "react-icons/fa";

const API_BASE_URL = "https://rezon.up.railway.app/api";

const EditProfileModal = ({ user, onClose, onUpdate }) => {
    const [displayName, setDisplayName] = useState(user?.displayName || user?.name || "");
    const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(user?.photoURL || "");
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    // Handle photo selection
    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image too large (max 5MB)");
            return;
        }

        setPhotoFile(file);
        const preview = URL.createObjectURL(file);
        setPhotoPreview(preview);
    };

    // Remove selected photo
    const handleRemovePhoto = () => {
        setPhotoFile(null);
        setPhotoPreview("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Save changes
    const handleSave = async () => {
        if (!displayName.trim()) {
            toast.error("Name cannot be empty");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Updating profile...");

        try {
            const token = localStorage.getItem('firebaseIdToken');
            if (!token) throw new Error("Not authenticated");

            // Step 1: Update name
            await axios.put(`${API_BASE_URL}/users/me`, {
                displayName: displayName.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Step 2: Upload photo if changed
            let newPhotoURL = photoURL;
            if (photoFile) {
                const formData = new FormData();
                formData.append('photo', photoFile);

                const uploadRes = await axios.put(`${API_BASE_URL}/users/me/photo`, formData, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                newPhotoURL = uploadRes.data?.photoURL || photoPreview;
            }

            toast.success("Profile updated!", { id: toastId });

            // Notify parent
            onUpdate?.({
                displayName: displayName.trim(),
                photoURL: newPhotoURL
            });

            onClose();
        } catch (err) {
            console.error("Update error:", err);
            toast.error(err.response?.data?.message || "Failed to update profile", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const modalContent = (
        <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
        >
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
                            <FaUser className="text-xl text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Edit Profile</h2>
                            <p className="text-xs text-slate-300">Update your name & photo</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={loading}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                    >
                        <FaTimes className="text-xl" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Photo Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-4 border-slate-100 shadow-lg overflow-hidden bg-slate-50">
                                {photoPreview ? (
                                    <img 
                                        src={photoPreview} 
                                        alt="Preview" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <FaUser className="text-5xl text-slate-300" />
                                    </div>
                                )}
                            </div>

                            {/* Camera button overlay */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                className="absolute bottom-0 right-0 bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full border-4 border-white shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                            >
                                <FaCamera size={18} />
                            </button>

                            <input 
                                ref={fileInputRef}
                                type="file" 
                                hidden 
                                accept="image/*"
                                onChange={handlePhotoChange}
                            />
                        </div>

                        {/* Photo actions */}
                        {photoFile && (
                            <button
                                onClick={handleRemovePhoto}
                                disabled={loading}
                                className="text-sm text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 transition-colors"
                            >
                                <FaTimes size={12} /> Remove photo
                            </button>
                        )}

                        <p className="text-xs text-slate-400 text-center">
                            Click camera icon to upload new photo<br/>
                            Max 5MB, JPG/PNG only
                        </p>
                    </div>

                    {/* Name Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                            Display Name
                        </label>
                        <div className="relative">
                            <input 
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your name"
                                disabled={loading}
                                maxLength={50}
                                className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-emerald-500 focus:bg-white font-medium text-slate-800"
                            />
                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            {displayName.trim().length > 0 && (
                                <FaCheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                            )}
                        </div>
                        <p className="text-xs text-slate-400 text-right">
                            {displayName.length}/50
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    <button 
                        onClick={handleSave}
                        disabled={loading || !displayName.trim()}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-xl transition-all hover:shadow-2xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                        {loading ? (
                            <>
                                <FaSpinner className="animate-spin" /> 
                                Saving...
                            </>
                        ) : (
                            <>
                                <FaCheckCircle /> Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default EditProfileModal;