import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { 
    FaSearch, FaStar, FaMapMarkerAlt, FaPhoneAlt, FaUserCircle, 
    FaCheckCircle, FaArrowLeft, FaArrowRight, FaFlag, FaShieldAlt,
    FaTimes, FaWhatsapp, FaCommentDots, FaHeart, FaShareAlt,
    FaFilter, FaSort, FaBolt, FaEye, FaClock, FaTag,
    FaThLarge, FaList, FaChevronDown, FaCheck
} from "react-icons/fa";
import toast from "react-hot-toast";

// 🔧 FIXED: API URL without space
const API_BASE_URL = "https://rezon.up.railway.app/api";

// 🔥 NEW: Modern category data with gradients
const CATEGORIES = [
    { code: "All", name: "All Items", icon: "🏠", gradient: "from-slate-500 to-slate-600" },
    { code: "Mobile", name: "Mobiles", icon: "📱", gradient: "from-blue-500 to-cyan-500" },
    { code: "Car", name: "Vehicles", icon: "🚗", gradient: "from-red-500 to-rose-500" },
    { code: "PropertySale", name: "For Sale", icon: "🏠", gradient: "from-emerald-500 to-teal-500" },
    { code: "PropertyRent", name: "For Rent", icon: "🏢", gradient: "from-violet-500 to-purple-500" },
    { code: "Electronics", name: "Electronics", icon: "📺", gradient: "from-amber-500 to-orange-500" },
    { code: "Bikes", name: "Bikes", icon: "🏍️", gradient: "from-pink-500 to-rose-500" },
    { code: "Business", name: "Business", icon: "💼", gradient: "from-indigo-500 to-blue-500" },
    { code: "Services", name: "Services", icon: "🛠️", gradient: "from-cyan-500 to-sky-500" },
    { code: "Jobs", name: "Jobs", icon: "💼", gradient: "from-teal-500 to-emerald-500" },
    { code: "Animals", name: "Animals", icon: "🐾", gradient: "from-lime-500 to-green-500" },
    { code: "Furniture", name: "Furniture", icon: "🛋️", gradient: "from-yellow-500 to-amber-500" },
    { code: "Fashion", name: "Fashion", icon: "👕", gradient: "from-fuchsia-500 to-pink-500" },
    { code: "Books", name: "Books", icon: "📚", gradient: "from-orange-500 to-red-500" },
    { code: "Kids", name: "Kids", icon: "👶", gradient: "from-green-500 to-emerald-500" },
];

// 🔥 NEW: Click-to-Call Handler
const handleCallSeller = (phoneNumber) => {
    if (!phoneNumber) {
        toast.error("Seller phone number not available");
        return;
    }
    const cleanNumber = phoneNumber.replace(/[\s-]/g, '');
    window.location.href = `tel:${cleanNumber}`;
    toast.success(`Dialing ${phoneNumber}...`, { icon: '📞' });
};

