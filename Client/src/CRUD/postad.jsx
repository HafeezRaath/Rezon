import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { 
    FaTimes, FaCamera, FaRocket, FaSpinner, FaMagic, 
    FaMapMarkerAlt, FaPhone, FaCheckCircle,
    FaMobileAlt, FaCar, FaHome, FaLaptop, FaMotorcycle, FaBriefcase,
    FaDog, FaCouch, FaTshirt, FaBook, FaChild, FaTools, FaIndustry, FaBuilding
} from "react-icons/fa";
import LocationDropdown from "../Components/LocationDropdown";

const API_BASE_URL = "https://rezon.up.railway.app/api";

const CATEGORIES = [
    { id: "Mobile", name: "Mobiles", icon: <FaMobileAlt /> },
    { id: "Car", name: "Vehicles", icon: <FaCar /> },
    { id: "PropertySale", name: "Property Sale", icon: <FaBuilding /> },
    { id: "PropertyRent", name: "Property Rent", icon: <FaHome /> },
    { id: "Electronics", name: "Electronics", icon: <FaLaptop /> },
    { id: "Bikes", name: "Bikes", icon: <FaMotorcycle /> },
    { id: "Business", name: "Business", icon: <FaIndustry /> },
    { id: "Services", name: "Services", icon: <FaTools /> },
    { id: "Jobs", name: "Jobs", icon: <FaBriefcase /> },
    { id: "Animals", name: "Animals", icon: <FaDog /> },
    { id: "Furniture", name: "Furniture", icon: <FaCouch /> },
    { id: "Fashion", name: "Fashion", icon: <FaTshirt /> },
    { id: "Books", name: "Books", icon: <FaBook /> },
    { id: "Kids", name: "Kids", icon: <FaChild /> },
];

