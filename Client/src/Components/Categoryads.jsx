import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
    FaFilter, FaRedo, FaArrowLeft, FaArrowRight, FaTimes, 
    FaMapMarkerAlt, FaTag, FaPhoneAlt, FaSpinner, FaEye 
} from "react-icons/fa";
import toast from "react-hot-toast";
import Navbar from "./Navbar";
import Footer from "./footer";

// 🔧 FIXED: API URL without space
const API_BASE_URL = "https://rezon.up.railway.app/api";

// SLUG to CODE MAP
const getCodeFromSlug = (slug) => {
    const codeMap = {
        'mobile': 'Mobile', 
        'car': 'Car', 
        'propertysale': 'PropertySale', 
        'propertyrent': 'PropertyRent', 
        'electronics': 'Electronics', 
        'bikes': 'Bikes', 
        'business': 'Business', 
        'services': 'Services', 
        'jobs': 'Jobs', 
        'animals': 'Animals', 
        'furniture': 'Furniture', 
        'fashion': 'Fashion', 
        'books': 'Books', 
        'kids': 'Kids', 
        'mobiles': 'Mobile', 
        'vehicles': 'Car', 
        'property-for-sale': 'PropertySale',
        'property-for-rent': 'PropertyRent',
    };
    return codeMap[slug?.toLowerCase()] || '';
};

