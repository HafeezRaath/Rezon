import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { FaTimes, FaSpinner, FaCamera, FaTrash, FaSave } from "react-icons/fa";
import LocationDropdown from "../Components/LocationDropdown";

const API_BASE_URL = "https://rezon.up.railway.app/api";
const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Category Fields Configuration
const CATEGORY_FIELDS = {
    "Mobile": [
        { name: "brand", placeholder: "Brand (e.g., Samsung)", type: "text", required: true },
        { name: "model", placeholder: "Model (e.g., S21 Ultra)", type: "text", required: true },
        { name: "storage", placeholder: "Storage (e.g., 128GB)", type: "text", required: true },
        { name: "ram", placeholder: "RAM (e.g., 8GB)", type: "text", required: true },
        { name: "batteryHealth", placeholder: "Battery Health %", type: "number", required: true, min: 0, max: 100 },
        { name: "ptaStatus", placeholder: "PTA Status", type: "select", options: ["Approved", "Non-Approved", "Blocked"], required: true },
        { name: "warranty", placeholder: "Warranty", type: "select", options: ["Available", "Not Available"], required: true },
        { name: "warrantyDuration", placeholder: "Warranty Duration (if Available)", type: "text", dependsOn: { field: "warranty", value: "Available" } },
        { name: "accessories", placeholder: "Accessories (e.g., Box, Charger)", type: "text" },
    ],
    "Car": [
        { name: "make", placeholder: "Make (e.g., Honda, Toyota)", type: "text", required: true },
        { name: "carModel", placeholder: "Model (e.g., Civic, Corolla)", type: "text", required: true },
        { name: "year", placeholder: "Manufacturing Year", type: "number", required: true, min: 1900, max: new Date().getFullYear() + 1 },
        { name: "mileage", placeholder: "Mileage (in KM)", type: "number", required: true, min: 0 },
        { name: "fuelType", placeholder: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "Hybrid", "Electric"], required: true },
        { name: "transmission", placeholder: "Transmission", type: "select", options: ["Automatic", "Manual"], required: true },
        { name: "registrationCity", placeholder: "Registration City", type: "text", required: true },
    ],
    "Furniture": [
        { name: "material", placeholder: "Material (Wood, Plastic)", type: "text", required: true },
        { name: "dimensions", placeholder: "Dimensions (e.g., 6ft x 3ft)", type: "text" },
        { name: "age", placeholder: "Age (in years)", type: "number", min: 0 },
    ],
    "PropertySale": [
        { name: "propertyType", placeholder: "Type (House, Plot, Flat)", type: "select", options: ["House", "Plot", "Flat", "Farm House"], required: true },
        { name: "areaSize", placeholder: "Area Size (e.g., 5 Marla)", type: "text", required: true },
        { name: "unit", placeholder: "Area Unit", type: "select", options: ["Marla", "Kanal", "Sq. Ft."], required: true },
        { name: "bedrooms", placeholder: "Number of Bedrooms", type: "number", min: 0 },
        { name: "bathrooms", placeholder: "Number of Bathrooms", type: "number", min: 0 },
        { name: "possession", placeholder: "Possession Status", type: "select", options: ["Yes", "No"], required: true },
    ],
    "PropertyRent": [
        { name: "propertyType", placeholder: "Type (House, Flat, Room)", type: "select", options: ["House", "Flat", "Room", "Office"], required: true },
        { name: "areaSize", placeholder: "Area Size (e.g., 10 Marla)", type: "text", required: true },
        { name: "unit", placeholder: "Area Unit", type: "select", options: ["Marla", "Kanal", "Sq. Ft."], required: true },
        { name: "rentDuration", placeholder: "Rent Duration", type: "select", options: ["Monthly", "Yearly"], required: true },
        { name: "deposit", placeholder: "Security Deposit Amount", type: "number", min: 0 },
    ],
    "Electronics": [
        { name: "itemType", placeholder: "Item Type (TV, AC, Fridge)", type: "text", required: true },
        { name: "make", placeholder: "Make/Brand", type: "text", required: true },
        { name: "model", placeholder: "Model Name", type: "text" },
        { name: "age", placeholder: "Age (in months/years)", type: "text" },
        { name: "warrantyStatus", placeholder: "Warranty Status", type: "select", options: ["In Warranty", "Expired", "Not Applicable"], required: true },
    ],
    "Bikes": [
        { name: "make", placeholder: "Make (e.g., Honda, Yamaha)", type: "text", required: true },
        { name: "model", placeholder: "Model Name", type: "text", required: true },
        { name: "year", placeholder: "Manufacturing Year", type: "number", required: true, min: 1900, max: new Date().getFullYear() + 1 },
        { name: "engineCC", placeholder: "Engine CC (e.g., 125, 70)", type: "number", required: true },
        { name: "mileage", placeholder: "Mileage (in KM)", type: "number", min: 0 },
    ],
    "Business": [
        { name: "businessType", placeholder: "Type (Franchise, Machinery)", type: "text", required: true },
        { name: "investmentRequired", placeholder: "Investment Required (PKR)", type: "number", min: 0 },
        { name: "establishedYear", placeholder: "Year Established", type: "number" },
    ],
    "Services": [
        { name: "serviceType", placeholder: "Service Type (e.g., Plumbing, Web Design)", type: "text", required: true },
        { name: "serviceArea", placeholder: "Service Area (City/Locality)", type: "text" },
        { name: "pricing", placeholder: "Pricing Structure", type: "text" },
    ],
    "Jobs": [
        { name: "jobTitle", placeholder: "Job Title (e.g., Driver, Developer)", type: "text", required: true },
        { name: "salaryRange", placeholder: "Salary Range (PKR/Month)", type: "text" },
        { name: "jobType", placeholder: "Employment Type", type: "select", options: ["Full-time", "Part-time", "Contract"], required: true },
        { name: "companyName", placeholder: "Company Name", type: "text" },
    ],
    "Animals": [
        { name: "animalType", placeholder: "Type (Dog, Cat, Bird)", type: "text", required: true },
        { name: "breed", placeholder: "Breed", type: "text" },
        { name: "age", placeholder: "Age (in months/years)", type: "text" },
        { name: "vaccination", placeholder: "Vaccination Status", type: "select", options: ["Vaccinated", "Not Vaccinated"], required: true },
    ],
    "Fashion": [
        { name: "itemType", placeholder: "Item Type (Shirt, Shoes, Makeup)", type: "text", required: true },
        { name: "size", placeholder: "Size (S, M, L, 40, etc.)", type: "text" },
        { name: "material", placeholder: "Material (Cotton, Leather)", type: "text" },
        { name: "gender", placeholder: "Gender", type: "select", options: ["Men", "Women", "Unisex"], required: true },
    ],
    "Books": [
        { name: "productType", placeholder: "Type (Book, Sports Gear, Instrument)", type: "text", required: true },
        { name: "title", placeholder: "Book/Product Title", type: "text", required: true },
        { name: "author", placeholder: "Author/Brand", type: "text" },
        { name: "genre", placeholder: "Genre/Sport", type: "text" },
        { name: "conditionRating", placeholder: "Condition (1-10)", type: "number", min: 1, max: 10 },
    ],
    "Kids": [
        { name: "itemType", placeholder: "Item Type (Toy, Clothing, Stroller)", type: "text", required: true },
        { name: "ageGroup", placeholder: "Age Group (e.g., 2-5 years)", type: "text" },
        { name: "brand", placeholder: "Brand", type: "text" },
    ],
};

