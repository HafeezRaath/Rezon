import React, { useEffect, useCallback, useRef } from 'react';
import { 
    FaMobileAlt, FaCar, FaHome, FaBuilding, FaTv, FaMotorcycle, 
    FaIndustry, FaHandshake, FaBriefcase, FaPaw, FaChair, 
    FaTshirt, FaBookOpen, FaChild, FaTimes
} from 'react-icons/fa';

const categories = [
    { name: "Mobiles", icon: FaMobileAlt, code: "Mobile", color: "blue" },
    { name: "Vehicles", icon: FaCar, code: "Car", color: "red" },
    { name: "Property for Sale", icon: FaHome, code: "PropertySale", color: "emerald" },
    { name: "Property for Rent", icon: FaBuilding, code: "PropertyRent", color: "teal" },
    { name: "Electronics", icon: FaTv, code: "Electronics", color: "purple" },
    { name: "Bikes", icon: FaMotorcycle, code: "Bikes", color: "orange" },
    { name: "Business", icon: FaIndustry, code: "Business", color: "slate" },
    { name: "Services", icon: FaHandshake, code: "Services", color: "cyan" },
    { name: "Jobs", icon: FaBriefcase, code: "Jobs", color: "indigo" },
    { name: "Animals", icon: FaPaw, code: "Animals", color: "rose" },
    { name: "Furniture", icon: FaChair, code: "Furniture", color: "amber" },
    { name: "Fashion", icon: FaTshirt, code: "Fashion", color: "pink" },
    { name: "Books", icon: FaBookOpen, code: "Books", color: "yellow" },
    { name: "Kids", icon: FaChild, code: "Kids", color: "green" },
];

const CategorySelector = ({ onClose, onCategorySelect }) => {
    const firstButtonRef = useRef(null);
    const modalRef = useRef(null);

    // 🔧 FIXED: Escape key handler
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleEscape);
        
        // Auto-focus first button
        firstButtonRef.current?.focus();

        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // 🔧 FIXED: Stable callbacks
    const handleCategoryClick = useCallback((code) => {
        onCategorySelect(code);
    }, [onCategorySelect]);

    const handleBackdropClick = useCallback((e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    return (
        // Modal Backdrop - 🔧 FIXED: Emerald theme + click handler
        <div 
            className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-title"
        >
            {/* Modal Container */}
            <div 
                ref={modalRef}
                className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-4"
            >
                {/* Header - 🔧 FIXED: Emerald theme */}
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h2 
                        id="category-title"
                        className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight"
                    >
                        What are you <span className="text-emerald-600">listing?</span>
                    </h2>
                    <button
                        onClick={handleClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-500 transition-colors"
                        aria-label="Close modal"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>
                
                {/* Categories Grid - 🔧 FIXED: Emerald hover theme */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-emerald-200">
                    {categories.map((cat, index) => {
                        const IconComponent = cat.icon;
                        return (
                            <button
                                key={cat.code}
                                ref={index === 0 ? firstButtonRef : null}
                                onClick={() => handleCategoryClick(cat.code)}
                                className="flex flex-col items-center p-4 border-2 border-slate-100 rounded-xl transition-all duration-200 
                                           hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 
                                           group active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            >
                                {/* Icon */}
                                <div className="text-2xl mb-2 text-slate-400 group-hover:text-emerald-600 transition-colors duration-200">
                                    <IconComponent />
                                </div>
                                
                                {/* Name */}
                                <span className="text-sm font-bold text-center text-slate-700 group-hover:text-emerald-700 transition-colors uppercase tracking-tight leading-tight">
                                    {cat.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
                
                {/* Cancel Button - 🔧 FIXED: Emerald theme */}
                <button
                    onClick={handleClose}
                    className="mt-6 w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors uppercase text-xs tracking-widest active:scale-[0.98]"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default CategorySelector;