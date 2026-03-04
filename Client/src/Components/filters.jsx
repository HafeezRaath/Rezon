import React, { useState, useEffect } from 'react';
import { FaFilter, FaRedo } from 'react-icons/fa';

// 🔥 CATEGORY FILTER MAP (Expanded to match your marketplace)
const CATEGORY_FILTER_MAP = {
    "Mobile": [
        { name: "brand", label: "Brand", type: "text" },
        { name: "price_min", label: "Min Price", type: "number" },
        { name: "price_max", label: "Max Price", type: "number" },
        { name: "storage", label: "Storage", type: "select", options: ["16GB", "32GB", "64GB", "128GB", "256GB+"] },
        { name: "ram", label: "RAM", type: "select", options: ["2GB", "4GB", "6GB", "8GB+"] },
    ],
    "Car": [
        { name: "make", label: "Make", type: "text" },
        { name: "year", label: "Year (Min)", type: "number" },
        { name: "mileage_max", label: "Max Mileage (km)", type: "number" },
        { name: "fuelType", label: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "Hybrid"] },
    ],
    "Furniture": [
        { name: "material", label: "Material", type: "text" },
        { name: "price_min", label: "Min Price", type: "number" },
    ],
    "default": [{ name: "price_min", label: "Min Price", type: "number" }]
};

// --- Input/Select Helper Components (Vertical Spacing) ---
const FilterInput = ({ name, label, type, value, onChange }) => (
    <div className="flex flex-col text-sm mb-3"> 
        <label className="font-semibold text-gray-700 mb-1">{label}</label>
        <input type={type} name={name} value={value} onChange={onChange}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"/>
    </div>
);

const FilterSelect = ({ name, label, options, value, onChange }) => (
    <div className="flex flex-col text-sm mb-3"> 
        <label className="font-semibold text-gray-700 mb-1">{label}</label>
        <select name={name} value={value} onChange={onChange}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all">
            <option value="">All</option>
            {options.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
        </select>
    </div>
);

// --- MAIN FILTERS COMPONENT ---
const Filters = ({ categoryCode, onFilterChange }) => {
    const filterConfig = CATEGORY_FILTER_MAP[categoryCode] || CATEGORY_FILTER_MAP['default'];
    const [filterValues, setFilterValues] = useState({});

    useEffect(() => {
        setFilterValues({});
    }, [categoryCode]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filterValues, [name]: value };
        setFilterValues(newFilters);
        onFilterChange(newFilters); // Parent (CategoryAds.js) ko update karo
    };

    const handleReset = () => {
        setFilterValues({});
        onFilterChange({}); // Reset filters in the parent
    };
    
    if (filterConfig.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 md:sticky md:top-24 h-fit animate-in fade-in duration-500"> 
            <div className="flex justify-between items-center mb-5 border-b border-gray-50 pb-4">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
                    <FaFilter className="text-pink-600 text-lg"/> Filters
                </h3>
                <button onClick={handleReset} className="text-xs font-bold text-gray-400 hover:text-pink-600 transition-all flex items-center gap-1 uppercase tracking-widest">
                    <FaRedo className="text-[10px]"/> Reset
                </button>
            </div>

            <div className="space-y-1"> 
                {filterConfig.map(filter => (
                    filter.type === 'select' ? (
                        <FilterSelect key={filter.name} {...filter} value={filterValues[filter.name] || ''} onChange={handleFilterChange}/>
                    ) : (
                        <FilterInput key={filter.name} {...filter} value={filterValues[filter.name] || ''} onChange={handleFilterChange}/>
                    )
                ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                    AI Optimized Results
                </p>
            </div>
        </div>
    );
};

export default Filters;