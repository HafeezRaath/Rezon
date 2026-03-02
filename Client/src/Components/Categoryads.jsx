import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { FaFilter, FaRedo, FaArrowLeft, FaArrowRight, FaTimes, FaMapMarkerAlt, FaTag, FaPhoneAlt } from "react-icons/fa"; // Added icons
import toast from "react-hot-toast"; // Added toast
import Navbar from "./Navbar"; // Assuming Navbar is correctly placed
import Footer from "./footer"; // Assuming Footer is correctly placed

// ***************************************************************
// === 1. CONFIGS & HELPER FUNCTIONS ===
// ***************************************************************

// 🔥 A. SLUG to CODE MAP
const getCodeFromSlug = (slug) => {
    const codeMap = {
        'mobile': 'Mobile', 'car': 'Car', 'propertysale': 'PropertySale', 'propertyrent': 'PropertyRent', 
        'electronics': 'Electronics', 'bikes': 'Bikes', 'business': 'Business', 'services': 'Services', 
        'jobs': 'Jobs', 'animals': 'Animals', 'furniture': 'Furniture', 'fashion': 'Fashion', 
        'books': 'Books', 'kids': 'Kids', 'mobiles': 'Mobile', 'vehicles': 'Car', 'property-for-sale': 'PropertySale',
    };
    return codeMap[slug] || '';
};

// 🔥 B. FILTER CONFIGURATION
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
    "default": [{ name: "price_min", label: "Min Price", type: "number" }]
};

// C. Filter Input/Select Components
const FilterInput = ({ name, label, type, value, onChange }) => (
    <div className="flex flex-col text-sm mb-3"> 
        <label className="font-semibold text-gray-700 mb-1">{label}</label>
        <input type={type} name={name} value={value} onChange={onChange}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500 outline-none"/>
    </div>
);
const FilterSelect = ({ name, label, options, value, onChange }) => (
    <div className="flex flex-col text-sm mb-3"> 
        <label className="font-semibold text-gray-700 mb-1">{label}</label>
        <select name={name} value={value} onChange={onChange}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-pink-500 focus:border-pink-500 outline-none">
            <option value="">All</option>
            {options.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
        </select>
    </div>
);

// D. Filters Component
const Filters = ({ categoryCode, onFilterChange }) => {
    const filterConfig = CATEGORY_FILTER_MAP[categoryCode] || CATEGORY_FILTER_MAP['default'];
    const [filterValues, setFilterValues] = useState({});
    
    // Handlers (logic for filtering)
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filterValues, [name]: value };
        setFilterValues(newFilters);
        onFilterChange(newFilters); 
    };
    const handleReset = () => {
        setFilterValues({});
        onFilterChange({}); 
    };
    
    if (filterConfig.length === 0) return null;

    return (
        // Design: Onsus/Radios jaisa clean sidebar design
        <div className="bg-white p-5 rounded-2xl shadow-xl border border-pink-100 md:sticky md:top-20"> 
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FaFilter className="text-pink-600"/> Filter by:
                </h3>
                <button onClick={handleReset} className="text-sm text-red-500 hover:text-red-700 transition flex items-center gap-1">
                    <FaRedo className="text-sm"/> Reset
                </button>
            </div>
            <div className="space-y-2"> 
                {filterConfig.map(filter => (
                    filter.type === 'select' ? (
                        <FilterSelect key={filter.name} {...filter} value={filterValues[filter.name] || ''} onChange={handleFilterChange}/>
                    ) : (
                        <FilterInput key={filter.name} {...filter} value={filterValues[filter.name] || ''} onChange={handleFilterChange}/>
                    )
                ))}
            </div>
        </div>
    );
};
// ***************************************************************


// === HELPER FUNCTIONS FOR MODAL/ADS (Copied from AllAds) ===

// Helper to get safe image URL
const safeImage = (imgArray, index = 0) => {
    return imgArray && imgArray.length > 0
        ? imgArray[index]
        : "https://via.placeholder.com/400x300?text=No+Image";
};

// Helper to render dynamic details for the modal
const renderDetails = (ad) => {
    if (!ad.details) return null;
    return Object.entries(ad.details).map(([key, value]) => (
        <p key={key}>
            <b>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</b> {value}
        </p>
    ));
};