const CATEGORY_FIELDS = {
    Mobile: [
        { name: "brand", placeholder: "Brand (e.g., Samsung)", type: "text", required: true },
        { name: "model", placeholder: "Model (e.g., S21 Ultra)", type: "text", required: true },
        { name: "storage", placeholder: "Storage (e.g., 128GB)", type: "text", required: true },
        { name: "ram", placeholder: "RAM (e.g., 8GB)", type: "text", required: true },
        { name: "batteryHealth", placeholder: "Battery Health %", type: "number", required: true, min: 0, max: 100 },
        { name: "ptaStatus", placeholder: "PTA Status", type: "select", options: ["Approved", "Non-Approved", "Blocked"], required: true },
        { name: "warranty", placeholder: "Warranty", type: "select", options: ["Available", "Not Available"], required: true },
        { name: "warrantyDuration", placeholder: "Warranty Duration (Months)", type: "number", min: 1, max: 60, showWhen: { field: "warranty", value: "Available" } },
        { name: "accessories", placeholder: "Accessories (Box, Charger)", type: "text" },
    ],
    // ... baaki categories same ...
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

const PostAd = ({ onClose, onAdAdded }) => {
    const [step, setStep] = useState(1);
    const [selectedCat, setSelectedCat] = useState(null);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [userPhone, setUserPhone] = useState(""); // ✅ User ka phone number
    
    const [formData, setFormData] = useState({
        title: "", 
        condition: "Used", 
        description: "",   
        price: "", 
        location: "",      
        phoneNumber: "", 
        images: [], 
        imagePreviews: [],
        imageQuality: "Original", 
        categoryDetails: {} 
    });

    // ✅ Fetch user profile with phone number
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem("firebaseIdToken");
                const res = await axios.get(`${API_BASE_URL}/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const phone = res.data.phoneNumber || "";
                setUserPhone(phone);
                
                if (phone) {
                    setFormData(prev => ({ 
                        ...prev, 
                        phoneNumber: phone 
                    }));
                }
            } catch (err) { 
                console.error("Profile Fetch Error", err); 
            }
        };
        fetchProfile();
    }, []);

    const inputHandler = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const detailHandler = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            categoryDetails: { ...prev.categoryDetails, [name]: value }
        }));
    };

    const imageHandler = (e) => {
        const files = Array.from(e.target.files);
        if (formData.images.length + files.length > 10) return toast.error("Max 10 images!");
        const previews = files.map(file => URL.createObjectURL(file));
        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...files],
            imagePreviews: [...prev.imagePreviews, ...previews]
        }));
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
            imagePreviews: prev.imagePreviews.filter((_, i) => i !== index)
        }));
    };

    const handleAiAssist = async () => {
        if (formData.images.length === 0) return toast.error("Upload images first!");
        setAiLoading(true);
        const aiData = new FormData();
        formData.images.forEach(f => aiData.append("images", f));
        aiData.append("category", selectedCat.id);

        try {
            const token = localStorage.getItem("firebaseIdToken");
            const res = await axios.post(`${API_BASE_URL}/ad/ai-assist`, aiData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data.data;
            setFormData(prev => ({ 
                ...prev, 
                title: data.title || prev.title,
                description: data.description || prev.description,
                condition: data.condition || prev.condition,
                price: data.suggestedPrice || prev.price,
                imageQuality: data.imageQuality || "Original",
                categoryDetails: { ...prev.categoryDetails, ...data.details }
            }));
            toast.success("AI Analysis Complete! ✨");
        } catch (err) { 
            toast.error("AI Analysis failed."); 
        }
        finally { setAiLoading(false); }
    };

    // ✅ Check if field should be shown (conditional logic)
    const shouldShowField = (field) => {
        if (!field.showWhen) return true;
        const { field: dependField, value: dependValue } = field.showWhen;
        return formData.categoryDetails[dependField] === dependValue;
    };

    const submitAd = async (e) => {
        if(e) e.preventDefault();
        
        if(!formData.title || !formData.price || !formData.location || !formData.description) {
            return toast.error("Title, Price, Location aur Description lazmi hain!");
        }

        const token = localStorage.getItem("firebaseIdToken");
        setLoading(true);
        const postData = new FormData();
        
        postData.append("title", formData.title);
        postData.append("price", formData.price);
        postData.append("description", formData.description);
        postData.append("location", formData.location);
        postData.append("condition", formData.condition);
        postData.append("category", selectedCat.id);
        postData.append("phoneNumber", formData.phoneNumber || userPhone);
        postData.append("imageQualityByAI", formData.imageQuality);
        postData.append("details", JSON.stringify(formData.categoryDetails));
        formData.images.forEach(f => postData.append("images", f));

        try {
            const res = await axios.post(`${API_BASE_URL}/ad`, postData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success("Ad Posted Successfully! 🚀");
            
            // ✅ Form band kar do
            if (onAdAdded) onAdAdded(res.data);
            onClose(); // Yeh form band karega
            
        } catch (err) { 
            toast.error(err.response?.data?.message || "Failed to post ad."); 
        }
        finally { setLoading(false); }
    };

    const modalContent = (
        <div className="fixed inset-0 flex justify-center items-center bg-black/80 backdrop-blur-md p-2 sm:p-4 z-[9999]" onClick={onClose}>
            <div className="bg-[#f0f2f5] w-full max-w-lg rounded-[30px] sm:rounded-[45px] shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
                
                {/* ✅ Header with Cancel Button */}
                <div className="p-4 sm:p-6 text-center bg-white border-b border-gray-100 relative flex items-center justify-between">
                    <button 
                        onClick={onClose} 
                        className="p-2 text-gray-400 hover:text-red-500 transition-all rounded-full hover:bg-red-50"
                        title="Cancel"
                    >
                        <FaTimes size={20} />
                    </button>
                    
                    <h2 className="text-lg sm:text-xl font-black text-emerald-600 uppercase flex-1 text-center">
                        {step === 1 ? "Select Category" : `Post: ${selectedCat.name}`}
                    </h2>
                    
                    <div className="w-8"></div> {/* Spacer for balance */}
                </div>

                {/* Scrollable Body */}
                <div className="overflow-y-auto px-4 sm:px-8 py-4 flex-1 custom-scrollbar">
                    {step === 1 ? (
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {CATEGORIES.map(cat => (
                                <button 
                                    key={cat.id} 
                                    onClick={() => { setSelectedCat(cat); setStep(2); }} 
                                    className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-[20px] sm:rounded-[30px] border border-gray-100 bg-white hover:border-emerald-500 hover:bg-emerald-50 transition-all active:scale-95"
                                >
                                    <div className="text-2xl sm:text-3xl text-emerald-600 mb-2">{cat.icon}</div>
                                    <span className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase text-center leading-tight">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4 pb-24">
                            <div className="flex items-center justify-between">
                                <button 
                                    onClick={() => setStep(1)} 
                                    className="text-emerald-600 font-bold text-[10px] tracking-widest uppercase hover:underline"
                                >
                                    ← Change Category
                                </button>
                                
                                {/* ✅ Cancel button in step 2 also */}
                                <button 
                                    onClick={onClose}
                                    className="text-red-500 font-bold text-[10px] tracking-widest uppercase hover:underline"
                                >
                                    Cancel
                                </button>
                            </div>
                            
                            {/* Images */}
                            <div className="grid grid-cols-4 gap-2">
                                {formData.imagePreviews.map((src, i) => (
                                    <div key={i} className="relative group">
                                        <img 
                                            src={src} 
                                            className="w-full aspect-square object-cover rounded-xl border-2 border-white shadow-sm" 
                                            alt="preview" 
                                        />
                                        <button
                                            onClick={() => removeImage(i)}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                {formData.images.length < 10 && (
                                    <label className="aspect-square border-2 border-dashed border-emerald-300 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-emerald-50/30 hover:bg-emerald-50 transition-colors active:scale-95">
                                        <FaCamera className="text-emerald-500 text-xl" />
                                        <input type="file" multiple onChange={imageHandler} className="hidden" accept="image/*" />
                                    </label>
                                )}
                            </div>

                            <button 
                                type="button" 
                                onClick={handleAiAssist} 
                                disabled={aiLoading || formData.images.length === 0} 
                                className="w-full py-3 sm:py-4 bg-slate-900 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                            >
                                {aiLoading ? <FaSpinner className="animate-spin" /> : <><FaMagic /> AI SMART FILL</>}
                            </button>

                            <div className="space-y-3">
                                <input 
                                    name="title" 
                                    value={formData.title} 
                                    onChange={inputHandler} 
                                    placeholder="What are you selling? *" 
                                    className="w-full p-4 sm:p-5 rounded-2xl bg-white outline-none font-bold shadow-sm border border-transparent focus:border-emerald-500 transition-all" 
                                />
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <input 
                                        name="price" 
                                        type="number" 
                                        value={formData.price} 
                                        onChange={inputHandler} 
                                        placeholder="Price (PKR) *" 
                                        className="p-4 sm:p-5 rounded-2xl bg-white outline-none font-bold shadow-sm border border-transparent focus:border-emerald-500 transition-all" 
                                    />
                                    <select 
                                        name="condition" 
                                        value={formData.condition} 
                                        onChange={inputHandler} 
                                        className="p-4 sm:p-5 rounded-2xl bg-white outline-none font-bold shadow-sm border border-transparent focus:border-emerald-500 transition-all cursor-pointer"
                                    >
                                        <option value="Used">Used</option>
                                        <option value="New">New</option>
                                    </select>
                                </div>

                                {/* ✅ Dynamic Fields with Conditional Warranty */}
                                {CATEGORY_FIELDS[selectedCat.id]?.map(field => {
                                    // Check if field should be shown
                                    if (!shouldShowField(field)) return null;
                                    
                                    return (
                                        <div key={field.name}>
                                            {field.type === "select" ? (
                                                <select 
                                                    name={field.name} 
                                                    value={formData.categoryDetails[field.name] || ""} 
                                                    onChange={detailHandler} 
                                                    className="w-full p-4 sm:p-5 rounded-2xl bg-white outline-none font-bold shadow-sm border border-transparent focus:border-emerald-500 transition-all"
                                                >
                                                    <option value="">{field.placeholder}{field.required ? ' *' : ''}</option>
                                                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            ) : (
                                                <input 
                                                    name={field.name} 
                                                    type={field.type || "text"}
                                                    min={field.min}
                                                    max={field.max}
                                                    value={formData.categoryDetails[field.name] || ""} 
                                                    onChange={detailHandler} 
                                                    placeholder={`${field.placeholder}${field.required ? ' *' : ''}`}
                                                    className="w-full p-4 sm:p-5 rounded-2xl bg-white outline-none font-bold shadow-sm border border-transparent focus:border-emerald-500 transition-all" 
                                                />
                                            )}
                                        </div>
                                    );
                                })}

                                <textarea 
                                    name="description" 
                                    value={formData.description} 
                                    onChange={inputHandler} 
                                    rows="3" 
                                    placeholder="Describe your item... *" 
                                    className="w-full p-4 sm:p-5 rounded-[25px] bg-white outline-none font-bold shadow-sm border border-transparent focus:border-emerald-500 transition-all resize-none" 
                                />
                                
                                {/* ✅ Contact Number - Auto-filled from user profile */}
                                <div className="relative group">
                                    <label className="block text-[9px] font-black text-emerald-600 mb-1 ml-4 uppercase tracking-tighter">Contact Number *</label>
                                    <div className="flex items-center bg-white rounded-2xl shadow-sm border border-transparent group-focus-within:border-emerald-500 transition-all p-1">
                                        <div className="pl-4 pr-2 text-emerald-500">
                                            <FaPhone size={16} />
                                        </div>
                                        <input
                                            name="phoneNumber"
                                            type="tel"
                                            value={formData.phoneNumber}
                                            onChange={inputHandler}
                                            placeholder="03XX-XXXXXXX"
                                            className="flex-1 p-3 outline-none font-bold text-sm"
                                        />
                                        {userPhone && formData.phoneNumber === userPhone && (
                                            <div className="pr-3 text-emerald-500" title="Verified number from profile">
                                                <FaCheckCircle size={16} />
                                            </div>
                                        )}
                                    </div>
                                    {userPhone && (
                                        <p className="text-[10px] text-slate-500 mt-1 ml-4">
                                            Using number from your profile. Tap to change.
                                        </p>
                                    )}
                                </div>

                                {/* Location */}
                                <div className="relative group">
                                    <label className="block text-[9px] font-black text-emerald-600 mb-1 ml-4 uppercase tracking-tighter">Location / City *</label>
                                    <div className="flex items-center bg-white rounded-2xl shadow-sm border border-transparent group-focus-within:border-emerald-500 transition-all p-1">
                                        <div className="pl-4 pr-1 text-emerald-500">
                                            <FaMapMarkerAlt size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <LocationDropdown 
                                                selected={formData.location} 
                                                onChange={v => setFormData(p => ({...p, location: v}))} 
                                                variant="default" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                {step === 2 && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-[#f0f2f5] via-[#f0f2f5] to-transparent">
                        <button 
                            onClick={submitAd} 
                            disabled={loading} 
                            className="w-full py-3 sm:py-4 bg-emerald-600 text-white rounded-[25px] sm:rounded-[30px] font-black text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-70"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : <><FaRocket /> POST NOW</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default PostAd;