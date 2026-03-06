import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { FaTimesCircle, FaSpinner, FaMagic, FaCamera, FaTimes } from "react-icons/fa";
import LocationDropdown from "../Components/LocationDropdown";

const API_BASE_URL = "https://rezon.up.railway.app/api";

const CATEGORY_FIELDS = {
    Mobile: [
        { name: "brand", placeholder: "Brand (e.g., Samsung)", type: "text", required: true },
        { name: "model", placeholder: "Model (e.g., S21 Ultra)", type: "text", required: true },
        { name: "storage", placeholder: "Storage (e.g., 128GB)", type: "text", required: true },
        { name: "ram", placeholder: "RAM (e.g., 8GB)", type: "text", required: true },
        { name: "batteryHealth", placeholder: "Battery Health %", type: "number", required: true },
        { name: "ptaStatus", placeholder: "PTA Status", type: "select", options: ["Approved", "Non-Approved", "Blocked"], required: true },
        { name: "warranty", placeholder: "Warranty", type: "select", options: ["Available", "Not Available"], required: true },
        { name: "accessories", placeholder: "Accessories (e.g., Box, Charger)", type: "text" },
    ],
    Car: [
        { name: "make", placeholder: "Make (e.g., Honda, Toyota)", type: "text", required: true },
        { name: "carModel", placeholder: "Model (e.g., Civic, Corolla)", type: "text", required: true },
        { name: "year", placeholder: "Manufacturing Year", type: "number", required: true },
        { name: "mileage", placeholder: "Mileage (in KM)", type: "number", required: true },
        { name: "fuelType", placeholder: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "Hybrid", "Electric"], required: true },
        { name: "transmission", placeholder: "Transmission", type: "select", options: ["Automatic", "Manual"], required: true },
        { name: "registrationCity", placeholder: "Registration City", type: "text", required: true },
    ],
    Furniture: [
        { name: "material", placeholder: "Material (e.g., Wood, Steel)", type: "text", required: true },
        { name: "dimensions", placeholder: "Dimensions (e.g., 6x4 feet)", type: "text" },
        { name: "age", placeholder: "Age (years)", type: "number" },
    ],
    Electronics: [
        { name: "type", placeholder: "Type (e.g., Laptop, TV, Camera)", type: "text", required: true },
        { name: "brand", placeholder: "Brand", type: "text", required: true },
        { name: "model", placeholder: "Model", type: "text", required: true },
    ],
    Bikes: [
        { name: "make", placeholder: "Make (e.g., Honda, Yamaha)", type: "text", required: true },
        { name: "engineCC", placeholder: "Engine (e.g., 125cc, 150cc)", type: "text", required: true },
        { name: "year", placeholder: "Year", type: "number", required: true },
    ],
};