// === MAIN CATEGORY ADS COMPONENT ===
const CategoryAds = () => {
    const { slug } = useParams();
    const location = useLocation();
    
    const [allCategoryAds, setAllCategoryAds] = useState([]);
    const [filteredAds, setFilteredAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilters, setActiveFilters] = useState({});
    
    // 🔥 NEW STATES FOR MODAL FUNCTIONALITY
    const [selectedAd, setSelectedAd] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showImageModal, setShowImageModal] = useState(false); 
    
    let pathSegment = slug || location.pathname.split('/').pop();
    const categoryCode = getCodeFromSlug(pathSegment.toLowerCase());
    const displayTitle = pathSegment.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    // === MODAL HANDLERS (Copied from AllAds) ===
    const nextImage = (ad) => {
        const adToUse = ad || selectedAd;
        if (!adToUse || !adToUse.images) return;
        setCurrentImageIndex(
            (currentImageIndex + 1) % adToUse.images.length
        );
    };
    const prevImage = (ad) => {
        const adToUse = ad || selectedAd;
        if (!adToUse || !adToUse.images) return;
        setCurrentImageIndex(
            (currentImageIndex - 1 + adToUse.images.length) %
            adToUse.images.length
        );
    };
    
    const handleInquiry = () => {
        toast.success(`Inquiry sent for ${selectedAd.title}!`);
    };

    const handleContactSeller = () => {
        const contactInfo = "0300-1234567"; // Placeholder
        toast.info(`Contacting seller: ${contactInfo}`);
    };
    
    // Ad click handler
    const handleAdClick = (ad) => {
        setSelectedAd(ad);
        setCurrentImageIndex(0);
    }
    // Related Ad handler (same as ad click)
    const handleRelatedAdClick = (ad) => {
        setSelectedAd(ad);
        setCurrentImageIndex(0);
        // Scroll modal to top if it's already open
        const modal = document.querySelector('.ad-modal-content');
        if(modal) modal.scrollTo(0, 0);
    }

    // Related Ads Logic
    const getRelatedAds = useCallback((currentAd) => {
        if (!currentAd) return [];
        return allCategoryAds
            .filter(ad => ad.category === currentAd.category && ad._id !== currentAd._id)
            .slice(0, 4); // Sirf pehle 4 related ads dikhaen
    }, [allCategoryAds]);


    // Logic to apply filters on the client side
    const clientSideFilter = useCallback((ads, filters) => {
        let currentAds = [...ads];
        Object.entries(filters).forEach(([key, value]) => {
            if (!value || value === 'All') return; 
            currentAds = currentAds.filter(ad => {
                if (key === 'price_min' && ad.price) { return ad.price >= Number(value); }
                if (key === 'price_max' && ad.price) { return ad.price <= Number(value); }
                
                // Mileage max filter (Car specific)
                if (key === 'mileage_max' && ad.details?.mileage) { return ad.details.mileage <= Number(value); }

                if (ad.details && ad.details[key]) {
                    // For text/select filters (brand, storage, fuelType, etc.)
                    return String(ad.details[key]).toLowerCase().includes(value.toLowerCase());
                }
                return true;
            });
        });
        return currentAds;
    }, []);

    // 1. Fetching Data
    useEffect(() => {
        if (!categoryCode) { setLoading(false); return; }
        setLoading(true);
        // 🔥 Ab hum sirf category specific ads fetch nahi kar rahe, lekin filtering client side par karenge 
        // Agar aap server side filtering API use kar sakte hain to yeh behtar hoga.
        axios.get("http://localhost:8000/api/ads") 
            .then((res) => {
                const categorySpecificAds = res.data.filter((ad) => ad.category === categoryCode);
                setAllCategoryAds(categorySpecificAds);
                setLoading(false);
            })
            .catch(() => { setLoading(false); });
    }, [categoryCode]); 


    // 2. Applying Filters (When activeFilters state changes)
    useEffect(() => {
        const adsAfterFiltering = clientSideFilter(allCategoryAds, activeFilters);
        setFilteredAds(adsAfterFiltering);
    }, [activeFilters, allCategoryAds, clientSideFilter]);


    return (
        <>
       
        <div className="p-6 max-w-7xl mx-auto min-h-screen"> 
            
            <h1 className="text-3xl font-extrabold capitalize mb-4">
                {displayTitle} Ads
            </h1>
            <p className="text-gray-500 text-lg mb-8">{filteredAds.length} results found</p>

            {/* 🔥 MAIN CONTENT GRID: Sidebar + Ads Area */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* 1. LEFT SIDEBAR (FILTERS - 3 Columns) */}
                <div className="md:col-span-3"> 
                    <Filters categoryCode={categoryCode} onFilterChange={setActiveFilters} />
                </div>

                {/* 2. RIGHT CONTENT (ADS - 9 Columns) */}
                <div className="md:col-span-9">
                    {loading ? (
                        <p>Loading ads...</p>
                    ) : filteredAds.length === 0 ? (
                        <p className="text-center text-xl text-gray-600 mt-10 p-10 bg-white rounded-2xl shadow-lg border">No ads found matching your search criteria.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAds.map((ad) => (
                                <div
                                    key={ad._id}
                                    onClick={() => handleAdClick(ad)} 
                                    className="border rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition cursor-pointer bg-white"
                                >
                                    {/* Ad Card Image */}
                                    {ad.images && ad.images.length > 0 && (
                                        <img src={ad.images[0]} alt={ad.title} className="h-48 w-full object-cover"/>
                                    )}
                                    {/* Ad Card Details */}
                                    <div className="p-4">
                                        <h3 className="font-bold text-lg truncate">{ad.title}</h3> 
                                        
                                        {/* Dynamic Detail (Mobile/Car/Property) */}
                                        {ad.details && (
                                            <>
                                                {ad.category === 'Mobile' && <p className="text-sm text-gray-500 truncate mt-1">{ad.details.brand} - {ad.details.model}</p>}
                                                {ad.category === 'Car' && <p className="text-sm text-gray-500 truncate mt-1">{ad.details.make} - {ad.details.carModel}</p>}
                                                {ad.category === 'PropertySale' && <p className="text-sm text-gray-500 truncate mt-1">{ad.details.areaSize} {ad.details.unit}</p>}
                                            </>
                                        )}
                                        
                                        <p className="text-xl font-bold text-pink-600 mt-3">Rs {ad.price}</p> 
                                        <p className="text-xs text-gray-500 mt-1 truncate">{ad.location}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ----------------- SELECTED AD MODAL (Copied from AllAds) ----------------- */}
        {selectedAd && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start overflow-auto py-10 z-50">
                <div className="bg-white max-w-5xl w-full rounded-2xl shadow-xl relative p-6 ad-modal-content">

                    {/* Close Button */}
                    <button
                        onClick={() => setSelectedAd(null)}
                        className="absolute top-3 right-3 text-3xl text-gray-700 hover:text-red-600 z-10"
                    >
                        <FaTimes />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* LEFT: BIG IMAGE (Clickable for full view) */}
                        <div className="relative h-96 rounded-xl overflow-hidden shadow cursor-pointer"
                            onClick={() => selectedAd.images && selectedAd.images.length > 0 && setShowImageModal(true)} 
                        >
                            <img
                                src={safeImage(selectedAd.images, currentImageIndex)}
                                alt={selectedAd.title}
                                className="w-full h-full object-cover"
                            />
                            {/* Image Navigation Arrows (inside ad modal) */}
                            {selectedAd.images && selectedAd.images.length > 1 && (
                                <>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); prevImage(); }} 
                                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white text-xl hover:bg-black/80 transition z-[5]"
                                    >
                                        <FaArrowLeft />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); nextImage(); }} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white text-xl hover:bg-black/80 transition z-[5]"
                                    >
                                        <FaArrowRight />
                                    </button>
                                </>
                            )}
                            {/* Image Counter */}
                            {selectedAd.images && selectedAd.images.length > 0 && (
                                 <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                                     {currentImageIndex + 1} / {selectedAd.images.length}
                                 </span>
                            )}
                        </div>

                        {/* RIGHT: INFO BOX */}
                        <div className="border rounded-xl p-6 shadow-lg flex flex-col justify-between">
                            <div>
                                <h2 className="text-3xl font-extrabold text-gray-800 mb-2">
                                    {selectedAd.title}
                                </h2>
                                <p className="text-4xl font-black text-pink-600 border-b pb-3 mb-4 flex items-center">
                                    <FaTag className="mr-2 text-3xl" />
                                    Rs {selectedAd.price}
                                </p>
                                <div className="flex items-center text-gray-600 mb-4">
                                    <FaMapMarkerAlt className="mr-2 text-lg text-pink-500" />
                                    <span className="font-semibold">{selectedAd.location}</span>
                                </div>
                                <p className="text-sm text-gray-500 mb-4">
                                    Posted By: {selectedAd.posted_by_uid?.substring(0, 10)}... 
                                </p>
                            </div>
                            
                            {/* TWO ACTION BUTTONS */}
                            <div className="mt-4 space-y-3">
                                <button
                                    onClick={handleInquiry}
                                    className="w-full bg-green-500 text-white text-xl font-bold py-3 rounded-xl hover:bg-green-600 transition shadow-lg flex items-center justify-center"
                                >
                                    Inquire Now
                                </button>
                                <button
                                    onClick={handleContactSeller}
                                    className="w-full bg-blue-500 text-white text-xl font-bold py-3 rounded-xl hover:bg-blue-600 transition shadow-lg flex items-center justify-center"
                                >
                                    <FaPhoneAlt className="mr-2 text-lg" /> Contact Seller
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* DETAILS SECTION (DYNAMIC) */}
                    <div className="mt-10">
                        <h3 className="text-xl font-bold mb-3 border-b pb-1">Item Details ({selectedAd.category})</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-gray-700 text-sm">
                            {renderDetails(selectedAd)} 
                            <p><b>Condition:</b> {selectedAd.condition}</p>
                        </div>
                        <div className="mt-5 border-t pt-5">
                            <h4 className="font-bold text-lg mb-2">Description</h4>
                            <p className="text-gray-600 whitespace-pre-wrap">{selectedAd.description}</p>
                        </div>
                    </div>
                    
                    {/* RELATED ADS SECTION (Only shows other ads in the same category) */}
                    {getRelatedAds(selectedAd).length > 0 && (
                        <div className="mt-10">
                            <h3 className="text-2xl font-bold mb-4 text-pink-600 border-b pb-2">Related Ads</h3>
                            <div className="flex overflow-x-auto space-x-4 pb-2">
                                {getRelatedAds(selectedAd).map((relatedAd) => (
                                    <div 
                                        key={relatedAd._id}
                                        onClick={() => handleRelatedAdClick(relatedAd)}
                                        className="bg-gray-50 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all p-3 flex-shrink-0 w-56 min-w-[200px]"
                                    >
                                        <div className="relative h-32 rounded-lg overflow-hidden">
                                            <img
                                                src={safeImage(relatedAd.images)}
                                                alt={relatedAd.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="mt-2">
                                            <h4 className="font-semibold text-sm truncate">{relatedAd.title}</h4>
                                            <span className="text-lg font-bold text-pink-500 block">Rs {relatedAd.price}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        )}
        
        {/* ----------------- FULL IMAGE VIEW MODAL (Copied from AllAds) ----------------- */}
        {selectedAd && showImageModal && (
            <div className="fixed inset-0 bg-black bg-opacity-95 flex justify-center items-center z-[60]">
                <button
                    onClick={() => setShowImageModal(false)}
                    className="absolute top-6 right-6 text-white text-4xl hover:text-red-500 z-10"
                >
                    <FaTimes /> {/* Cancel/Close button */}
                </button>

                <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
                    <img
                        src={safeImage(selectedAd.images, currentImageIndex)}
                        alt={selectedAd.title}
                        className="w-full h-full object-contain"
                    />
                    
                    {/* Image Navigation Arrows (inside Image modal) */}
                    {selectedAd.images && selectedAd.images.length > 1 && (
                        <>
                            <button 
                                onClick={() => prevImage()} 
                                className="absolute left-6 top-1/2 transform -translate-y-1/2 text-white text-4xl p-2 rounded-full hover:bg-white/10 transition"
                            >
                                <FaArrowLeft />
                            </button>
                            <button 
                                onClick={() => nextImage()} 
                                className="absolute right-6 top-1/2 transform -translate-y-1/2 text-white text-4xl p-2 rounded-full hover:bg-white/10 transition"
                            >
                                <FaArrowRight />
                            </button>
                            {/* Image Counter in image modal */}
                            <span className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-lg px-4 py-1 rounded-full">
                                {currentImageIndex + 1} / {selectedAd.images.length}
                            </span>
                        </>
                    )}
                </div>
            </div>
        )}

        <Footer/>
        </>
    );
};

export default CategoryAds;