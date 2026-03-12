import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { 
    FaTimes, FaSpinner, FaCamera, FaTrash, FaSave, FaUndo, FaMagic, FaMapMarkerAlt 
} from "react-icons/fa";
import LocationDropdown from "../Components/LocationDropdown";

const API_BASE_URL = "https://rezon.up.railway.app/api";
const MAX_IMAGES = 10;

// Category Fields Configuration (PostAd se sync kiya gaya hai)
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

const UpdateAd = ({ adData, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        title: "",
        condition: "Used",
        description: "",
        price: "",
        location: "",
        images: [], // New files
        imagePreviews: [], // For new files
        existingImages: [], // Already on server
        imagesToDelete: [], // Marked for removal
        categoryDetails: {}
    });

    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    // Initial Data Load
    useEffect(() => {
        if (adData) {
            setFormData({
                title: adData.title || "",
                condition: adData.condition || "Used",
                description: adData.description || "",
                price: adData.price || "",
                location: adData.location || "",
                existingImages: adData.images || [],
                images: [],
                imagePreviews: [],
                imagesToDelete: [],
                categoryDetails: adData.details || {}
            });
        }
    }, [adData]);

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
        const totalCount = formData.existingImages.length + formData.images.length + files.length;
        if (totalCount > MAX_IMAGES) return toast.error(`Max ${MAX_IMAGES} images allowed!`);

        const previews = files.map(file => URL.createObjectURL(file));
        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...files],
            imagePreviews: [...prev.imagePreviews, ...previews]
        }));
    };

    const removeNewImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
            imagePreviews: prev.imagePreviews.filter((_, i) => i !== index)
        }));
    };

    const removeExistingImage = (url) => {
        setFormData(prev => ({
            ...prev,
            existingImages: prev.existingImages.filter(img => img !== url),
            imagesToDelete: [...prev.imagesToDelete, url]
        }));
    };

    const restoreImage = (url) => {
        setFormData(prev => ({
            ...prev,
            existingImages: [...prev.existingImages, url],
            imagesToDelete: prev.imagesToDelete.filter(img => img !== url)
        }));
    };

    const handleAiAssist = async () => {
        const hasImages = formData.images.length > 0 || formData.existingImages.length > 0;
        if (!hasImages) return toast.error("Upload or keep images first!");
        
        setAiLoading(true);
        const aiFormData = new FormData();
        
        // AI normally works best with actual files, but we can send what we have
        formData.images.forEach(f => aiFormData.append("images", f));
        aiFormData.append("category", adData.category);

        try {
            const token = localStorage.getItem("firebaseIdToken");
            const res = await axios.post(`${API_BASE_URL}/ad/ai-assist`, aiFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data.data;
            setFormData(prev => ({
                ...prev,
                title: data.title || prev.title,
                description: data.description || prev.description,
                price: data.suggestedPrice || prev.price,
                categoryDetails: { ...prev.categoryDetails, ...data.details }
            }));
            toast.success("AI Update Complete! ✨");
        } catch (err) {
            toast.error("AI Analysis failed.");
        } finally { setAiLoading(false); }
    };

    const shouldShowField = (field) => {
        if (!field.showWhen) return true;
        const { field: dependField, value: dependValue } = field.showWhen;
        return formData.categoryDetails[dependField] === dependValue;
    };

    const submitUpdate = async (e) => {
        e.preventDefault();
        if(!formData.title || !formData.price || !formData.location) return toast.error("Required fields missing!");

        setLoading(true);
        const updateData = new FormData();
        updateData.append("title", formData.title);
        updateData.append("price", formData.price);
        updateData.append("description", formData.description);
        updateData.append("location", formData.location);
        updateData.append("condition", formData.condition);
        updateData.append("details", JSON.stringify(formData.categoryDetails));
        updateData.append("existingImages", JSON.stringify(formData.existingImages));
        updateData.append("imagesToDelete", JSON.stringify(formData.imagesToDelete));
        
        formData.images.forEach(f => updateData.append("images", f));

        try {
            const token = localStorage.getItem("firebaseIdToken");
            const res = await axios.put(`${API_BASE_URL}/ad/${adData._id}`, updateData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Ad Updated! 🚀");
            if (onUpdate) onUpdate(res.data);
            onClose();
        } catch (err) {
            toast.error("Update failed.");
        } finally { setLoading(false); }
    };

    const modalContent = (
        <div className="fixed inset-0 flex justify-center items-center bg-black/80 backdrop-blur-md p-2 z-[9999]" onClick={onClose}>
            <div className="bg-[#f0f2f5] w-full max-w-lg rounded-[30px] shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-4 bg-white border-b flex items-center justify-between">
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 transition-all"><FaTimes size={20} /></button>
                    <h2 className="text-lg font-black text-emerald-600 uppercase">Update Ad</h2>
                    <div className="w-8"></div>
                </div>

                <div className="overflow-y-auto px-4 py-6 flex-1 space-y-4 pb-24">
                    {/* Image Management */}
                    <div className="grid grid-cols-4 gap-2">
                        {/* Existing Images */}
                        {formData.existingImages.map((src, i) => (
                            <div key={`ex-${i}`} className="relative group">
                                <img src={src} className="w-full aspect-square object-cover rounded-xl border-2 border-emerald-500" alt="existing" />
                                <button onClick={() => removeExistingImage(src)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                            </div>
                        ))}
                        {/* New Previews */}
                        {formData.imagePreviews.map((src, i) => (
                            <div key={`new-${i}`} className="relative group">
                                <img src={src} className="w-full aspect-square object-cover rounded-xl border-2 border-white" alt="new" />
                                <button onClick={() => removeNewImage(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                            </div>
                        ))}
                        {/* Upload Trigger */}
                        {(formData.existingImages.length + formData.images.length) < MAX_IMAGES && (
                            <label className="aspect-square border-2 border-dashed border-emerald-300 rounded-xl flex items-center justify-center cursor-pointer bg-emerald-50">
                                <FaCamera className="text-emerald-500" />
                                <input type="file" multiple onChange={imageHandler} className="hidden" accept="image/*" />
                            </label>
                        )}
                    </div>

                    {/* Restore Area */}
                    {formData.imagesToDelete.length > 0 && (
                        <div className="p-2 bg-red-50 rounded-xl flex flex-wrap gap-2">
                            <span className="text-[10px] font-bold text-red-400 w-full">Marked for delete:</span>
                            {formData.imagesToDelete.map((img, i) => (
                                <button key={i} onClick={() => restoreImage(img)} className="text-[9px] bg-white border border-red-200 px-2 py-1 rounded-md text-red-500 hover:bg-red-500 hover:text-white transition-colors">Restore Image {i+1}</button>
                            ))}
                        </div>
                    )}

                    <button type="button" onClick={handleAiAssist} disabled={aiLoading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg">
                        {aiLoading ? <FaSpinner className="animate-spin" /> : <><FaMagic /> AI SMART SYNC</>}
                    </button>

                    {/* Form Fields */}
                    <div className="space-y-3">
                        <input name="title" value={formData.title} onChange={inputHandler} placeholder="Title *" className="w-full p-4 rounded-2xl bg-white outline-none font-bold shadow-sm border border-transparent focus:border-emerald-500 transition-all" />
                        
                        <div className="grid grid-cols-2 gap-3">
                            <input name="price" type="number" value={formData.price} onChange={inputHandler} placeholder="Price *" className="p-4 rounded-2xl bg-white outline-none font-bold shadow-sm border border-transparent focus:border-emerald-500 transition-all" />
                            <select name="condition" value={formData.condition} onChange={inputHandler} className="p-4 rounded-2xl bg-white outline-none font-bold shadow-sm border border-transparent focus:border-emerald-500 transition-all">
                                <option value="Used">Used</option>
                                <option value="New">New</option>
                            </select>
                        </div>

                        {/* Dynamic Details */}
                        {CATEGORY_FIELDS[adData.category]?.map(field => (
                            shouldShowField(field) && (
                                <div key={field.name}>
                                    {field.type === "select" ? (
                                        <select name={field.name} value={formData.categoryDetails[field.name] || ""} onChange={detailHandler} className="w-full p-4 rounded-2xl bg-white outline-none font-bold shadow-sm border border-transparent focus:border-emerald-500 transition-all">
                                            <option value="">{field.placeholder}</option>
                                            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : (
                                        <input name={field.name} type={field.type} value={formData.categoryDetails[field.name] || ""} onChange={detailHandler} placeholder={field.placeholder} className="w-full p-4 rounded-2xl bg-white outline-none font-bold shadow-sm border border-transparent focus:border-emerald-500 transition-all" />
                                    )}
                                </div>
                            )
                        ))}

                        <textarea name="description" value={formData.description} onChange={inputHandler} rows="3" placeholder="Description *" className="w-full p-4 rounded-[25px] bg-white outline-none font-bold shadow-sm border border-transparent focus:border-emerald-500 transition-all resize-none" />
                        
                        <div className="relative group">
                            <label className="block text-[9px] font-black text-emerald-600 mb-1 ml-4 uppercase">Location *</label>
                            <div className="flex items-center bg-white rounded-2xl shadow-sm border border-transparent p-1">
                                <div className="pl-4 pr-1 text-emerald-500"><FaMapMarkerAlt size={18} /></div>
                                <div className="flex-1">
                                    <LocationDropdown selected={formData.location} onChange={v => setFormData(p => ({...p, location: v}))} variant="default" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f0f2f5] to-transparent">
                    <button onClick={submitUpdate} disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-[30px] font-black text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-70">
                        {loading ? <FaSpinner className="animate-spin" /> : <><FaSave /> SAVE CHANGES</>}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default UpdateAd;