// 🔧 FIXED: Complete FILTER CONFIGURATION
const CATEGORY_FILTER_MAP = {
    "Mobile": [
        { name: "brand", label: "Brand", type: "text", placeholder: "e.g., Samsung" },
        { name: "price_min", label: "Min Price", type: "number", min: 0 },
        { name: "price_max", label: "Max Price", type: "number", min: 0 },
        { name: "storage", label: "Storage", type: "select", options: ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB+"] },
        { name: "ram", label: "RAM", type: "select", options: ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB+"] },
        { name: "condition", label: "Condition", type: "select", options: ["New", "Used", "Refurbished"] },
    ],
    "Car": [
        { name: "make", label: "Make", type: "text", placeholder: "e.g., Honda" },
        { name: "year_min", label: "Year (From)", type: "number", min: 1900, max: new Date().getFullYear() + 1 },
        { name: "year_max", label: "Year (To)", type: "number", min: 1900, max: new Date().getFullYear() + 1 },
        { name: "mileage_max", label: "Max Mileage (km)", type: "number", min: 0 },
        { name: "fuelType", label: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "Hybrid", "Electric"] },
        { name: "transmission", label: "Transmission", type: "select", options: ["Automatic", "Manual"] },
    ],
    "PropertySale": [
        { name: "propertyType", label: "Type", type: "select", options: ["House", "Plot", "Flat", "Farm House"] },
        { name: "area_min", label: "Min Area", type: "number", min: 0 },
        { name: "area_max", label: "Max Area", type: "number", min: 0 },
        { name: "bedrooms", label: "Bedrooms", type: "select", options: ["1", "2", "3", "4", "5+"] },
        { name: "price_min", label: "Min Price", type: "number", min: 0 },
        { name: "price_max", label: "Max Price", type: "number", min: 0 },
    ],
    "PropertyRent": [
        { name: "propertyType", label: "Type", type: "select", options: ["House", "Flat", "Room", "Office"] },
        { name: "rent_min", label: "Min Rent", type: "number", min: 0 },
        { name: "rent_max", label: "Max Rent", type: "number", min: 0 },
        { name: "rentDuration", label: "Duration", type: "select", options: ["Monthly", "Yearly"] },
    ],
    "default": [
        { name: "price_min", label: "Min Price", type: "number", min: 0 },
        { name: "price_max", label: "Max Price", type: "number", min: 0 },
        { name: "condition", label: "Condition", type: "select", options: ["New", "Used", "Refurbished"] },
    ]
};

// 🔧 FIXED: Default image (inline SVG)
const DEFAULT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%2394a3b8'%3ENo Image Available%3C/text%3E%3C/svg%3E";

// 🔧 FIXED: Memoized Filter Components with Emerald theme
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
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
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
            className="border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none"
        >
            <option value="">All {label}</option>
            {options.map(opt => (
                <option key={`${name}-${opt}`} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
));

// 🔧 FIXED: Filters Component with Emerald theme
const Filters = ({ categoryCode, onFilterChange }) => {
    const filterConfig = CATEGORY_FILTER_MAP[categoryCode] || CATEGORY_FILTER_MAP['default'];
    const [filterValues, setFilterValues] = useState({});
    
    // Reset when category changes
    useEffect(() => {
        setFilterValues({});
    }, [categoryCode]);

    // 🔧 FIXED: Debounced filter change
    useEffect(() => {
        const timer = setTimeout(() => {
            onFilterChange(filterValues);
        }, 300);
        return () => clearTimeout(timer);
    }, [filterValues, onFilterChange]);

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilterValues(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleReset = useCallback(() => {
        setFilterValues({});
        onFilterChange({});
    }, [onFilterChange]);

    const hasActiveFilters = Object.values(filterValues).some(v => v !== '' && v !== undefined);

    if (filterConfig.length === 0) return null;

    return (
        <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-100 md:sticky md:top-20 h-fit"> 
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FaFilter className="text-emerald-600"/> Filters
                </h3>
                <button 
                    onClick={handleReset} 
                    disabled={!hasActiveFilters}
                    className={`text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                        hasActiveFilters ? 'text-slate-500 hover:text-emerald-600' : 'text-slate-300 cursor-not-allowed'
                    }`}
                >
                    <FaRedo className="text-[10px]"/> Reset
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

// 🔧 FIXED: Safe image helper
const safeImage = (imgArray, index = 0) => {
    return imgArray && imgArray.length > 0 && imgArray[index]
        ? imgArray[index]
        : DEFAULT_IMAGE;
};

// 🔧 FIXED: Render details helper
const renderDetails = (ad) => {
    if (!ad.details) return null;
    return Object.entries(ad.details).map(([key, value]) => (
        <div key={key} className="bg-slate-50 p-3 rounded-lg">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </p>
            <p className="font-semibold text-slate-800">{value}</p>
        </div>
    ));
};

// === MAIN CATEGORY ADS COMPONENT ===
const CategoryAds = () => {
    const { slug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    const [allCategoryAds, setAllCategoryAds] = useState([]);
    const [filteredAds, setFilteredAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilters, setActiveFilters] = useState({});
    
    const [selectedAd, setSelectedAd] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showImageModal, setShowImageModal] = useState(false);
    
    const abortControllerRef = useRef(null);
    const modalRef = useRef(null);

    const pathSegment = slug || location.pathname.split('/').pop();
    const categoryCode = getCodeFromSlug(pathSegment);
    const displayTitle = pathSegment.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    // 🔧 FIXED: Stable image navigation
    const nextImage = useCallback(() => {
        setCurrentImageIndex(prev => {
            if (!selectedAd?.images) return prev;
            return (prev + 1) % selectedAd.images.length;
        });
    }, [selectedAd]);

    const prevImage = useCallback(() => {
        setCurrentImageIndex(prev => {
            if (!selectedAd?.images) return prev;
            return (prev - 1 + selectedAd.images.length) % selectedAd.images.length;
        });
    }, [selectedAd]);

    // 🔧 FIXED: Stable handlers
    const handleInquiry = useCallback(() => {
        if (!selectedAd) return;
        toast.success(`Inquiry sent for "${selectedAd.title}"! We'll notify the seller.`);
    }, [selectedAd]);

    const handleContactSeller = useCallback(() => {
        if (!selectedAd?.posted_by_uid) {
            toast.error("Seller contact info not available");
            return;
        }
        // In real app, fetch contact from API
        toast.info("Opening chat with seller...", { icon: '💬' });
        navigate(`/chat/start/${selectedAd._id}`);
    }, [selectedAd, navigate]);

    const handleAdClick = useCallback((ad) => {
        setSelectedAd(ad);
        setCurrentImageIndex(0);
    }, []);

    const handleRelatedAdClick = useCallback((ad) => {
        setSelectedAd(ad);
        setCurrentImageIndex(0);
        modalRef.current?.scrollTo(0, 0);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedAd(null);
        setShowImageModal(false);
        setCurrentImageIndex(0);
    }, []);

    // 🔧 FIXED: Escape key handler for modal
    useEffect(() => {
        if (!selectedAd) return;
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') handleCloseModal();
        };
        
        window.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        
        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [selectedAd, handleCloseModal]);

    const getRelatedAds = useCallback((currentAd) => {
        if (!currentAd) return [];
        return allCategoryAds
            .filter(ad => ad._id !== currentAd._id)
            .slice(0, 4);
    }, [allCategoryAds]);

    const clientSideFilter = useCallback((ads, filters) => {
        if (!filters || Object.keys(filters).length === 0) return ads;
        
        return ads.filter(ad => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value || value === 'All') return true;
                
                if (key === 'price_min' && ad.price) return ad.price >= Number(value);
                if (key === 'price_max' && ad.price) return ad.price <= Number(value);
                if (key === 'mileage_max' && ad.details?.mileage) return ad.details.mileage <= Number(value);
                if (ad.details?.[key]) {
                    return String(ad.details[key]).toLowerCase().includes(String(value).toLowerCase());
                }
                return true;
            });
        });
    }, []);

    // 🔧 FIXED: Fetch with cleanup
    useEffect(() => {
        if (!categoryCode) { 
            setLoading(false);
            setAllCategoryAds([]);
            return;
        }

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setLoading(true);
        const toastId = toast.loading(`Loading ${displayTitle} ads...`);

        axios.get(`${API_BASE_URL}/ads`, {
            signal: abortControllerRef.current.signal,
            timeout: 15000
        })
            .then((res) => {
                const categorySpecificAds = res.data.filter((ad) => ad.category === categoryCode);
                setAllCategoryAds(categorySpecificAds);
                toast.success(`Found ${categorySpecificAds.length} ads`, { id: toastId });
            })
            .catch((err) => { 
                if (err.name !== 'AbortError') {
                    console.error("Ads fetch error:", err);
                    toast.error(err.response?.data?.message || "Failed to load ads", { id: toastId });
                }
                setAllCategoryAds([]);
            })
            .finally(() => setLoading(false));

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [categoryCode, displayTitle]);

    useEffect(() => {
        const adsAfterFiltering = clientSideFilter(allCategoryAds, activeFilters);
        setFilteredAds(adsAfterFiltering);
    }, [activeFilters, allCategoryAds, clientSideFilter]);

    // 🔧 FIXED: Emerald theme loading state
    if (!categoryCode && !loading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">Category Not Found</h1>
                        <p className="text-slate-500">Please select a valid category from the menu.</p>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="p-6 max-w-7xl mx-auto min-h-screen bg-slate-50"> 
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 capitalize mb-2">
                        {displayTitle}
                    </h1>
                    <p className="text-slate-500 text-lg">
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <FaSpinner className="animate-spin" /> Loading...
                            </span>
                        ) : (
                            `${filteredAds.length} result${filteredAds.length !== 1 ? 's' : ''} found`
                        )}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-3"> 
                        <Filters categoryCode={categoryCode} onFilterChange={setActiveFilters} />
                    </div>

                    <div className="md:col-span-9">
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="bg-white rounded-2xl shadow-md h-80 animate-pulse">
                                        <div className="h-48 bg-slate-200 rounded-t-2xl"></div>
                                        <div className="p-4 space-y-3">
                                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredAds.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FaEye className="text-3xl text-slate-300" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">No ads found</h3>
                                <p className="text-slate-500">Try adjusting your filters or check back later.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredAds.map((ad) => (
                                    <div
                                        key={ad._id}
                                        onClick={() => handleAdClick(ad)} 
                                        className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border border-slate-100"
                                    >
                                        <div className="relative h-48 overflow-hidden bg-slate-100">
                                            <img 
                                                src={safeImage(ad.images, 0)} 
                                                alt={ad.title} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                                onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
                                            />
                                            {ad.condition && (
                                                <span className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                    {ad.condition}
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-bold text-lg text-slate-800 truncate mb-1">{ad.title}</h3> 
                                            
                                            {ad.details && (
                                                <p className="text-sm text-slate-500 truncate mb-2">
                                                    {ad.category === 'Mobile' && `${ad.details.brand} ${ad.details.model}`}
                                                    {ad.category === 'Car' && `${ad.details.make} ${ad.details.carModel}`}
                                                    {ad.category === 'PropertySale' && `${ad.details.areaSize} ${ad.details.unit || ''}`}
                                                </p>
                                            )}
                                            
                                            <p className="text-xl font-bold text-emerald-600 mb-2">
                                                Rs {ad.price?.toLocaleString()}
                                            </p> 
                                            <div className="flex items-center text-xs text-slate-400">
                                                <FaMapMarkerAlt className="mr-1" />
                                                {ad.location}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Ad Detail Modal - 🔧 FIXED: Emerald theme + accessibility */}
            {selectedAd && (
                <div 
                    className="fixed inset-0 bg-slate-900/80 flex justify-center items-start overflow-auto py-10 z-50 animate-in fade-in duration-200"
                    onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="ad-title"
                >
                    <div 
                        ref={modalRef}
                        className="bg-white max-w-5xl w-full mx-4 rounded-2xl shadow-2xl relative p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                    >
                        <button
                            onClick={handleCloseModal}
                            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-rose-500 transition-colors z-10"
                            aria-label="Close modal"
                        >
                            <FaTimes size={20} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Image Gallery */}
                            <div className="relative h-96 rounded-xl overflow-hidden shadow-lg bg-slate-100 group">
                                <img
                                    src={safeImage(selectedAd.images, currentImageIndex)}
                                    alt={selectedAd.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
                                />
                                {selectedAd.images && selectedAd.images.length > 1 && (
                                    <>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); prevImage(); }} 
                                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-3 rounded-full text-white transition-colors"
                                            aria-label="Previous image"
                                        >
                                            <FaArrowLeft />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); nextImage(); }} 
                                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-3 rounded-full text-white transition-colors"
                                            aria-label="Next image"
                                        >
                                            <FaArrowRight />
                                        </button>
                                        <span className="absolute bottom-3 right-3 bg-black/60 text-white text-sm px-3 py-1 rounded-full font-medium">
                                            {currentImageIndex + 1} / {selectedAd.images.length}
                                        </span>
                                    </>
                                )}
                                {selectedAd.images?.length > 0 && (
                                    <div 
                                        className="absolute inset-0 cursor-zoom-in"
                                        onClick={() => setShowImageModal(true)}
                                    />
                                )}
                            </div>

                            {/* Ad Info */}
                            <div className="flex flex-col">
                                <div>
                                    <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                                        {selectedAd.category}
                                    </span>
                                    <h2 id="ad-title" className="text-2xl md:text-3xl font-black text-slate-800 mb-3">
                                        {selectedAd.title}
                                    </h2>
                                    <p className="text-3xl md:text-4xl font-black text-emerald-600 mb-4 flex items-center">
                                        <FaTag className="mr-3 text-2xl" />
                                        Rs {selectedAd.price?.toLocaleString()}
                                    </p>
                                    <div className="flex items-center text-slate-600 mb-4">
                                        <FaMapMarkerAlt className="mr-2 text-emerald-500 text-lg" />
                                        <span className="font-semibold">{selectedAd.location}</span>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-3">
                                    <button
                                        onClick={handleInquiry}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold py-3.5 rounded-xl transition-colors shadow-lg active:scale-[0.98]"
                                    >
                                        Send Inquiry
                                    </button>
                                    <button
                                        onClick={handleContactSeller}
                                        className="w-full bg-slate-800 hover:bg-slate-900 text-white text-lg font-bold py-3.5 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        <FaPhoneAlt /> Chat with Seller
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="mt-8">
                            <h3 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-2">
                                Details
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {renderDetails(selectedAd)} 
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Condition</p>
                                    <p className="font-semibold text-slate-800">{selectedAd.condition}</p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mt-6">
                            <h4 className="font-bold text-lg mb-3 text-slate-800">Description</h4>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl">
                                {selectedAd.description}
                            </p>
                        </div>
                        
                        {/* Related Ads */}
                        {getRelatedAds(selectedAd).length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-xl font-bold mb-4 text-slate-800">
                                    Similar Ads
                                </h3>
                                <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-thin scrollbar-thumb-emerald-200">
                                    {getRelatedAds(selectedAd).map((relatedAd) => (
                                        <div 
                                            key={relatedAd._id}
                                            onClick={() => handleRelatedAdClick(relatedAd)}
                                            className="bg-white rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all p-3 flex-shrink-0 w-56 border border-slate-100"
                                        >
                                            <div className="relative h-32 rounded-lg overflow-hidden mb-2 bg-slate-100">
                                                <img
                                                    src={safeImage(relatedAd.images)}
                                                    alt={relatedAd.title}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                    onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
                                                />
                                            </div>
                                            <h4 className="font-semibold text-sm truncate text-slate-800">{relatedAd.title}</h4>
                                            <span className="text-lg font-bold text-emerald-600">
                                                Rs {relatedAd.price?.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Fullscreen Image Modal */}
            {selectedAd && showImageModal && (
                <div 
                    className="fixed inset-0 bg-black/95 flex justify-center items-center z-[60] animate-in fade-in duration-200"
                    onClick={() => setShowImageModal(false)}
                >
                    <button
                        onClick={() => setShowImageModal(false)}
                        className="absolute top-6 right-6 text-white hover:text-rose-400 transition-colors z-10"
                        aria-label="Close fullscreen"
                    >
                        <FaTimes size={32} />
                    </button>
                    <div className="relative w-full h-full max-w-6xl max-h-[90vh] p-4">
                        <img
                            src={safeImage(selectedAd.images, currentImageIndex)}
                            alt={selectedAd.title}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
                        />
                        {selectedAd.images && selectedAd.images.length > 1 && (
                            <>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); prevImage(); }} 
                                    className="absolute left-6 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 p-4 rounded-full transition-colors"
                                    aria-label="Previous"
                                >
                                    <FaArrowLeft size={24} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); nextImage(); }} 
                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 p-4 rounded-full transition-colors"
                                    aria-label="Next"
                                >
                                    <FaArrowRight size={24} />
                                </button>
                                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-lg px-4 py-2 rounded-full font-medium">
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