const getInitialState = (category) => ({
    images: [],
    imagePreviews: [],
    title: "",
    condition: "Used",
    description: "",
    price: "",
    location: "",
    category: category || "",
});

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const PostAd = ({ onClose, onAdAdded, category, user }) => {
    const [formData, setFormData] = useState(() => getInitialState(category));
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    // 🧹 Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            formData.imagePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [formData.imagePreviews]);

    // Reset form when category changes
    useEffect(() => {
        // Cleanup previous previews
        formData.imagePreviews.forEach(url => URL.revokeObjectURL(url));
        setFormData(getInitialState(category));
    }, [category]);

    const currentCategoryFields = useMemo(() => 
        CATEGORY_FIELDS[category] || [], 
    [category]);

    const inputHandler = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const validateImage = (file) => {
        if (!file.type.startsWith('image/')) {
            toast.error(`${file.name} is not an image!`);
            return false;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error(`${file.name} is too large (max 5MB)`);
            return false;
        }
        return true;
    };

    const imageHandler = useCallback((e) => {
        const files = Array.from(e.target.files);
        
        if (formData.images.length + files.length > MAX_IMAGES) {
            toast.error(`Max ${MAX_IMAGES} images allowed!`);
            return;
        }

        const validFiles = files.filter(validateImage);
        if (validFiles.length === 0) return;

        const previews = validFiles.map(file => URL.createObjectURL(file));
        
        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...validFiles],
            imagePreviews: [...prev.imagePreviews, ...previews]
        }));
    }, [formData.images.length]);

    const removeImage = useCallback((index) => {
        // Revoke URL to prevent memory leak
        URL.revokeObjectURL(formData.imagePreviews[index]);
        
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
            imagePreviews: prev.imagePreviews.filter((_, i) => i !== index)
        }));
    }, [formData.imagePreviews]);

    const handleAiAssist = useCallback(async () => {
        if (formData.images.length === 0) {
            toast.error("Please upload images first! 📸");
            return;
        }
        
        setAiLoading(true);
        const token = localStorage.getItem("firebaseIdToken");
        
        if (!token) {
            toast.error("Please login first! 🔒");
            setAiLoading(false);
            return;
        }

        const aiData = new FormData();
        formData.images.forEach((file) => {
            aiData.append("images", file);
        });
        aiData.append("category", category);

        try {
            const res = await axios.post(`${API_BASE_URL}/ad/ai-assist`, aiData, {
                headers: { 
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}` 
                },
                timeout: 30000 // 30 second timeout
            });

            const { title, condition, description, suggestedPrice, details } = res.data.data || {};
            
            setFormData(prev => ({
                ...prev,
                title: title || prev.title,
                condition: condition || prev.condition,
                description: description || prev.description,
                price: suggestedPrice?.toString() || prev.price,
                ...(details || {})
            }));

            toast.success("✨ AI has analyzed your images!");
        } catch (error) {
            console.error("AI Assist Error:", error);
            const errorMsg = error.response?.data?.message || 
                           error.code === 'ECONNABORTED' ? "Request timeout. Try again." :
                           "AI analysis failed. Please enter details manually.";
            toast.error(errorMsg);
        } finally {
            setAiLoading(false);
        }
    }, [formData.images, category]);

    const submitForm = useCallback(async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("firebaseIdToken");
        
        if (!token) {
            toast.error("Please login first! 🔒");
            return;
        }
        if (formData.images.length === 0) {
            toast.error("At least one image is required!");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Posting your ad...");

        try {
            const finalFormData = new FormData();
            finalFormData.append("title", formData.title.trim());
            finalFormData.append("description", formData.description.trim());
            finalFormData.append("price", Number(formData.price));
            finalFormData.append("condition", formData.condition);
            finalFormData.append("location", formData.location);
            finalFormData.append("category", category);

            // Add category-specific fields
            currentCategoryFields.forEach(field => {
                if (formData[field.name]) {
                    finalFormData.append(field.name, formData[field.name]);
                }
            });

            formData.images.forEach(file => finalFormData.append("images", file));

            const res = await axios.post(`${API_BASE_URL}/ad`, finalFormData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
                timeout: 60000 // 60 second timeout for image upload
            });

            toast.success("🎉 Ad posted successfully!", { id: toastId });
            
            // Cleanup previews before closing
            formData.imagePreviews.forEach(url => URL.revokeObjectURL(url));
            
            onClose();
            if (onAdAdded) onAdAdded(res.data?.data || res.data);
        } catch (error) {
            console.error("Post Ad Error:", error);
            const errorMsg = error.response?.data?.message || 
                           error.code === 'ECONNABORTED' ? "Upload timeout. Try smaller images." :
                           "Failed to post ad. Please try again.";
            toast.error(errorMsg, { id: toastId });
        } finally {
            setLoading(false);
        }
    }, [formData, currentCategoryFields, category, onClose, onAdAdded]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const renderField = useCallback((field) => {
        const baseClasses = "w-full border border-gray-200 p-4 rounded-2xl outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 bg-gray-50/50 font-semibold transition-all";
        
        if (field.type === "select") {
            return (
                <select 
                    key={field.name}
                    name={field.name} 
                    value={formData[field.name] || ""} 
                    onChange={inputHandler} 
                    className={baseClasses}
                    required={field.required}
                >
                    <option value="">Select {field.placeholder}</option>
                    {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }
        
        return (
            <input 
                key={field.name}
                type={field.type} 
                name={field.name} 
                value={formData[field.name] || ""} 
                onChange={inputHandler} 
                placeholder={field.placeholder} 
                className={baseClasses}
                required={field.required}
                min={field.type === "number" ? 0 : undefined}
            />
        );
    }, [formData, inputHandler]);

    const modalContent = (
        <div 
            className="fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 z-[999] animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-pink-600">Post in {category}</h2>
                        <p className="text-sm text-gray-500 mt-1">Fill in the details below</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="overflow-y-auto p-6 space-y-6">
                    <form onSubmit={submitForm} className="space-y-6" id="post-ad-form">
                        {/* Image Upload Section */}
                        <div className="space-y-4">
                            <label className="block w-full p-8 border-2 border-dashed border-pink-300 rounded-3xl text-center bg-pink-50/30 cursor-pointer hover:bg-pink-50 transition-all group">
                                <FaCamera className="text-4xl text-pink-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                <span className="text-gray-700 font-bold block mb-1">Upload Images</span>
                                <span className="text-gray-500 text-sm">Max {MAX_IMAGES} images, 5MB each</span>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*" 
                                    onChange={imageHandler} 
                                    className="hidden" 
                                />
                            </label>

                            {/* AI Assist Button */}
                            {formData.images.length > 0 && (
                                <button 
                                    type="button"
                                    onClick={handleAiAssist}
                                    disabled={aiLoading}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {aiLoading ? (
                                        <>
                                            <FaSpinner className="animate-spin" />
                                            Analyzing images...
                                        </>
                                    ) : (
                                        <>
                                            <FaMagic />
                                            Auto-Fill with AI
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Image Previews */}
                            {formData.imagePreviews.length > 0 && (
                                <div className="flex gap-3 overflow-x-auto pb-2 pt-2 scrollbar-thin scrollbar-thumb-pink-300">
                                    {formData.imagePreviews.map((img, i) => (
                                        <div key={i} className="relative shrink-0 group">
                                            <img 
                                                src={img} 
                                                className="w-24 h-24 object-cover rounded-2xl border-4 border-white shadow-lg" 
                                                alt={`Preview ${i + 1}`}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => removeImage(i)}
                                                className="absolute -top-2 -right-2 text-red-500 bg-white rounded-full p-1 shadow-md hover:text-red-700 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                aria-label="Remove image"
                                            >
                                                <FaTimesCircle size={20} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Basic Info */}
                        <div className="space-y-4">
                            <input 
                                name="title" 
                                value={formData.title} 
                                onChange={inputHandler} 
                                placeholder="Ad Title *" 
                                className="w-full border border-gray-200 p-4 rounded-2xl outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 bg-gray-50/50 font-semibold transition-all"
                                required 
                                maxLength={100}
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <select 
                                    name="condition" 
                                    value={formData.condition} 
                                    onChange={inputHandler} 
                                    className="border border-gray-200 p-4 rounded-2xl bg-gray-50/50 outline-none font-semibold focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                                >
                                    <option value="Used">Used</option>
                                    <option value="New">New</option>
                                    <option value="Refurbished">Refurbished</option>
                                </select>
                                <input 
                                    type="number" 
                                    name="price" 
                                    value={formData.price} 
                                    onChange={inputHandler} 
                                    placeholder="Price (PKR) *" 
                                    className="border border-gray-200 p-4 rounded-2xl outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 bg-gray-50/50 font-semibold"
                                    required 
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Category Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentCategoryFields.map(renderField)}
                        </div>

                        {/* Description */}
                        <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={inputHandler} 
                            rows="4" 
                            className="w-full border border-gray-200 p-4 rounded-2xl bg-gray-50/50 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 font-medium resize-none"
                            placeholder="Describe your product in detail..."
                            required
                            maxLength={2000}
                        />
                        
                        {/* Location */}
                        <LocationDropdown 
                            selected={formData.location} 
                            onChange={val => setFormData(p => ({...p, location: val}))} 
                            variant="form" 
                        />
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50">
                    <button 
                        type="submit" 
                        form="post-ad-form"
                        disabled={loading} 
                        className="w-full py-4 bg-pink-600 text-white rounded-2xl font-black text-xl shadow-lg hover:bg-pink-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <FaSpinner className="animate-spin" />
                                Posting...
                            </>
                        ) : (
                            "🚀 Post Ad Now"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default PostAd;