import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import LocationDropdown from "../Components/LocationDropdown";

// ***************************************************************
// 🚀 CATEGORY FIELD CONFIGURATION (All 14 Categories - Copy from PostAd.jsx)
// ***************************************************************

const CATEGORY_FIELDS = {
    // 📱 MOBILE CATEGORY FIELDS
    "Mobile": [
        { name: "brand", placeholder: "Brand (e.g., Samsung)", type: "text", required: true },
        { name: "model", placeholder: "Model (e.g., S21 Ultra)", type: "text", required: true },
        { name: "storage", placeholder: "Storage (e.g., 128GB)", type: "text", required: true },
        { name: "ram", placeholder: "RAM (e.g., 8GB)", type: "text", required: true },
        { name: "batteryHealth", placeholder: "Battery Health %", type: "number", required: true },
        { name: "ptaStatus", placeholder: "PTA Status", type: "select", options: ["Approved", "Non-Approved", "Blocked"], required: true },
        { name: "warranty", placeholder: "Warranty", type: "select", options: ["Avalible", "Not Avalible"], required: true },
        { name: "warrantyDuration", placeholder: "Warranty Duration (if Avalible)", type: "text", optional: true, dependsOn: { field: "warranty", value: "Avalible" } },
        { name: "accessories", placeholder: "Accessories (e.g., Box, Charger)", type: "text" },
    ],
    // 🚗 VEHICLES (CAR) CATEGORY FIELDS
    "Car": [
        { name: "make", placeholder: "Make (e.g., Honda, Toyota)", type: "text", required: true },
        { name: "carModel", placeholder: "Model (e.g., Civic, Corolla)", type: "text", required: true },
        { name: "year", placeholder: "Manufacturing Year", type: "number", required: true },
        { name: "mileage", placeholder: "Mileage (in KM)", type: "number", required: true },
        { name: "fuelType", placeholder: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "Hybrid"], required: true },
        { name: "transmission", placeholder: "Transmission", type: "select", options: ["Automatic", "Manual"], required: true },
        { name: "registrationCity", placeholder: "Registration City", type: "text", required: true },
    ],
    // 🏠 FURNITURE, ETC. (Aapne PostAd.jsx mein inke fields define kiye the)
    "Furniture": [
        { name: "material", placeholder: "Material (Wood, Plastic)", type: "text", required: true },
        { name: "dimensions", placeholder: "Dimensions (e.g., 6ft x 3ft)", type: "text", required: true },
        { name: "age", placeholder: "Age (in years)", type: "number" },
    ],
    "PropertySale": [
        { name: "propertyType", placeholder: "Type (House, Plot, Flat)", type: "select", options: ["House", "Plot", "Flat", "Farm House"], required: true },
        { name: "areaSize", placeholder: "Area Size (e.g., 5 Marla)", type: "text", required: true },
        { name: "unit", placeholder: "Area Unit", type: "select", options: ["Marla", "Kanal", "Sq. Ft."], required: true },
        { name: "bedrooms", placeholder: "Number of Bedrooms", type: "number" },
        { name: "bathrooms", placeholder: "Number of Bathrooms", type: "number" },
        { name: "possession", placeholder: "Possession Status", type: "select", options: ["Yes", "No"], required: true },
    ],
    "PropertyRent": [
        { name: "propertyType", placeholder: "Type (House, Flat, Room)", type: "select", options: ["House", "Flat", "Room", "Office"], required: true },
        { name: "areaSize", placeholder: "Area Size (e.g., 10 Marla)", type: "text", required: true },
        { name: "unit", placeholder: "Area Unit", type: "select", options: ["Marla", "Kanal", "Sq. Ft."], required: true },
        { name: "rentDuration", placeholder: "Rent Duration (Monthly/Yearly)", type: "select", options: ["Monthly", "Yearly"], required: true },
        { name: "deposit", placeholder: "Security Deposit Amount", type: "number" },
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
        { name: "year", placeholder: "Manufacturing Year", type: "number", required: true },
        { name: "engineCC", placeholder: "Engine CC (e.g., 125, 70)", type: "number", required: true },
        { name: "mileage", placeholder: "Mileage (in KM)", type: "number" },
    ],
    "Business": [
        { name: "businessType", placeholder: "Type (Franchise, Machinery)", type: "text", required: true },
        { name: "investmentRequired", placeholder: "Investment Required (PKR)", type: "number" },
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
        { name: "jobType", placeholder: "Employment Type (Full-time, Part-time)", type: "select", options: ["Full-time", "Part-time", "Contract"], required: true },
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
        { name: "conditionRating", placeholder: "Condition (1-10)", type: "number" },
    ],
    "Kids": [
        { name: "itemType", placeholder: "Item Type (Toy, Clothing, Stroller)", type: "text", required: true },
        { name: "ageGroup", placeholder: "Age Group (e.g., 2-5 years)", type: "text" },
        { name: "brand", placeholder: "Brand", type: "text" },
    ],
};


// Har category ke liye common initial state values
const getInitialState = () => ({
    images: [], // New files to upload
    imagePreviews: [], // All image URLs (old + new)
    title: "",
    condition: "New", 
    description: "",
    price: "",
    location: "",
});

// ***************************************************************

