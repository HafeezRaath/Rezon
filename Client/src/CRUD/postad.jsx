import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { 
    FaTimes, FaCamera, FaRocket, FaSpinner, FaMagic, FaTimesCircle,
    FaMobileAlt, FaCar, FaHome, FaLaptop, FaMotorcycle, FaBriefcase,
    FaDog, FaCouch, FaTshirt, FaBook, FaChild, FaTools, FaIndustry, FaBuilding
} from "react-icons/fa";
import LocationDropdown from "../Components/LocationDropdown";

const API_BASE_URL = "https://rezon.up.railway.app/api";

// 14 Categories as per your provided list
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

const PostAd = ({ onClose, onAdAdded }) => {
    const [step, setStep] = useState(1);
    const [selectedCat, setSelectedCat] = useState(null);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        title: "", condition: "Used", description: "", price: "", location: "",
        images: [], imagePreviews: [], suggestedPriceByAI: null
    });

    const inputHandler = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
            setFormData(prev => ({ ...prev, ...data, price: data.suggestedPrice || prev.price }));
            toast.success("AI Analysis Complete! ✨");
        } catch (err) { toast.error("AI Analysis failed."); }
        finally { setAiLoading(false); }
    };

    const submitAd = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("firebaseIdToken");
        setLoading(true);
        const postData = new FormData();
        
        Object.keys(formData).forEach(key => {
            if (key !== 'images' && key !== 'imagePreviews') postData.append(key, formData[key]);
        });
        postData.append("category", selectedCat.id);
        formData.images.forEach(f => postData.append("images", f));

        try {
            const res = await axios.post(`${API_BASE_URL}/ad`, postData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Ad Posted! 🚀");
            onClose();
            if (onAdAdded) onAdAdded(res.data);
        } catch (err) { toast.error("Failed to post ad."); }
        finally { setLoading(false); }
    };

    const modalContent = (
        <div className="fixed inset-0 flex justify-center items-center bg-black/70 backdrop-blur-md p-4 z-[999] animate-in fade-in duration-300">
            <div className="bg-[#f0f2f5] w-full max-w-lg rounded-[45px] shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh]">
                
                {/* Header */}
                <div className="p-8 text-center bg-white border-b border-gray-100">
                    <h2 className="text-2xl font-black text-emerald-600 uppercase tracking-tighter">
                        {step === 1 ? "What are you listing?" : `Post in: ${selectedCat.name}`}
                    </h2>
                    <button onClick={onClose} className="absolute right-8 top-8 text-gray-300 hover:text-rose-500 transition-all"><FaTimes size={24} /></button>
                </div>

                {/* Grid vs Form */}
                <div className="overflow-y-auto px-6 py-4 flex-1 custom-scrollbar">
                    {step === 1 ? (
                        <div className="grid grid-cols-3 gap-3">
                            {CATEGORIES.map(cat => (
                                <button key={cat.id} onClick={() => { setSelectedCat(cat); setStep(2); }} className="flex flex-col items-center justify-center p-4 rounded-[30px] border border-gray-50 bg-white hover:border-emerald-500 hover:bg-emerald-50 group transition-all">
                                    <div className="text-3xl text-gray-400 group-hover:text-emerald-600 mb-2">{cat.icon}</div>
                                    <span className="text-[10px] font-black text-gray-500 text-center uppercase leading-tight">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <form id="post-ad-form" className="space-y-4 pb-28">
                            <button onClick={() => setStep(1)} className="text-emerald-600 font-bold text-xs uppercase mb-2 block">← Change Category</button>
                            
                            <label className="block w-full py-10 border-2 border-dashed border-emerald-300 rounded-[35px] text-center bg-white cursor-pointer hover:bg-emerald-50 transition-all">
                                <FaCamera className="mx-auto text-emerald-500 text-3xl mb-2" />
                                <span className="text-gray-400 font-black text-xs">UPLOAD IMAGES (MULTIPLE)</span>
                                <input type="file" multiple onChange={imageHandler} className="hidden" />
                            </label>

                            {formData.images.length > 0 && (
                                <button type="button" onClick={handleAiAssist} disabled={aiLoading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-2">
                                    {aiLoading ? <FaSpinner className="animate-spin" /> : <><FaMagic /> AI AUTO-FILL</>}
                                </button>
                            )}

                            <input name="title" value={formData.title} onChange={inputHandler} placeholder="Ad Title *" className="w-full p-5 rounded-2xl bg-white outline-none font-bold shadow-sm" required />
                            
                            <div className="grid grid-cols-2 gap-3">
                                <select name="condition" value={formData.condition} onChange={inputHandler} className="p-5 rounded-2xl bg-white outline-none font-bold shadow-sm">
                                    <option value="Used">Used</option>
                                    <option value="New">New</option>
                                </select>
                                <input name="price" type="number" value={formData.price} onChange={inputHandler} placeholder="Price (PKR) *" className="p-5 rounded-2xl bg-white outline-none font-bold shadow-sm" required />
                            </div>

                            {/* Dynamic Fields from your list */}
                            {CATEGORY_FIELDS[selectedCat.id]?.map(field => (
                                field.type === "select" ? (
                                    <select key={field.name} name={field.name} onChange={inputHandler} className="w-full p-5 rounded-2xl bg-white outline-none font-bold shadow-sm">
                                        <option value="">{field.placeholder}</option>
                                        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                ) : (
                                    <input key={field.name} name={field.name} onChange={inputHandler} placeholder={field.placeholder} className="w-full p-5 rounded-2xl bg-white outline-none font-bold shadow-sm" />
                                )
                            ))}

                            <textarea name="description" value={formData.description} onChange={inputHandler} rows="4" placeholder="Full Description..." className="w-full p-5 rounded-[30px] bg-white outline-none font-bold shadow-sm resize-none" />
                            
                            <div className="bg-white rounded-2xl p-1 shadow-sm">
                                <LocationDropdown selected={formData.location} onChange={v => setFormData(p => ({...p, location: v}))} variant="form" />
                            </div>
                        </form>
                    )}
                </div>

                {/* Fixed Action Button */}
                {step === 2 && (
                    <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#f0f2f5] via-[#f0f2f5] to-transparent">
                        <button onClick={submitAd} disabled={loading} className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[30px] font-black text-xl shadow-xl transition-all flex items-center justify-center gap-3">
                            {loading ? <FaSpinner className="animate-spin" /> : <><FaRocket /> SUBMIT AD</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default PostAd;