const getInitialState = () => ({
    images: [], // New files to upload
    existingImages: [], // URLs of existing images
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
    const [removedImages, setRemovedImages] = useState([]);

    // 🧹 Cleanup object URLs
    useEffect(() => {
        return () => {
            formData.images.forEach(file => {
                if (file instanceof File) {
                    URL.revokeObjectURL(file.preview);
                }
            });
        };
    }, [formData.images]);

    // Initialize form with ad data
    useEffect(() => {
        if (adData) {
            const categoryFields = CATEGORY_FIELDS[adData.category] || [];
            
            let loadedData = {
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
                Object.keys(adData.details).forEach(key => {
                    loadedData[key] = adData.details[key];
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
        const currentTotal = formData.existingImages.length + formData.images.length;
        
        if (currentTotal + files.length > MAX_IMAGES) {
            toast.error(`Max ${MAX_IMAGES} images allowed! You have ${currentTotal} currently.`);
            return;
        }

        const validFiles = files.filter(validateImage);
        if (validFiles.length === 0) return;

        // Add preview URL to each file
        const filesWithPreviews = validFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));

        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...filesWithPreviews]
        }));
    }, [formData.existingImages.length, formData.images.length]);

    // Remove existing image (mark for deletion)
    const removeExistingImage = useCallback((index) => {
        const imageToRemove = formData.existingImages[index];
        setFormData(prev => ({
            ...prev,
            existingImages: prev.existingImages.filter((_, i) => i !== index),
            imagesToDelete: [...prev.imagesToDelete, imageToRemove]
        }));
        setRemovedImages(prev => [...prev, imageToRemove]);
        toast.success("Image marked for deletion. Save to confirm.");
    }, [formData.existingImages]);

    // Remove new image
    const removeNewImage = useCallback((index) => {
        const fileToRemove = formData.images[index];
        URL.revokeObjectURL(fileToRemove.preview);
        
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
        setRemovedImages(prev => prev.filter(url => url !== imageUrl));
    }, []);

    const submitForm = useCallback(async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("firebaseIdToken");
        
        if (!token) {
            toast.error("Please login first! 🔒");
            return;
        }

        // Validation
        if (formData.existingImages.length + formData.images.length === 0) {
            toast.error("At least one image is required!");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Updating your ad...");

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
            currentCategoryFields.forEach(field => {
                if (formData[field.name] !== undefined && formData[field.name] !== "") {
                    const value = ['price', 'mileage', 'year', 'batteryHealth', 'investmentRequired', 
                                  'bedrooms', 'bathrooms', 'age', 'conditionRating', 'deposit',
                                  'engineCC'].includes(field.name) 
                        ? Number(formData[field.name]) || 0
                        : formData[field.name];
                    
                    details[field.name] = value;
                    finalFormData.append(field.name, value);
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

            toast.success("✅ Ad updated successfully!", { id: toastId });
            
            // Cleanup
            formData.images.forEach(({ preview }) => URL.revokeObjectURL(preview));
            
            onUpdate(res.data?.data || res.data);
            onClose();
        } catch (error) {
            console.error("Update Error:", error);
            const errorMsg = error.response?.data?.message || 
                           error.code === 'ECONNABORTED' ? "Upload timeout. Try smaller images." :
                           "Failed to update ad. Please try again.";
            toast.error(errorMsg, { id: toastId });
        } finally {
            setLoading(false);
        }
    }, [formData, currentCategoryFields, adData, onClose, onUpdate]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const renderField = useCallback((field) => {
        // Check if field should be shown based on dependency
        if (field.dependsOn && formData[field.dependsOn.field] !== field.dependsOn.value) {
            return null;
        }

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
                min={field.min}
                max={field.max}
            />
        );
    }, [formData, inputHandler]);

    if (!adData) return null;

    const modalContent = (
        <div 
            className="fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 z-[999] animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-pink-600">Update Ad</h2>
                        <p className="text-sm text-gray-500 mt-1">{adData.category} • {adData.title}</p>
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
                    <form onSubmit={submitForm} className="space-y-6" id="update-ad-form">
                        {/* Image Management Section */}
                        <div className="space-y-4">
                            {/* Existing Images */}
                            {formData.existingImages.length > 0 && (
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 mb-2">Current Images</p>
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-pink-300">
                                        {formData.existingImages.map((img, i) => (
                                            <div key={`existing-${i}`} className="relative shrink-0 group">
                                                <img 
                                                    src={img} 
                                                    className="w-24 h-24 object-cover rounded-2xl border-4 border-white shadow-lg" 
                                                    alt={`Current ${i + 1}`}
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => removeExistingImage(i)}
                                                    className="absolute -top-2 -right-2 text-red-500 bg-white rounded-full p-1 shadow-md hover:text-red-700 hover:bg-red-50 transition-all"
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
                                    <p className="text-sm font-semibold text-gray-700 mb-2">New Images</p>
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-pink-300">
                                        {formData.images.map(({ preview }, i) => (
                                            <div key={`new-${i}`} className="relative shrink-0 group">
                                                <img 
                                                    src={preview} 
                                                    className="w-24 h-24 object-cover rounded-2xl border-4 border-white shadow-lg" 
                                                    alt={`New ${i + 1}`}
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => removeNewImage(i)}
                                                    className="absolute -top-2 -right-2 text-red-500 bg-white rounded-full p-1 shadow-md hover:text-red-700 hover:bg-red-50 transition-all"
                                                >
                                                    <FaTrash size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Removed Images (Restorable) */}
                            {removedImages.length > 0 && (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                    <p className="text-sm font-semibold text-red-700 mb-2">
                                        Marked for deletion ({removedImages.length})
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        {removedImages.map((img, i) => (
                                            <button
                                                key={`removed-${i}`}
                                                onClick={() => restoreImage(img)}
                                                className="text-xs bg-white text-red-600 px-3 py-1 rounded-full border border-red-200 hover:bg-red-100 transition-colors"
                                            >
                                                Restore Image {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Upload Button */}
                            <label className={`block w-full p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                                (formData.existingImages.length + formData.images.length) >= MAX_IMAGES 
                                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' 
                                    : 'border-pink-300 bg-pink-50/30 hover:bg-pink-50'
                            }`}>
                                <FaCamera className={`text-3xl mx-auto mb-2 ${
                                    (formData.existingImages.length + formData.images.length) >= MAX_IMAGES 
                                        ? 'text-gray-400' 
                                        : 'text-pink-400'
                                }`} />
                                <span className="text-gray-700 font-bold block text-sm">
                                    {(formData.existingImages.length + formData.images.length) >= MAX_IMAGES 
                                        ? `Max ${MAX_IMAGES} images reached` 
                                        : `Add Images (${formData.existingImages.length + formData.images.length}/${MAX_IMAGES})`
                                    }
                                </span>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*" 
                                    onChange={imageHandler} 
                                    className="hidden" 
                                    disabled={(formData.existingImages.length + formData.images.length) >= MAX_IMAGES}
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
                            onChange={val => setFormData(prev => ({...prev, location: val}))} 
                            variant="form" 
                        />
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50 flex gap-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        form="update-ad-form"
                        disabled={loading} 
                        className="flex-[2] py-3 bg-pink-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-pink-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
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