const UpdateAd = ({ adData, onClose, onUpdate }) => {
    // State ko Dynamic Rakha
    const [formData, setFormData] = useState(getInitialState());
    const [currentCategoryFields, setCurrentCategoryFields] = useState([]);
    
    // Ad ki Category adData se le rahe hain
    const adCategory = adData.category; 

    // 🔥 DYNAMIC DATA LOADING AND FIELD SETTING
    useEffect(() => {
        if (adData) {
            const categoryFields = CATEGORY_FIELDS[adCategory] || [];
            setCurrentCategoryFields(categoryFields);
            
            // 1. Common Fields Load Karna
            let loadedData = {
                images: [],
                imagePreviews: adData.images || [],
                title: adData.title || "",
                condition: adData.condition || "New",
                description: adData.description || "",
                price: adData.price || "",
                location: adData.location || "",
            };
            
            // 2. Dynamic Fields (Details) Load Karna
            // adData.details object ko flat karke main state mein merge karein
            if (adData.details) {
                 loadedData = { ...loadedData, ...adData.details };
            }
            
            setFormData(loadedData);
        }
    }, [adData, adCategory]);

    const inputHandler = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const imageHandler = (e) => {
        const files = Array.from(e.target.files);
        const previews = files.map((file) => URL.createObjectURL(file));
        setFormData((prev) => ({
            ...prev,
            images: [...prev.images, ...files], // New images as Files
            imagePreviews: [...prev.imagePreviews, ...previews], // All previews
        }));
    };
    
    // ***************************************************************
    // 🔥 SUBMISSION LOGIC UPDATE
    // ***************************************************************
    const submitForm = async (e) => {
        e.preventDefault();
        try {
            const finalFormData = new FormData();
            
            // 1. Common Fields and Dynamic Fields Append Karna
            Object.keys(formData).forEach((key) => {
                if (key !== "images" && key !== "imagePreviews") {
                    
                    // Numeric fields ko number mein convert karna
                    const value = ['price', 'mileage', 'year', 'batteryHealth', 'investmentRequired', 'bedrooms', 'bathrooms', 'age', 'conditionRating', 'deposit'].includes(key) 
                                     ? (Number(formData[key]) || 0)
                                     : formData[key];
                                     
                    // Append all fields (Controller will handle merging the details object)
                    finalFormData.append(key, value);
                }
            });

            // 2. Naye Images Append Karna
            formData.images.forEach((file) => finalFormData.append("images", file));

            // 🔥 API Path change kiya: /api/update/user/ se /api/ads/
            const res = await axios.put(
                `http://localhost:8000/api/ads/${adData._id}`, // Correct URL
                finalFormData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            toast.success("Ad updated successfully!");
            onUpdate(res.data.data); 
            onClose();
        } catch (error) {
            console.error(error.response?.data || error.message);
            toast.error("Failed to update ad!");
        }
    };
    
    // ***************************************************************

    return (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50 p-4">
            <div className="bg-white w-full max-w-xl p-6 rounded-3xl relative overflow-y-auto max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-lg">✕</button>
                <h2 className="text-2xl font-bold text-center text-pink-600 mb-4">
                    Update Ad: {adData.title} ({adCategory})
                </h2>

                <form onSubmit={submitForm} className="space-y-4">
                    
                    {/* Image Upload/Previews (Existing Images bhi dikh rahe hain) */}
                    <label className="block w-full p-4 border-2 border-dashed border-pink-400 rounded-xl text-center cursor-pointer hover:bg-pink-50 transition">
                        <span>Upload More Images</span>
                        <input type="file" multiple onChange={imageHandler} className="hidden" />
                    </label>
                    
                    {/* Image Previews */}
                    {formData.imagePreviews.length > 0 && (
                        <div className="w-full overflow-x-auto mt-2">
                            <div className="flex space-x-3 pb-2">
                                {formData.imagePreviews.map((img, i) => (
                                    <div key={i} className="min-w-[120px] h-[100px] rounded-xl overflow-hidden shadow-md border flex-shrink-0">
                                        {/* Assuming 'img' here is the URL/Blob URL */}
                                        <img src={img} alt={`preview-${i}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* === COMMON FIELDS === */}
                    <Input name="title" value={formData.title} onChange={inputHandler} placeholder="Ad Title" />
                    <Select name="condition" value={formData.condition} onChange={inputHandler} options={["New", "Used"]} />
                    
                    {/* === DYNAMIC CATEGORY FIELDS === */}
                    {currentCategoryFields.map((field) => {
                        // Dependency check
                        if (field.dependsOn && formData[field.dependsOn.field] !== field.dependsOn.value) {
                            return null;
                        }

                        if (field.type === "select") {
                            return (
                                <Select 
                                    key={field.name}
                                    name={field.name} 
                                    value={formData[field.name] || field.options[0]} 
                                    onChange={inputHandler} 
                                    options={field.options}
                                />
                            );
                        }
                        
                        return (
                            <Input 
                                key={field.name}
                                name={field.name} 
                                value={formData[field.name] || ''} 
                                onChange={inputHandler} 
                                placeholder={field.placeholder} 
                                type={field.type || "text"}
                            />
                        );
                    })}
                    
                    {/* Final Common Fields */}
                    <textarea name="description" value={formData.description} onChange={inputHandler} rows="3" className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-white/60 focus:ring-2 focus:ring-pink-400 outline-none" placeholder="Full Description..." />
                    <LocationDropdown
                        selected={formData.location}
                        onChange={(value) => setFormData({ ...formData, location: value })}
                        variant="form"
                    />
                    <Input name="price" value={formData.price} onChange={inputHandler} placeholder="Price" type="number" />

                    <button type="submit" className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:opacity-90 transition">
                        Update Ad
                    </button>
                </form>
            </div>
        </div>
    );
};

// Input and Select Helper components (Yahan honge)
const Input = ({ name, value, onChange, placeholder, type = "text" }) => (
    <input 
        type={type} 
        name={name} 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder} 
        className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-white/60 focus:ring-2 focus:ring-pink-400 outline-none" 
    />
);

const Select = ({ name, value, onChange, options }) => (
    <select name={name} value={value} onChange={onChange} className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-white/60 focus:ring-2 focus:ring-pink-400 outline-none">
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
);


export default UpdateAd;