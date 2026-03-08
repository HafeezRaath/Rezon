import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaFilter, FaRedo } from 'react-icons/fa';

// 🔧 FIXED: Complete category filter map
const CATEGORY_FILTER_MAP = {
    Mobile: [
        { name: "brand", label: "Brand", type: "text", placeholder: "e.g., Samsung" },
        { name: "price_min", label: "Min Price (PKR)", type: "number", min: 0 },
        { name: "price_max", label: "Max Price (PKR)", type: "number", min: 0 },
        { name: "storage", label: "Storage", type: "select", options: ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB+"] },
        { name: "ram", label: "RAM", type: "select", options: ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB+"] },
        { name: "condition", label: "Condition", type: "select", options: ["New", "Used", "Refurbished"] },
    ],
    Car: [
        { name: "make", label: "Make", type: "text", placeholder: "e.g., Honda" },
        { name: "year_min", label: "Year (From)", type: "number", min: 1900, max: new Date().getFullYear() + 1 },
        { name: "year_max", label: "Year (To)", type: "number", min: 1900, max: new Date().getFullYear() + 1 },
        { name: "mileage_max", label: "Max Mileage (km)", type: "number", min: 0 },
        { name: "fuelType", label: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "Hybrid", "Electric"] },
        { name: "transmission", label: "Transmission", type: "select", options: ["Automatic", "Manual"] },
    ],
    PropertySale: [
        { name: "propertyType", label: "Property Type", type: "select", options: ["House", "Plot", "Flat", "Farm House"] },
        { name: "area_min", label: "Min Area", type: "number", min: 0 },
        { name: "area_max", label: "Max Area", type: "number", min: 0 },
        { name: "bedrooms", label: "Bedrooms", type: "select", options: ["1", "2", "3", "4", "5+"] },
        { name: "price_min", label: "Min Price (PKR)", type: "number", min: 0 },
        { name: "price_max", label: "Max Price (PKR)", type: "number", min: 0 },
    ],
    PropertyRent: [
        { name: "propertyType", label: "Property Type", type: "select", options: ["House", "Flat", "Room", "Office"] },
        { name: "rent_min", label: "Min Rent (PKR)", type: "number", min: 0 },
        { name: "rent_max", label: "Max Rent (PKR)", type: "number", min: 0 },
        { name: "rentDuration", label: "Duration", type: "select", options: ["Monthly", "Yearly"] },
    ],
    Furniture: [
        { name: "material", label: "Material", type: "text", placeholder: "e.g., Wood" },
        { name: "price_min", label: "Min Price (PKR)", type: "number", min: 0 },
        { name: "price_max", label: "Max Price (PKR)", type: "number", min: 0 },
        { name: "condition", label: "Condition", type: "select", options: ["New", "Used"] },
    ],
    Electronics: [
        { name: "itemType", label: "Item Type", type: "text", placeholder: "e.g., Laptop" },
        { name: "brand", label: "Brand", type: "text", placeholder: "e.g., Dell" },
        { name: "price_min", label: "Min Price (PKR)", type: "number", min: 0 },
        { name: "price_max", label: "Max Price (PKR)", type: "number", min: 0 },
        { name: "warrantyStatus", label: "Warranty", type: "select", options: ["In Warranty", "Expired", "Not Applicable"] },
    ],
    Bikes: [
        { name: "make", label: "Make", type: "text", placeholder: "e.g., Honda" },
        { name: "engineCC", label: "Engine CC", type: "select", options: ["70", "100", "125", "150", "200+"] },
        { name: "year_min", label: "Year (From)", type: "number", min: 1900 },
        { name: "price_min", label: "Min Price (PKR)", type: "number", min: 0 },
        { name: "price_max", label: "Max Price (PKR)", type: "number", min: 0 },
    ],
    Jobs: [
        { name: "jobType", label: "Job Type", type: "select", options: ["Full-time", "Part-time", "Contract"] },
        { name: "salary_min", label: "Min Salary (PKR)", type: "number", min: 0 },
        { name: "salary_max", label: "Max Salary (PKR)", type: "number", min: 0 },
    ],
    default: [
        { name: "price_min", label: "Min Price (PKR)", type: "number", min: 0 },
        { name: "price_max", label: "Max Price (PKR)", type: "number", min: 0 },
        { name: "condition", label: "Condition", type: "select", options: ["New", "Used", "Refurbished"] },
    ]
};

// 🔧 FIXED: Memoized helper components with Emerald theme
const FilterInput = React.memo(({ name, label, type, value, onChange, placeholder, min, max }) => (
    <div className="flex flex-col text-sm mb-4"> 
        <label className="font-semibold text-slate-700 mb-1.5 text-xs uppercase tracking-wider">{label}</label>
        <input 
            type={type} 
            name={name} 
            value={value} 
            onChange={onChange}
            placeholder={placeholder}
            min={min}
            max={max}
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
        />
    </div>
));

const FilterSelect = React.memo(({ name, label, options, value, onChange }) => (
    <div className="flex flex-col text-sm mb-4"> 
        <label className="font-semibold text-slate-700 mb-1.5 text-xs uppercase tracking-wider">{label}</label>
        <select 
            name={name} 
            value={value} 
            onChange={onChange}
            className="border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
        >
            <option value="">All {label}</option>
            {options.map(opt => (
                <option key={`${name}-${opt}`} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
));

// --- MAIN FILTERS COMPONENT ---
const Filters = ({ categoryCode, onFilterChange }) => {
    const filterConfig = useMemo(() => 
        CATEGORY_FILTER_MAP[categoryCode] || CATEGORY_FILTER_MAP.default,
    [categoryCode]);

    const [filterValues, setFilterValues] = useState({});

    // Reset filters when category changes
    useEffect(() => {
        setFilterValues({});
        onFilterChange({});
    }, [categoryCode, onFilterChange]);

    // 🔧 FIXED: Debounced filter change
    useEffect(() => {
        const timer = setTimeout(() => {
            onFilterChange(filterValues);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [filterValues, onFilterChange]);

    // 🔧 FIXED: Stable callbacks
    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilterValues(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleReset = useCallback(() => {
        setFilterValues({});
        onFilterChange({});
    }, [onFilterChange]);

    if (filterConfig.length === 0) return null;

    const hasActiveFilters = Object.values(filterValues).some(v => v !== '' && v !== undefined);

    return (
        <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-100 md:sticky md:top-24 h-fit animate-in fade-in slide-in-from-left-2 duration-300"> 
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                    <FaFilter className="text-emerald-600"/> Filters
                </h3>
                <button 
                    onClick={handleReset} 
                    disabled={!hasActiveFilters}
                    className={`text-xs font-bold transition-all flex items-center gap-1 uppercase tracking-wider ${
                        hasActiveFilters 
                            ? 'text-slate-500 hover:text-emerald-600' 
                            : 'text-slate-300 cursor-not-allowed'
                    }`}
                >
                    <FaRedo className={`text-[10px] ${hasActiveFilters ? 'group-hover:rotate-180' : ''}`}/> Reset
                </button>
            </div>

            <div className="space-y-1"> 
                {filterConfig.map(filter => (
                    filter.type === 'select' ? (
                        <FilterSelect 
                            key={filter.name} 
                            {...filter} 
                            value={filterValues[filter.name] || ''} 
                            onChange={handleFilterChange}
                        />
                    ) : (
                        <FilterInput 
                            key={filter.name} 
                            {...filter} 
                            value={filterValues[filter.name] || ''} 
                            onChange={handleFilterChange}
                        />
                    )
                ))}
            </div>
            
            {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 font-semibold bg-emerald-50 py-2 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Filters Applied
                    </div>
                </div>
            )}
        </div>
    );
};

export default Filters;