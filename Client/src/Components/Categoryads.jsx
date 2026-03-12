import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
    FaFilter, FaRedo, FaArrowLeft, FaArrowRight, FaTimes, 
    FaMapMarkerAlt, FaTag, FaPhoneAlt, FaSpinner, FaEye, FaChevronRight
} from "react-icons/fa";
import toast from "react-hot-toast";
import Navbar from "./Navbar";
import Footer from "./footer";

const API_BASE_URL = "https://rezon.up.railway.app/api";

const getCodeFromSlug = (slug) => {
    const codeMap = {
        'mobile': 'Mobile', 'mobiles': 'Mobile',
        'car': 'Car', 'vehicles': 'Car',
        'propertysale': 'PropertySale', 'property-for-sale': 'PropertySale',
        'propertyrent': 'PropertyRent', 'property-for-rent': 'PropertyRent',
        'electronics': 'Electronics', 'bikes': 'Bikes',
        'business': 'Business', 'services': 'Services',
        'jobs': 'Jobs', 'animals': 'Animals',
        'furniture': 'Furniture', 'fashion': 'Fashion',
        'books': 'Books', 'kids': 'Kids'
    };
    return codeMap[slug?.toLowerCase()] || '';
};

const CATEGORY_FILTER_MAP = {
    "Mobile": [
        { name: "brand", label: "Brand", type: "text", placeholder: "Samsung..." },
        { name: "price_min", label: "Min Price", type: "number" },
        { name: "price_max", label: "Max Price", type: "number" },
        { name: "condition", label: "Condition", type: "select", options: ["New", "Used"] },
    ],
    "Car": [
        { name: "make", label: "Make", type: "text", placeholder: "Toyota..." },
        { name: "fuelType", label: "Fuel", type: "select", options: ["Petrol", "Diesel", "Hybrid", "Electric"] },
        { name: "transmission", label: "Gear", type: "select", options: ["Automatic", "Manual"] },
    ],
    "default": [
        { name: "price_min", label: "Min Price", type: "number" },
        { name: "price_max", label: "Max Price", type: "number" },
    ]
};

const DEFAULT_IMAGE = "https://via.placeholder.com/400x300?text=No+Image";

const CategoryAds = () => {
    const { slug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    const [allAds, setAllAds] = useState([]);
    const [filteredAds, setFilteredAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilters, setActiveFilters] = useState({});
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [selectedAd, setSelectedAd] = useState(null);
    const [imgIdx, setImgIdx] = useState(0);

    const categoryCode = useMemo(() => getCodeFromSlug(slug || location.pathname.split('/').pop()), [slug, location]);
    const displayTitle = (slug || "").replace(/-/g, " ");

    // Fetch Ads
    useEffect(() => {
        if (!categoryCode) return;
        setLoading(true);
        axios.get(`${API_BASE_URL}/ads`)
            .then(res => {
                const data = res.data.filter(ad => ad.category === categoryCode);
                setAllAds(data);
                setFilteredAds(data);
            })
            .catch(() => toast.error("Failed to fetch ads"))
            .finally(() => setLoading(false));
    }, [categoryCode]);

    // Filtering Logic
    useEffect(() => {
        let result = allAds;
        Object.entries(activeFilters).forEach(([key, val]) => {
            if (!val) return;
            if (key === 'price_min') result = result.filter(a => a.price >= Number(val));
            else if (key === 'price_max') result = result.filter(a => a.price <= Number(val));
            else result = result.filter(a => String(a.details?.[key] || "").toLowerCase().includes(val.toLowerCase()));
        });
        setFilteredAds(result);
    }, [activeFilters, allAds]);

    const handleFilterChange = (e) => {
        setActiveFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col">
            <Navbar />
            
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 capitalize tracking-tight">
                            {displayTitle || "Browse Ads"}
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">
                            {loading ? "Searching..." : `${filteredAds.length} Ads Available`}
                        </p>
                    </div>
                    {/* Mobile Filter Toggle */}
                    <button 
                        onClick={() => setShowMobileFilters(!showMobileFilters)}
                        className="md:hidden flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                    >
                        <FaFilter /> {showMobileFilters ? "Hide Filters" : "Show Filters"}
                    </button>
                </div>

                <div className="flex flex-col md:grid md:grid-cols-12 gap-8">
                    {/* Sidebar Filters */}
                    <aside className={`${showMobileFilters ? 'block' : 'hidden'} md:block md:col-span-3 space-y-6`}>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-sm tracking-widest">
                                    <FaFilter className="text-emerald-600" /> Filters
                                </h3>
                                <button onClick={() => setActiveFilters({})} className="text-xs font-bold text-emerald-600 hover:underline">Reset</button>
                            </div>
                            
                            <div className="space-y-4">
                                {(CATEGORY_FILTER_MAP[categoryCode] || CATEGORY_FILTER_MAP.default).map(f => (
                                    <div key={f.name}>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">{f.label}</label>
                                        {f.type === 'select' ? (
                                            <select name={f.name} onChange={handleFilterChange} value={activeFilters[f.name] || ""} className="w-full p-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm">
                                                <option value="">All</option>
                                                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <input type={f.type} name={f.name} onChange={handleFilterChange} value={activeFilters[f.name] || ""} placeholder={f.placeholder} className="w-full p-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Ads Grid */}
                    <section className="md:col-span-9">
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1,2,3,4,5,6].map(i => <div key={i} className="h-80 bg-white rounded-3xl animate-pulse border border-slate-100" />)}
                            </div>
                        ) : filteredAds.length === 0 ? (
                            <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
                                <FaEye className="text-5xl text-slate-200 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-800">No Ads Found</h3>
                                <p className="text-slate-400">Try changing your filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredAds.map(ad => (
                                    <div key={ad._id} onClick={() => setSelectedAd(ad)} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 hover:shadow-2xl hover:shadow-emerald-100 transition-all cursor-pointer group">
                                        <div className="h-56 relative overflow-hidden">
                                            <img src={ad.images?.[0] || DEFAULT_IMAGE} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={ad.title} />
                                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-emerald-600 shadow-sm">
                                                {ad.condition}
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <p className="text-2xl font-black text-slate-800 mb-1">Rs {ad.price?.toLocaleString()}</p>
                                            <h3 className="font-bold text-slate-600 truncate text-sm mb-3">{ad.title}</h3>
                                            <div className="flex items-center text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                                                <FaMapMarkerAlt className="mr-1.5 text-emerald-500" /> {ad.location}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* Ad Detail Modal */}
            {selectedAd && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setSelectedAd(null)} />
                    <div className="bg-white w-full max-w-5xl rounded-[2.5rem] overflow-hidden relative shadow-2xl flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300">
                        {/* Image Section */}
                        <div className="w-full md:w-1/2 bg-slate-100 relative h-64 md:h-auto">
                            <img src={selectedAd.images?.[imgIdx] || DEFAULT_IMAGE} className="w-full h-full object-cover" alt="view" />
                            {selectedAd.images?.length > 1 && (
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                                    {selectedAd.images.map((_, i) => (
                                        <button key={i} onClick={() => setImgIdx(i)} className={`h-2 rounded-full transition-all ${i === imgIdx ? 'w-8 bg-emerald-500' : 'w-2 bg-white/50'}`} />
                                    ))}
                                </div>
                            )}
                            <button onClick={() => setSelectedAd(null)} className="absolute top-6 left-6 md:hidden bg-white p-2 rounded-full shadow-lg"><FaTimes /></button>
                        </div>
                        {/* Info Section */}
                        <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto flex flex-col">
                            <button onClick={() => setSelectedAd(null)} className="hidden md:flex ml-auto text-slate-300 hover:text-rose-500 transition-colors mb-4"><FaTimes size={24} /></button>
                            <span className="text-emerald-600 font-black text-xs uppercase tracking-[0.2em] mb-2">{selectedAd.category}</span>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2 leading-tight">{selectedAd.title}</h2>
                            <p className="text-3xl md:text-4xl font-black text-emerald-600 mb-6">Rs {selectedAd.price?.toLocaleString()}</p>
                            
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                {Object.entries(selectedAd.details || {}).map(([k, v]) => (
                                    <div key={k} className="bg-slate-50 p-4 rounded-2xl">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{k}</p>
                                        <p className="text-sm font-bold text-slate-700">{v}</p>
                                    </div>
                                ))}
                            </div>

                            <p className="text-slate-500 text-sm leading-relaxed mb-8 whitespace-pre-wrap">{selectedAd.description}</p>
                            
                            <div className="mt-auto flex flex-col sm:flex-row gap-4">
                                <button 
                                    onClick={() => navigate(`/chat/start/${selectedAd._id}`)}
                                    className="flex-1 bg-emerald-600 text-white h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all"
                                >
                                    <FaPhoneAlt /> CHAT WITH SELLER
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default CategoryAds;