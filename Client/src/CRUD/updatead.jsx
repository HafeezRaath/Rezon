import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { FaTimes, FaSpinner, FaCamera, FaTrash, FaSave, FaUndo } from "react-icons/fa";
import LocationDropdown from "../Components/LocationDropdown";

// 🔧 FIXED: Space removed
const API_BASE_URL = "https://rezon.up.railway.app/api";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Category Fields Configuration (Same as PostAd for consistency)
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
        { name: "unit", placeholder: "Area Unit", type: "select", options: ["Marla", "Kanal", "Sq. Ft."], required: true },
        { name: "bedrooms", placeholder: "Bedrooms", type: "number", min: 0 },
        { name: "bathrooms", placeholder: "Bathrooms", type: "number", min: 0 },
        { name: "possession", placeholder: "Possession", type: "select", options: ["Yes", "No"], required: true },
    ],
    PropertyRent: [
        { name: "propertyType", placeholder: "Type (House, Flat, Room)", type: "select", options: ["House", "Flat", "Room", "Office"], required: true },
        { name: "areaSize", placeholder: "Area Size", type: "text", required: true },
        { name: "unit", placeholder: "Area Unit", type: "select", options: ["Marla", "Kanal", "Sq. Ft."], required: true },
        { name: "rentDuration", placeholder: "Rent Duration", type: "select", options: ["Monthly", "Yearly"], required: true },
        { name: "deposit", placeholder: "Security Deposit", type: "number", min: 0 },
    ],
    Furniture: [
        { name: "material", placeholder: "Material (Wood, Steel)", type: "text", required: true },
        { name: "dimensions", placeholder: "Dimensions (e.g., 6x4 feet)", type: "text" },
        { name: "age", placeholder: "Age (years)", type: "number", min: 0 },
    ],
    Electronics: [
        { name: "itemType", placeholder: "Type (Laptop, TV, Camera)", type: "text", required: true },
        { name: "make", placeholder: "Brand", type: "text", required: true },
        { name: "model", placeholder: "Model", type: "text" },
        { name: "age", placeholder: "Age (months/years)", type: "text" },
        { name: "warrantyStatus", placeholder: "Warranty", type: "select", options: ["In Warranty", "Expired", "Not Applicable"], required: true },
    ],
    Bikes: [
        { name: "make", placeholder: "Make (Honda, Yamaha)", type: "text", required: true },
        { name: "model", placeholder: "Model Name", type: "text", required: true },
        { name: "year", placeholder: "Year", type: "number", required: true, min: 1900 },
        { name: "engineCC", placeholder: "Engine CC", type: "number", required: true },
        { name: "mileage", placeholder: "Mileage (KM)", type: "number", min: 0 },
    ],
    Business: [
        { name: "businessType", placeholder: "Type (Franchise, Machinery)", type: "text", required: true },
        { name: "investmentRequired", placeholder: "Investment (PKR)", type: "number", min: 0 },
        { name: "establishedYear", placeholder: "Year Established", type: "number" },
    ],
    Services: [
        { name: "serviceType", placeholder: "Service Type (Plumbing, Design)", type: "text", required: true },
        { name: "serviceArea", placeholder: "Service Area", type: "text" },
        { name: "pricing", placeholder: "Pricing Structure", type: "text" },
    ],
    Jobs: [
        { name: "jobTitle", placeholder: "Job Title (Driver, Developer)", type: "text", required: true },
        { name: "salaryRange", placeholder: "Salary Range (PKR/Month)", type: "text" },
        { name: "jobType", placeholder: "Employment Type", type: "select", options: ["Full-time", "Part-time", "Contract"], required: true },
        { name: "companyName", placeholder: "Company Name", type: "text" },
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
        { name: "material", placeholder: "Material", type: "text" },
        { name: "gender", placeholder: "Gender", type: "select", options: ["Men", "Women", "Unisex"], required: true },
    ],
    Books: [
        { name: "productType", placeholder: "Type (Book, Sports Gear)", type: "text", required: true },
        { name: "title", placeholder: "Book Title", type: "text", required: true },
        { name: "author", placeholder: "Author/Brand", type: "text" },
        { name: "genre", placeholder: "Genre/Sport", type: "text" },
        { name: "conditionRating", placeholder: "Condition (1-10)", type: "number", min: 1, max: 10 },
    ],
    Kids: [
        { name: "itemType", placeholder: "Item Type (Toy, Clothing)", type: "text", required: true },
        { name: "ageGroup", placeholder: "Age Group (2-5 years)", type: "text" },
        { name: "brand", placeholder: "Brand", type: "text" },
    ],
};

const getInitialState = () => ({
    images: [], // {file, preview} objects
    existingImages: [], // URLs
    imagesToDelete: [], // URLs marked for deletion
    title: "",
    condition: "New",
    description: "",
    price: "",
    location: "",
});