// 🔥 NEW: Modern Ad Card Component
const AdCard = ({ ad, onClick, isListView }) => {
    return (
        <div 
            onClick={onClick}
            className={`
                group bg-white rounded-2xl overflow-hidden cursor-pointer
                transition-all duration-300 hover:shadow-2xl hover:-translate-y-1
                border border-slate-100 hover:border-emerald-200
                ${isListView ? 'flex flex-row' : 'flex flex-col'}
            `}
        >
            {/* Image Section */}
            <div className={`
                relative overflow-hidden bg-slate-100
                ${isListView ? 'w-48 h-40 shrink-0' : 'w-full h-48'}
            `}>
                <img 
                    src={ad.images?.[0] || "https://via.placeholder.com/400"} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    alt={ad.title}
                    loading="lazy"
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {ad.condition === 'New' && (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                            New
                        </span>
                    )}
                    <span className="bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        {ad.category}
                    </span>
                </div>
                
                {/* Favorite Button */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        toast.success("Added to favorites!");
                    }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm"
                >
                    <FaHeart size={14} />
                </button>

                {/* Price Tag */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white font-black text-lg">
                        Rs {ad.price?.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-800 text-sm mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                    {ad.title}
                </h3>
                
                <div className="flex items-center text-xs text-slate-500 mb-3">
                    <FaMapMarkerAlt className="mr-1 text-emerald-500" /> 
                    <span className="truncate">{ad.location}</span>
                </div>

                <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <FaStar className="text-yellow-400 text-xs" />
                        <span className="text-xs font-bold text-slate-700">{ad.sellerRating || "4.5"}</span>
                        <span className="text-xs text-slate-400">({Math.floor(Math.random() * 50) + 1})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(ad.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                </div>
            </div>
        </div>
    );
};

// 🔥 MAIN COMPONENT
const AllAds = ({ user }) => {
    const navigate = useNavigate();
    const [ads, setAds] = useState([]);
    const [filteredAds, setFilteredAds] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'price-low' | 'price-high'
    const [showFilters, setShowFilters] = useState(false);
    
    const [selectedAd, setSelectedAd] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [sellerTrust, setSellerTrust] = useState({ avg: 0, total: 0 });
    const [sellerPhone, setSellerPhone] = useState(null);
    
    const [profileModalUid, setProfileModalUid] = useState(null);
    const [sellerInfo, setSellerInfo] = useState(null);
    const [sellerReviews, setSellerReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    
    const abortControllerRef = useRef(null);

    // Fetch Ads
    useEffect(() => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        const fetchAds = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API_BASE_URL}/ads`, {
                    signal: abortControllerRef.current.signal,
                    timeout: 15000
                });
                setAds(res.data || []);
                setFilteredAds(res.data || []);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    toast.error("Failed to load ads");
                }
            } finally {
                setLoading(false);
            }
        };
        
        fetchAds();
        return () => abortControllerRef.current?.abort();
    }, []);

    // Filter & Sort Logic
    useEffect(() => {
        let result = [...ads];
        
        // Category filter
        if (activeCategory !== "All") {
            result = result.filter(ad => ad.category === activeCategory);
        }
        
        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(ad => 
                ad.title?.toLowerCase().includes(term) ||
                ad.description?.toLowerCase().includes(term) ||
                ad.location?.toLowerCase().includes(term)
            );
        }
        
        // Sorting
        switch(sortBy) {
            case 'price-low':
                result.sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case 'price-high':
                result.sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case 'newest':
            default:
                result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        
        setFilteredAds(result);
    }, [searchTerm, activeCategory, ads, sortBy]);

    // Fetch Seller Details
    useEffect(() => {
        const fetchSeller = async () => {
            const uid = profileModalUid || selectedAd?.posted_by_uid;
            if (!uid) return;

            try {
                if (profileModalUid) setLoadingReviews(true);
                
                const res = await axios.get(`${API_BASE_URL}/reviews/seller/${uid}`, {
                    timeout: 10000
                });
                
                const reviews = res.data.reviews || [];
                const seller = res.data.seller || null;
                const avg = reviews.length > 0 
                    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
                    : "0.0";

                if (profileModalUid) {
                    setSellerReviews(reviews);
                    setSellerInfo(seller);
                } else {
                    setSellerTrust({ avg, total: reviews.length });
                    setSellerPhone(seller?.phone || seller?.mobile || null);
                }
                setLoadingReviews(false);
            } catch (err) { 
                setLoadingReviews(false);
            }
        };
        fetchSeller();
    }, [selectedAd, profileModalUid]);

    const startChat = useCallback(async (isReport = false) => {
        if (!user) return toast.error("Please login first!");
        if (!selectedAd) return;

        try {
            const token = localStorage.getItem('firebaseIdToken') || user?.accessToken;
            const res = await axios.post(
                `${API_BASE_URL}/chat/start`,
                {
                    buyerId: user.uid, 
                    sellerId: selectedAd.posted_by_uid, 
                    adId: selectedAd._id
                },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
            );
            
            if (res.data?.chatId) {
                navigate(`/chat/${res.data.chatId}`, { state: { isReportRequest: isReport } });
            }
        } catch (error) { 
            toast.error("Failed to start chat");
        }
    }, [user, selectedAd, navigate]);

    const handleAdClick = useCallback((ad) => {
        setSelectedAd(ad);
        setCurrentImageIndex(0);
        setSellerPhone(null);
    }, []);

    const closeModal = useCallback(() => {
        setSelectedAd(null);
        setProfileModalUid(null);
    }, []);

    // Get active category gradient
    const activeCategoryData = CATEGORIES.find(c => c.code === activeCategory);

    return (
        <div className="w-full min-h-screen bg-slate-50">
            {/* 🔥 NEW: Hero Header with Dynamic Gradient */}
            <div className={`bg-gradient-to-r ${activeCategoryData?.gradient || 'from-emerald-500 to-teal-600'} text-white`}>
                <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black mb-2">
                                {activeCategory === 'All' ? 'Discover Amazing Deals' : activeCategoryData?.name}
                            </h1>
                            <p className="text-white/80 text-sm md:text-base">
                                {filteredAds.length} {filteredAds.length === 1 ? 'item' : 'items'} found
                            </p>
                        </div>
                        
                        {/* Search Bar */}
                        <div className="relative max-w-md w-full">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search anything..." 
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/95 backdrop-blur text-slate-800 placeholder:text-slate-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30"
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔥 NEW: Sticky Filter Bar */}
            <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
                        {CATEGORIES.map((cat) => (
                            <button 
                                key={cat.code} 
                                onClick={() => setActiveCategory(cat.code)}
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all
                                    ${activeCategory === cat.code 
                                        ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg` 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }
                                `}
                            >
                                <span>{cat.icon}</span>
                                <span className="hidden sm:inline">{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 🔥 NEW: Control Bar */}
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        {/* Sort Dropdown */}
                        <div className="relative">
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="appearance-none bg-slate-100 text-slate-700 font-semibold text-sm px-4 py-2.5 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                            >
                                <option value="newest">📅 Newest First</option>
                                <option value="price-low">💰 Price: Low to High</option>
                                <option value="price-high">💰 Price: High to Low</option>
                            </select>
                            <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <FaThLarge />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <FaList />
                        </button>
                    </div>
                </div>
            </div>

            {/* 🔥 NEW: Content Area */}
            <div className="max-w-7xl mx-auto px-4 pb-12">
                {loading ? (
                    <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl h-72 animate-pulse">
                                <div className={`bg-slate-200 ${viewMode === 'list' ? 'w-48 h-full float-left' : 'h-48 rounded-t-2xl'}`}></div>
                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredAds.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaSearch className="text-4xl text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No items found</h3>
                        <p className="text-slate-500">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
                        {filteredAds.map((ad) => (
                            <AdCard 
                                key={ad._id} 
                                ad={ad} 
                                onClick={() => handleAdClick(ad)}
                                isListView={viewMode === 'list'}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* 🔥 NEW: Redesigned Detail Modal */}
            {selectedAd && (
                <div 
                    className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex justify-center items-center z-[100] p-2 md:p-6 animate-in fade-in duration-200"
                    onClick={(e) => e.target === e.currentTarget && closeModal()}
                >
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button onClick={closeModal} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                                    <FaArrowLeft />
                                </button>
                                <span className="text-sm font-medium text-slate-500">Ad Details</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => {}} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
                                    <FaShareAlt />
                                </button>
                                <button onClick={closeModal} className="w-10 h-10 rounded-full hover:bg-rose-50 flex items-center justify-center text-slate-500 hover:text-rose-500">
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 lg:grid-cols-2">
                                {/* Image Gallery */}
                                <div className="relative h-72 md:h-[600px] bg-slate-100 lg:sticky lg:top-0">
                                    <img 
                                        src={selectedAd.images?.[currentImageIndex] || "https://via.placeholder.com/600"} 
                                        className="w-full h-full object-contain bg-slate-50" 
                                        alt={selectedAd.title}
                                    />
                                    
                                    {selectedAd.images?.length > 1 && (
                                        <>
                                            <button onClick={() => setCurrentImageIndex(p => (p - 1 + selectedAd.images.length) % selectedAd.images.length)} 
                                                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-700 shadow-lg hover:bg-emerald-500 hover:text-white transition-colors">
                                                <FaArrowLeft />
                                            </button>
                                            <button onClick={() => setCurrentImageIndex(p => (p + 1) % selectedAd.images.length)} 
                                                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-700 shadow-lg hover:bg-emerald-500 hover:text-white transition-colors">
                                                <FaArrowRight />
                                            </button>
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
                                                {currentImageIndex + 1} / {selectedAd.images.length}
                                            </div>
                                        </>
                                    )}

                                    {/* Thumbnail Strip */}
                                    {selectedAd.images?.length > 1 && (
                                        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2">
                                            {selectedAd.images.map((img, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentImageIndex(idx)}
                                                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-white opacity-70'}`}
                                                >
                                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Details Panel */}
                                <div className="p-6 lg:p-8 bg-white">
                                    {/* Price & Title */}
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                                {selectedAd.condition}
                                            </span>
                                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                                                {selectedAd.category}
                                            </span>
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 leading-tight">
                                            {selectedAd.title}
                                        </h2>
                                        <p className="text-4xl md:text-5xl font-black text-emerald-600">
                                            Rs {selectedAd.price?.toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Seller Card */}
                                    <div 
                                        onClick={() => setProfileModalUid(selectedAd.posted_by_uid)}
                                        className="bg-slate-50 rounded-2xl p-4 mb-6 cursor-pointer hover:bg-emerald-50 transition-colors border border-slate-200"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                                    {sellerInfo?.name?.charAt(0) || "S"}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{sellerInfo?.name || "Verified Seller"}</p>
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <FaStar className="text-yellow-400" />
                                                        <span className="font-bold text-slate-700">{sellerTrust.avg}</span>
                                                        <span className="text-slate-400">({sellerTrust.total} reviews)</span>
                                                        <span className="mx-2 text-slate-300">|</span>
                                                        <FaCheckCircle className="text-emerald-500" />
                                                        <span className="text-xs text-emerald-600 font-medium">Verified</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <FaArrowRight className="text-slate-400" />
                                        </div>
                                    </div>

                                    {/* Quick Details */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        {Object.entries(selectedAd.details || {}).slice(0, 4).map(([key, val]) => (
                                            <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{key}</p>
                                                <p className="font-semibold text-slate-800 truncate">{val}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Description */}
                                    <div className="mb-8">
                                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                            <FaTag className="text-emerald-500" /> Description
                                        </h4>
                                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl">
                                            {selectedAd.description}
                                        </p>
                                    </div>

                                    {/* Location */}
                                    <div className="flex items-center gap-2 text-slate-500 mb-8 p-4 bg-slate-50 rounded-xl">
                                        <FaMapMarkerAlt className="text-emerald-500 text-xl" />
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider">Location</p>
                                            <p className="font-semibold text-slate-800">{selectedAd.location}</p>
                                        </div>
                                    </div>

                                    {/* 🔥 NEW: Action Buttons */}
                                    <div className="space-y-3 sticky bottom-0 bg-white pt-4 border-t border-slate-100">
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => startChat(false)} 
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                                                <FaCommentDots /> Chat
                                            </button>
                                            <button onClick={() => handleCallSeller(sellerPhone)}
                                                disabled={!sellerPhone}
                                                className={`py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${sellerPhone ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                                                <FaPhoneAlt /> {sellerPhone ? 'Call' : 'No Phone'}
                                            </button>
                                        </div>
                                        
                                        {sellerPhone && (
                                            <a href={`https://wa.me/${sellerPhone.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in your ${selectedAd.title} on Rezon`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all">
                                                <FaWhatsapp size={20} /> WhatsApp Seller
                                            </a>
                                        )}
                                        
                                        <button onClick={() => startChat(true)} 
                                            className="w-full text-rose-500 text-sm font-medium flex items-center justify-center gap-2 py-3 hover:bg-rose-50 rounded-xl transition-colors">
                                            <FaFlag /> Report this listing
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Modal */}
            {profileModalUid && (
                <div className="fixed inset-0 bg-slate-900/90 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={(e) => e.target === e.currentTarget && setProfileModalUid(null)}>
                    <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white text-center relative">
                            <button onClick={() => setProfileModalUid(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
                                <FaTimes />
                            </button>
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl shadow-xl mx-auto mb-3 text-slate-400">
                                {sellerInfo?.name?.charAt(0) || "S"}
                            </div>
                            <h3 className="font-black text-2xl">{sellerInfo?.name || "Seller"}</h3>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                    <FaShieldAlt /> Verified
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                                <div>
                                    <p className="text-2xl font-black text-emerald-600">{sellerTrust.avg}</p>
                                    <p className="text-xs text-slate-500 uppercase">Rating</p>
                                </div>
                                <div className="border-x border-slate-100">
                                    <p className="text-2xl font-black text-slate-800">{sellerReviews.length}</p>
                                    <p className="text-xs text-slate-500 uppercase">Reviews</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-slate-800">100%</p>
                                    <p className="text-xs text-slate-500 uppercase">Response</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {loadingReviews ? (
                                    <div className="text-center py-8"><FaSpinner className="animate-spin text-emerald-600 text-2xl mx-auto" /></div>
                                ) : sellerReviews.length > 0 ? (
                                    sellerReviews.map(rev => (
                                        <div key={rev._id} className="bg-slate-50 p-4 rounded-2xl">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-slate-800 text-sm">{rev.buyerId?.name || "Buyer"}</span>
                                                <div className="flex text-yellow-400 text-xs">
                                                    {[...Array(5)].map((_, i) => (
                                                        <FaStar key={i} className={i < rev.rating ? "text-yellow-400" : "text-slate-200"} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 italic">"{rev.comment}"</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-slate-400 py-8">No reviews yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllAds;