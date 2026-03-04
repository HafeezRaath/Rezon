import React from 'react';
// Zaroori icons aapki categories ke mutabiq
import { 
    FaMobileAlt, FaCar, FaHome, FaBuilding, FaTv, FaMotorcycle, 
    FaIndustry, FaHandshake, FaBriefcase, FaPaw, FaChair, 
    FaTshirt, FaBookOpen, FaChild
} from 'react-icons/fa';

const categories = [
    { name: "Mobiles", icon: <FaMobileAlt />, code: "Mobile" },
    { name: "Vehicles", icon: <FaCar />, code: "Car" },
    { name: "Property for Sale", icon: <FaHome />, code: "PropertySale" },
    { name: "Property for Rent", icon: <FaBuilding />, code: "PropertyRent" },
    { name: "Electronics & Home Appliances", icon: <FaTv />, code: "Electronics" },
    { name: "Bikes", icon: <FaMotorcycle />, code: "Bikes" },
    { name: "Business, Industrial & Agriculture", icon: <FaIndustry />, code: "Business" },
    { name: "Services", icon: <FaHandshake />, code: "Services" },
    { name: "Jobs", icon: <FaBriefcase />, code: "Jobs" },
    { name: "Animals", icon: <FaPaw />, code: "Animals" },
    { name: "Furniture & Home Decor", icon: <FaChair />, code: "Furniture" },
    { name: "Fashion & Beauty", icon: <FaTshirt />, code: "Fashion" },
    { name: "Books, Sports & Hobbies", icon: <FaBookOpen />, code: "Books" },
    { name: "Kids", icon: <FaChild />, code: "Kids" },
];

const CategorySelector = ({ onClose, onCategorySelect }) => {
    return (
        // Modal Backdrop
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            {/* Modal Container */}
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 scale-100 animate-in zoom-in duration-200">
                
                <h2 className="text-3xl font-extrabold text-pink-600 mb-6 border-b pb-3 uppercase tracking-tighter">
                    What are you listing?
                </h2>
                
                {/* Categories Grid - 3 Columns on Medium Screens */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat.code}
                            onClick={() => onCategorySelect(cat.code)}
                            // New Styling: Clean, White Card with Strong Hover Effect
                            className="flex flex-col items-center p-4 border border-gray-200 rounded-xl transition duration-300 
                                       hover:bg-pink-50 hover:border-pink-500 hover:shadow-md group active:scale-95"
                        >
                            {/* Icon - Small aur color change on hover */}
                            <div className="text-2xl mb-2 text-gray-500 group-hover:text-pink-600 transition-colors">
                                {cat.icon}
                            </div>
                            
                            {/* Name */}
                            <span className="text-sm font-bold text-center text-gray-800 group-hover:text-pink-700 transition-colors uppercase tracking-tight">
                                {cat.name}
                            </span>
                        </button>
                    ))}
                </div>
                
                {/* Cancel Button */}
                <button
                    onClick={onClose}
                    className="mt-6 w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition duration-300 uppercase text-xs tracking-widest"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default CategorySelector;