const UpdateAd = ({ adData, onClose, onUpdate, user }) => {
    const [formData, setFormData] = useState(getInitialState());
    const [loading, setLoading] = useState(false);

    // 🔧 FIXED: Proper cleanup - revoke preview URLs
    useEffect(() => {
        return () => {
            // Cleanup new image previews
            formData.images.forEach(({ preview }) => {
                URL.revokeObjectURL(preview);
            });
        };
    }, []); // Empty deps - only on unmount

    // Initialize form with ad data
    useEffect(() => {
        if (adData) {
            const loadedData = {
                images: [],
                existingImages: adData.images || [],
                imagesToDelete: [],
                title: adData.title || "",
                condition: adData.condition || "New",
                description: adData.description || "",
                price: adData.price?.toString() || "",
                location: adData.location || "",
                category: adData.category,
            };
            
            // Load category-specific details
            if (adData.details) {
                Object.entries(adData.details).forEach(([key, value]) => {
                    loadedData[key] = value;
                });
            }
            
            setFormData(loadedData);
        }
    }, [adData]);

    const currentCategoryFields = useMemo(() => 
        CATEGORY_FIELDS[adData?.category] || [], 
    [adData?.category]);

    const inputHandler = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const validateImage = useCallback((file) => {
        if (!file.type.startsWith('image/')) {
            toast.error(`${file.name} is not an image!`);
            return false;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error(`${file.name} is too large (max 5MB)`);
            return false;
        }
        return true;
    }, []);

    const imageHandler = useCallback((e) => {
        const files = Array.from(e.target.files);
        const currentTotal = formData.existingImages.length + formData.images.length;
        
        if (currentTotal + files.length > MAX_IMAGES) {
            toast.error(`Max ${MAX_IMAGES} images! Current: ${currentTotal}`);
            return;
        }

        const validFiles = files.filter(validateImage);
        if (validFiles.length === 0) return;

        const filesWithPreviews = validFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));

        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...filesWithPreviews]
        }));
    }, [formData.existingImages.length, formData.images.length, validateImage]);

    // Remove existing image
    const removeExistingImage = useCallback((index) => {
        const imageToRemove = formData.existingImages[index];
        setFormData(prev => ({
            ...prev,
            existingImages: prev.existingImages.filter((_, i) => i !== index),
            imagesToDelete: [...prev.imagesToDelete, imageToRemove]
        }));
        toast.success("Image marked for deletion");
    }, [formData.existingImages]);

    // Remove new image
    const removeNewImage = useCallback((index) => {
        const { preview } = formData.images[index];
        URL.revokeObjectURL(preview);
        
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    }, [formData.images]);

    // Restore removed image
    const restoreImage = useCallback((imageUrl) => {
        setFormData(prev => ({
            ...prev,
            existingImages: [...prev.existingImages, imageUrl],
            imagesToDelete: prev.imagesToDelete.filter(url => url !== imageUrl)
        }));
        toast.success("Image restored");
    }, []);

    const submitForm = useCallback(async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("firebaseIdToken");
        
        if (!token) {
            toast.error("Please login first! 🔒");
            return;
        }

        const totalImages = formData.existingImages.length + formData.images.length;
        if (totalImages === 0) {
            toast.error("At least one image required!");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Updating ad...");

        try {
            const finalFormData = new FormData();
            
            // Basic fields
            finalFormData.append("title", formData.title.trim());
            finalFormData.append("description", formData.description.trim());
            finalFormData.append("price", Number(formData.price));
            finalFormData.append("condition", formData.condition);
            finalFormData.append("location", formData.location);
            finalFormData.append("category", adData.category);

            // Category-specific fields
            const details = {};
            const numericFields = ['price', 'mileage', 'year', 'batteryHealth', 'investmentRequired', 
                                  'bedrooms', 'bathrooms', 'age', 'conditionRating', 'deposit',
                                  'engineCC', 'establishedYear'];

            currentCategoryFields.forEach(field => {
                const value = formData[field.name];
                if (value !== undefined && value !== "") {
                    details[field.name] = numericFields.includes(field.name) 
                        ? Number(value) || 0
                        : value;
                    finalFormData.append(field.name, details[field.name]);
                }
            });
            
            finalFormData.append("details", JSON.stringify(details));

            // Images to delete
            if (formData.imagesToDelete.length > 0) {
                finalFormData.append("imagesToDelete", JSON.stringify(formData.imagesToDelete));
            }

            // New images
            formData.images.forEach(({ file }) => {
                finalFormData.append("images", file);
            });

            // Existing images to keep
            finalFormData.append("existingImages", JSON.stringify(formData.existingImages));

            const res = await axios.put(
                `${API_BASE_URL}/ads/${adData._id}`,
                finalFormData,
                { 
                    headers: { 
                        "Content-Type": "multipart/form-data",
                        "Authorization": `Bearer ${token}`
                    },
                    timeout: 60000
                }
            );

            toast.success("✅ Ad updated!", { id: toastId });
            
            // Cleanup previews
            formData.images.forEach(({ preview }) => URL.revokeObjectURL(preview));
            
            onUpdate(res.data?.data || res.data);
            onClose();
        } catch (error) {
            console.error("Update Error:", error);
            const errorMsg = error.response?.data?.message || 
                           error.code === 'ECONNABORTED' ? "Timeout. Try smaller images." :
                           "Update failed. Try again.";
            toast.error(errorMsg, { id: toastId });
        } finally {
            setLoading(false);
        }
    }, [formData, currentCategoryFields, adData, onClose, onUpdate]);

    // Escape key handler
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const renderField = useCallback((field) => {
        if (field.dependsOn && formData[field.dependsOn.field] !== field.dependsOn.value) {
            return null;
        }

        const baseClasses = "w-full border border-slate-200 p-4 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-slate-50/50 font-medium transition-all";
        
        if (field.type === "select") {
            return (
                <div key={field.name} className="w-full">
                    <select 
                        name={field.name} 
                        value={formData[field.name] || ""} 
                        onChange={inputHandler} 
                        className={baseClasses}
                        required={field.required}
                    >
                        <option value="">{field.placeholder}</option>
                        {field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            );
        }
        
        return (
            <div key={field.name} className="w-full">
                <input 
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
            </div>
        );
    }, [formData, inputHandler]);

    if (!adData) return null;

    const totalImages = formData.existingImages.length + formData.images.length;
    const canAddMore = totalImages < MAX_IMAGES;

    const modalContent = (
        <div 
            className="fixed inset-0 flex justify-center items-center bg-slate-900/70 backdrop-blur-sm p-4 z-[999] animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header - Emerald Theme */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">
                            Update <span className="text-emerald-600">{adData.category}</span>
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 truncate max-w-[200px]">{adData.title}</p>
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
                    <form onSubmit={submitForm} className="space-y-6" id="update-ad-form">
                        
                        {/* Images Section */}
                        <div className="space-y-4">
                            
                            {/* Existing Images */}
                            {formData.existingImages.length > 0 && (
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 mb-2">
                                        Current Images ({formData.existingImages.length})
                                    </p>
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-emerald-300">
                                        {formData.existingImages.map((img, i) => (
                                            <div key={`existing-${i}`} className="relative shrink-0 group">
                                                <img 
                                                    src={img} 
                                                    className="w-24 h-24 object-cover rounded-xl border-4 border-white shadow-lg" 
                                                    alt={`Current ${i + 1}`}
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => removeExistingImage(i)}
                                                    className="absolute -top-2 -right-2 text-rose-500 bg-white rounded-full p-1.5 shadow-md hover:text-rose-700 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <FaTrash size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* New Images */}
                            {formData.images.length > 0 && (
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 mb-2">
                                        New Images ({formData.images.length})
                                    </p>
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-emerald-300">
                                        {formData.images.map(({ preview }, i) => (
                                            <div key={`new-${i}`} className="relative shrink-0 group">
                                                <img 
                                                    src={preview} 
                                                    className="w-24 h-24 object-cover rounded-xl border-4 border-white shadow-lg" 
                                                    alt={`New ${i + 1}`}
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => removeNewImage(i)}
                                                    className="absolute -top-2 -right-2 text-rose-500 bg-white rounded-full p-1.5 shadow-md hover:text-rose-700 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <FaTrash size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Removed Images - Restorable */}
                            {formData.imagesToDelete.length > 0 && (
                                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                                    <p className="text-sm font-semibold text-rose-700 mb-3">
                                        Marked for Deletion ({formData.imagesToDelete.length})
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        {formData.imagesToDelete.map((img, i) => (
                                            <button
                                                key={`removed-${i}`}
                                                type="button"
                                                onClick={() => restoreImage(img)}
                                                className="flex items-center gap-1.5 text-xs bg-white text-rose-600 px-3 py-1.5 rounded-full border border-rose-200 hover:bg-rose-100 transition-colors font-medium"
                                            >
                                                <FaUndo size={10} />
                                                Restore {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Upload Button */}
                            <label className={`block w-full p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                                canAddMore 
                                    ? 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50' 
                                    : 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50'
                            }`}>
                                <FaCamera className={`text-3xl mx-auto mb-2 ${
                                    canAddMore ? 'text-emerald-400' : 'text-slate-400'
                                }`} />
                                <span className="text-slate-700 font-bold block text-sm">
                                    {canAddMore 
                                        ? `Add Images (${totalImages}/${MAX_IMAGES})` 
                                        : `Max ${MAX_IMAGES} images reached`
                                    }
                                </span>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*" 
                                    onChange={imageHandler} 
                                    className="hidden" 
                                    disabled={!canAddMore}
                                />
                            </label>
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
                                    <option value="New">New</option>
                                    <option value="Used">Used</option>
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
                            placeholder="Describe your product..."
                            required
                            maxLength={2000}
                        />
                        
                        {/* Location */}
                        <LocationDropdown 
                            selected={formData.location} 
                            onChange={val => setFormData(prev => ({...prev, location: val}))} 
                            variant="form" 
                        />
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3.5 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-white hover:border-slate-400 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        form="update-ad-form"
                        disabled={loading} 
                        className="flex-[2] py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <FaSpinner className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <FaSave />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default UpdateAd;