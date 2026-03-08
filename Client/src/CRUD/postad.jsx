import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { FaTimesCircle, FaSpinner, FaMagic, FaCamera, FaTimes, FaRocket } from "react-icons/fa";
import LocationDropdown from "../Components/LocationDropdown";

// 🔧 FIXED: Space removed
const API_BASE_URL = "https://rezon.up.railway.app/api";

// 🔧 FIXED: All categories added
const CATEGORY_FIELDS = {
    Mobile: [
        { name: "brand", placeholder: "Brand (e.g., Samsung)", type: "text", required: true },
        { name: "model", placeholder: "Model (e.g., S21 Ultra)", type: "text", required: true },
        { name: "storage", placeholder: "Storage (e.g., 128GB)", type: "text", required: true },
        { name: "ram", placeholder: "RAM (e.g., 8GB)", type: "text", required: true },
        { name: "batteryHealth", placeholder: "Battery Health %", type: "number", required: true, min: 0, max: 100 },
        { name: "ptaStatus", placeholder: "PTA Status", type: "select", options: ["Approved", "Non-Approved", "Blocked"], required: true },
        { name: "warranty", placeholder: "Warranty", type: "select", options: ["Available", "Not Available"], required: true },
        { name: "warrantyDuration", placeholder: "Warranty Duration", type: "text", dependsOn: { field: "warranty", value: "Available" } },
        { name: "accessories", placeholder: "Accessories (Box, Charger)", type: "text" },
    ],
    Car: [
        { name: "make", placeholder: "Make (e.g., Honda, Toyota)", type: "text", required: true },
        { name: "carModel", placeholder: "Model (e.g., Civic, Corolla)", type: "text", required: true },
        { name: "year", placeholder: "Manufacturing Year", type: "number", required: true, min: 1900, max: new Date().getFullYear() + 1 },
        { name: "mileage", placeholder: "Mileage (in KM)", type: "number", required: true, min: 0 },
        { name: "fuelType", placeholder: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "Hybrid", "Electric"], required: true },
        { name: "transmission", placeholder: "Transmission", type: "select", options: ["Automatic", "Manual"], required: true },
        { name: "registrationCity", placeholder: "Registration City", type: "text", required: true },
    ],
    PropertySale: [
        { name: "propertyType", placeholder: "Type (House, Plot, Flat)", type: "select", options: ["House", "Plot", "Flat", "Farm House"], required: true },
        { name: "areaSize", placeholder: "Area Size (e.g., 5 Marla)", type: "text", required: true },
        { name: "bedrooms", placeholder: "Bedrooms", type: "number", min: 0 },
        { name: "bathrooms", placeholder: "Bathrooms", type: "number", min: 0 },
    ],
    PropertyRent: [
        { name: "propertyType", placeholder: "Type (House, Flat, Room)", type: "select", options: ["House", "Flat", "Room", "Office"], required: true },
        { name: "areaSize", placeholder: "Area Size", type: "text", required: true },
        { name: "rentDuration", placeholder: "Rent Duration", type: "select", options: ["Monthly", "Yearly"], required: true },
    ],
    Furniture: [
        { name: "material", placeholder: "Material (Wood, Steel)", type: "text", required: true },
        { name: "dimensions", placeholder: "Dimensions (e.g., 6x4 feet)", type: "text" },
        { name: "age", placeholder: "Age (years)", type: "number", min: 0 },
    ],
    Electronics: [
        { name: "type", placeholder: "Type (Laptop, TV, Camera)", type: "text", required: true },
        { name: "brand", placeholder: "Brand", type: "text", required: true },
        { name: "model", placeholder: "Model", type: "text", required: true },
        { name: "warrantyStatus", placeholder: "Warranty", type: "select", options: ["In Warranty", "Expired", "Not Applicable"], required: true },
    ],
    Bikes: [
        { name: "make", placeholder: "Make (Honda, Yamaha)", type: "text", required: true },
        { name: "engineCC", placeholder: "Engine CC (125, 150)", type: "text", required: true },
        { name: "year", placeholder: "Year", type: "number", required: true, min: 1900 },
        { name: "mileage", placeholder: "Mileage (KM)", type: "number", min: 0 },
    ],
    Business: [
        { name: "businessType", placeholder: "Type (Franchise, Machinery)", type: "text", required: true },
        { name: "investmentRequired", placeholder: "Investment (PKR)", type: "number", min: 0 },
    ],
    Services: [
        { name: "serviceType", placeholder: "Service Type (Plumbing, Design)", type: "text", required: true },
        { name: "serviceArea", placeholder: "Service Area", type: "text" },
    ],
    Jobs: [
        { name: "jobTitle", placeholder: "Job Title (Driver, Developer)", type: "text", required: true },
        { name: "salaryRange", placeholder: "Salary Range (PKR/Month)", type: "text" },
        { name: "jobType", placeholder: "Employment Type", type: "select", options: ["Full-time", "Part-time", "Contract"], required: true },
    ],
    Animals: [
        { name: "animalType", placeholder: "Type (Dog, Cat, Bird)", type: "text", required: true },
        { name: "breed", placeholder: "Breed", type: "text" },
        { name: "age", placeholder: "Age (months/years)", type: "text" },
        { name: "vaccination", placeholder: "Vaccination", type: "select", options: ["Vaccinated", "Not Vaccinated"], required: true },
    ],
    Fashion: [
        { name: "itemType", placeholder: "Item Type (Shirt, Shoes)", type: "text", required: true },
        { name: "size", placeholder: "Size (S, M, L, 40)", type: "text" },
        { name: "gender", placeholder: "Gender", type: "select", options: ["Men", "Women", "Unisex"], required: true },
    ],
    Books: [
        { name: "title", placeholder: "Book Title", type: "text", required: true },
        { name: "author", placeholder: "Author", type: "text" },
        { name: "genre", placeholder: "Genre", type: "text" },
    ],
    Kids: [
        { name: "itemType", placeholder: "Item Type (Toy, Clothing)", type: "text", required: true },
        { name: "ageGroup", placeholder: "Age Group (2-5 years)", type: "text" },
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
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const PostAd = ({ onClose, onAdAdded, category, user }) => {
    const [formData, setFormData] = useState(() => getInitialState(category));
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        return () => {
            formData.imagePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [formData.imagePreviews]);

    useEffect(() => {
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
                timeout: 30000
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
                timeout: 60000
            });

            toast.success("🎉 Ad posted successfully!", { id: toastId });
            
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

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const renderField = useCallback((field) => {
        // Check dependency
        if (field.dependsOn && formData[field.dependsOn.field] !== field.dependsOn.value) {
            return null;
        }

        const baseClasses = "w-full border border-slate-200 p-4 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-slate-50/50 font-medium transition-all";
        
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
                min={field.min}
                max={field.max}
            />
        );
    }, [formData, inputHandler]);

    // 🎨 FIXED: Emerald Theme Modal
    const modalContent = (
        <div 
            className="fixed inset-0 flex justify-center items-center bg-slate-900/70 backdrop-blur-sm p-4 z-[999] animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">
                            Post in <span className="text-emerald-600">{category}</span>
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Fill in the details below</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="overflow-y-auto p-6 space-y-6">
                    <form onSubmit={submitForm} className="space-y-6" id="post-ad-form">
                        {/* Image Upload Section */}
                        <div className="space-y-4">
                            <label className="block w-full p-8 border-2 border-dashed border-emerald-200 rounded-2xl text-center bg-emerald-50/30 cursor-pointer hover:bg-emerald-50 transition-all group">
                                <FaCamera className="text-4xl text-emerald-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                <span className="text-slate-700 font-bold block mb-1">Upload Images</span>
                                <span className="text-slate-500 text-sm">Max {MAX_IMAGES} images, 5MB each</span>
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
                                    className="w-full py-3 bg-gradient-to-r from-violet-600 via-emerald-600 to-teal-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                <div className="flex gap-3 overflow-x-auto pb-2 pt-2 scrollbar-thin scrollbar-thumb-emerald-300">
                                    {formData.imagePreviews.map((img, i) => (
                                        <div key={i} className="relative shrink-0 group">
                                            <img 
                                                src={img} 
                                                className="w-24 h-24 object-cover rounded-xl border-4 border-white shadow-lg" 
                                                alt={`Preview ${i + 1}`}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => removeImage(i)}
                                                className="absolute -top-2 -right-2 text-rose-500 bg-white rounded-full p-1 shadow-md hover:text-rose-700 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
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
                                className="w-full border border-slate-200 p-4 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-slate-50/50 font-medium transition-all"
                                required 
                                maxLength={100}
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <select 
                                    name="condition" 
                                    value={formData.condition} 
                                    onChange={inputHandler} 
                                    className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 outline-none font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
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
                                    className="border border-slate-200 p-4 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-slate-50/50 font-medium"
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
                            className="w-full border border-slate-200 p-4 rounded-xl bg-slate-50/50 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 font-medium resize-none"
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
                <div className="p-6 border-t border-slate-100 bg-slate-50">
                    <button 
                        type="submit" 
                        form="post-ad-form"
                        disabled={loading} 
                        className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <FaSpinner className="animate-spin" />
                                Posting...
                            </>
                        ) : (
                            <>
                                <FaRocket />
                                Post Ad Now
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default PostAd;