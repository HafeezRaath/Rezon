import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import LocationDropdown from "../Components/LocationDropdown";

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
    { name: "fuelType", placeholder: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "Hybrid"], required: true },
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

const PostAd = ({ onClose, onAdAdded, category }) => {
  const [formData, setFormData] = useState(getInitialState(category));
  const [currentCategoryFields, setCurrentCategoryFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false); // AI loading state

  useEffect(() => {
    const fields = CATEGORY_FIELDS[category] || [];
    setCurrentCategoryFields(fields);
    setFormData(prev => ({ ...getInitialState(category) }));
  }, [category]);

  const inputHandler = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const imageHandler = e => {
    const files = Array.from(e.target.files);
    if (files.length > 5) return toast.error("Max 10 images allowed!");
    
    const previews = files.map(file => URL.createObjectURL(file));
    setFormData(prev => ({
      ...prev,
      images: files,
      imagePreviews: previews
    }));
  };

  // ==========================================
  // ✨ AI MAGIC ASSIST FUNCTION
  // ==========================================
const handleAiAssist = async () => {
    if (formData.images.length === 0) return toast.error("Pehle image select karein! 📸");
    
    setAiLoading(true);
    const token = localStorage.getItem("firebaseIdToken");
    const aiData = new FormData();
    
    // ✅ FIX: Saari images bhejein taake AI settings aur model scan kar sake
    formData.images.forEach((file) => {
        aiData.append("images", file);
    });
    
    aiData.append("category", category);

    try {
      const res = await axios.post("http://localhost:8000/api/ad/ai-assist", aiData, {
        headers: { 
            "Content-Type": "multipart/form-data", // ✅ Headers ka khayal rakhen
            Authorization: `Bearer ${token}` 
        }
      });

      const { title, condition, description, suggestedPrice, details } = res.data.data;
      
      // ✅ Dynamic Mapping: Details object se model, brand, storage wagera auto-fill honge
      setFormData(prev => ({
        ...prev,
        title: title || prev.title,
        condition: condition || prev.condition,
        description: description || prev.description,
        price: suggestedPrice || prev.price,
        ...details // Is se brand, model, storage, batteryHealth wagera map ho jayenge
      }));

      toast.success("✨ Rezon AI ne images scan kar li hain!");
    } catch (error) {
      console.error("AI Error:", error.response?.data);
      toast.error(error.response?.data?.message || "AI Error! Manual details enter karein.");
    } finally {
      setAiLoading(false);
    }
};

  const submitForm = async e => {
    e.preventDefault();
    const token = localStorage.getItem("firebaseIdToken");
    
    if (!token) return toast.error("Please login first! 🔒");
    if (formData.images.length === 0) return toast.error("At least one image is required!");

    setLoading(true);
    try {
      const finalFormData = new FormData();
      finalFormData.append("title", formData.title);
      finalFormData.append("description", formData.description);
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

      const res = await axios.post("http://localhost:8000/api/ad", finalFormData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("🎉 Ad Posted successfully!");
      onClose();
      if (onAdAdded) onAdAdded(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Server Error!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 z-[999]">
      <div className="bg-white w-full max-w-2xl p-8 rounded-3xl shadow-2xl relative overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-red-500 text-2xl">✕</button>
        
        <h2 className="text-3xl font-black text-pink-600 mb-6">Post in {category}</h2>

        <form onSubmit={submitForm} className="space-y-5">
          <div className="space-y-3">
            <label className="block w-full p-8 border-2 border-dashed border-pink-300 rounded-3xl text-center bg-pink-50/30 cursor-pointer hover:bg-pink-50 transition">
              <span className="text-4xl block mb-2">📸</span>
              <span className="text-gray-600 font-bold">Images Upload Karein (Max 10)</span>
              <input type="file" multiple accept="image/*" onChange={imageHandler} className="hidden" />
            </label>

            {/* ✨ AI MAGIC BUTTON - Only shows after image upload */}
            {formData.images.length > 0 && (
                <button 
                    type="button"
                    onClick={handleAiAssist}
                    disabled={aiLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 text-white rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] transition transform disabled:opacity-50"
                >
                    {aiLoading ? "🤖 Rezon AI Thinking..." : "✨ Magic Fill: Auto-Detect Price & Details"}
                </button>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2">
              {formData.imagePreviews.map((img, i) => (
                <img key={i} src={img} className="w-20 h-20 object-cover rounded-xl border-2 border-white shadow-md" alt="preview" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <input name="title" value={formData.title} onChange={inputHandler} placeholder="Ad Title *" className="w-full border border-gray-200 p-4 rounded-2xl outline-none focus:border-pink-500 bg-gray-50/50" required />
            
            <div className="grid grid-cols-2 gap-4">
              <select name="condition" value={formData.condition} onChange={inputHandler} className="border border-gray-200 p-4 rounded-2xl bg-gray-50/50 outline-none">
                <option value="Used">Used</option>
                <option value="New">New</option>
              </select>
              <input type="number" name="price" value={formData.price} onChange={inputHandler} placeholder="Price (PKR) *" className="border border-gray-200 p-4 rounded-2xl outline-none focus:border-pink-500 bg-gray-50/50" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentCategoryFields.map(field => (
                field.type === "select" ? (
                  <select key={field.name} name={field.name} value={formData[field.name] || ""} onChange={inputHandler} className="border border-gray-200 p-4 rounded-2xl bg-gray-50/50 outline-none">
                    <option value="">Select {field.placeholder}</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input key={field.name} type={field.type} name={field.name} value={formData[field.name] || ""} onChange={inputHandler} placeholder={field.placeholder} className="border border-gray-200 p-4 rounded-2xl outline-none focus:border-pink-500 bg-gray-50/50" required={field.required} />
                )
              ))}
            </div>

            <textarea name="description" value={formData.description} onChange={inputHandler} rows="3" className="w-full border border-gray-200 p-4 rounded-2xl bg-gray-50/50 outline-none focus:border-pink-500" placeholder="Product details likhein..." required></textarea>
            
            <LocationDropdown selected={formData.location} onChange={val => setFormData(p => ({...p, location: val}))} variant="form" />
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 bg-pink-600 text-white rounded-2xl font-black text-xl shadow-lg hover:bg-pink-700 transition disabled:bg-gray-400">
            {loading ? "Posting..." : "🚀 Post Ad Now"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostAd;