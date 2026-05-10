import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { 
    FaSearch, FaStar, FaMapMarkerAlt, FaPhoneAlt, FaUserCircle, 
    FaCheckCircle, FaArrowLeft, FaArrowRight, FaFlag, FaShieldAlt,
    FaTimes, FaWhatsapp, FaCommentDots, FaHeart, FaShareAlt,
    FaFilter, FaSort, FaBolt, FaEye, FaClock, FaTag,
    FaThLarge, FaList, FaChevronDown, FaCheck,
    FaChevronLeft, FaChevronRight, FaCircle, FaSpinner
} from "react-icons/fa";
import toast from "react-hot-toast";
import LocationDropdown from "./LocationDropdown";

const API_BASE_URL = "https://rezon.up.railway.app/api";

const CATEGORIES = [
    { code: "All", name: "All Items", icon: "🏠" },
    { code: "Mobile", name: "Mobiles", icon: "📱" },
    { code: "Car", name: "Vehicles", icon: "🚗" },
    { code: "PropertySale", name: "For Sale", icon: "🏠" },
    { code: "PropertyRent", name: "For Rent", icon: "🏢" },
    { code: "Electronics", name: "Electronics", icon: "📺" },
    { code: "Bikes", name: "Bikes", icon: "🏍️" },
    { code: "Business", name: "Business", icon: "💼" },
    { code: "Services", name: "Services", icon: "🛠️" },
    { code: "Jobs", name: "Jobs", icon: "💼" },
    { code: "Animals", name: "Animals", icon: "🐾" },
    { code: "Furniture", name: "Furniture", icon: "🛋️" },
    { code: "Fashion", name: "Fashion", icon: "👕" },
    { code: "Books", name: "Books", icon: "📚" },
    { code: "Kids", name: "Kids", icon: "👶" },
];

const PROFESSIONAL_GRADIENT = "from-slate-700 via-slate-800 to-slate-900";
const ACTIVE_CATEGORY_BG = "bg-slate-800";

// 🔥 NEW: Pagination config
const ITEMS_PER_PAGE_DESKTOP = 10;
const ITEMS_PER_PAGE_MOBILE = 6;

const handleCallSeller = (phoneNumber) => {
    if (!phoneNumber) {
        toast.error("Seller phone number not available");
        return;
    }
    const cleanNumber = phoneNumber.replace(/[\s-]/g, '');
    window.location.href = `tel:${cleanNumber}`;
    toast.success(`Dialing ${phoneNumber}...`, { icon: '📞' });
};

// 🔥 FIXED: Real reviews — no dummy data
const AdCard = ({ ad, onClick, isListView, sellerStats }) => {
    const stats = sellerStats?.[ad.posted_by_uid];
    const rating = stats?.avg ?? ad.sellerRating ?? null;
    const reviewCount = stats?.count ?? ad.reviewCount ?? 0;

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
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        toast.success("Added to favorites!");
                    }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm"
                >
                    <FaHeart size={14} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white font-black text-lg">
                        Rs {ad.price?.toLocaleString()}
                    </p>
                </div>
            </div>
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
                        <FaStar className={`text-xs ${rating ? 'text-yellow-400' : 'text-slate-300'}`} />
                        <span className="text-xs font-bold text-slate-700">
                            {rating ? Number(rating).toFixed(1) : "New"}
                        </span>
                        {reviewCount > 0 && (
                            <span className="text-xs text-slate-400">({reviewCount})</span>
                        )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(ad.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                </div>
            </div>
        </div>
    );
};

const AllAds = ({ user }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const urlSearch = searchParams.get('search') || '';
    const urlLocation = searchParams.get('location') || '';
    const urlCategory = searchParams.get('category') || 'All';

    const [searchTerm, setSearchTerm] = useState(urlSearch);
    const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
    const [selectedLocation, setSelectedLocation] = useState(urlLocation);

    const [ads, setAds] = useState([]);
    const [filteredAds, setFilteredAds] = useState([]);
    const [activeCategory, setActiveCategory] = useState(urlCategory);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('newest');
    const [showFilters, setShowFilters] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // 🔥 NEW: Real seller stats state
    const [sellerStats, setSellerStats] = useState({});

    // 🔥 NEW: Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    const [selectedAd, setSelectedAd] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [sellerTrust, setSellerTrust] = useState({ avg: 0, total: 0 });
    const [sellerPhone, setSellerPhone] = useState(null);

    const [profileModalUid, setProfileModalUid] = useState(null);
    const [sellerInfo, setSellerInfo] = useState(null);
    const [sellerReviews, setSellerReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);

    const abortControllerRef = useRef(null);
    const touchStartX = useRef(null);

    const REPORT_REASONS = [
        'Scam/Fraud',
        'Abusive Behavior', 
        'Fake Product',
        'Inappropriate Content',
        'Spam',
        'Other'
    ];

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const currentSearch = searchParams.get('search') || '';
        const currentLocation = searchParams.get('location') || '';
        const currentCategory = searchParams.get('category') || 'All';

        if (currentSearch !== searchTerm) setSearchTerm(currentSearch);
        if (currentLocation !== selectedLocation) setSelectedLocation(currentLocation);
        if (currentCategory !== activeCategory) setActiveCategory(currentCategory);
    }, [searchParams]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const current = searchParams.get('search') || '';
        if (debouncedSearch !== current) {
            const params = new URLSearchParams();
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
            if (selectedLocation) params.set('location', selectedLocation);
            if (activeCategory !== 'All') params.set('category', activeCategory);
            setSearchParams(params);
        }
    }, [debouncedSearch, selectedLocation, activeCategory, setSearchParams, searchParams]);

    // 🔥 NEW: Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, activeCategory, selectedLocation, sortBy]);

    // Fetch Ads
    useEffect(() => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        const fetchAds = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
                if (activeCategory !== 'All') params.append('category', activeCategory);

                const queryString = params.toString();
                const url = `${API_BASE_URL}/ads${queryString ? `?${queryString}` : ''}`;

                const res = await axios.get(url, {
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
    }, [debouncedSearch, activeCategory]);

    // 🔥 NEW: Fetch REAL seller stats for visible ads
    useEffect(() => {
        const fetchSellerStats = async () => {
            if (!ads.length) return;
            
            const uniqueUids = [...new Set(ads.map(ad => ad.posted_by_uid).filter(Boolean))];
            const newStats = { ...sellerStats };
            let hasNew = false;

            await Promise.all(
                uniqueUids.map(async (uid) => {
                    if (newStats[uid] !== undefined) return;
                    
                    try {
                        const res = await axios.get(`${API_BASE_URL}/reviews/seller/${uid}`, { timeout: 5000 });
                        const reviews = res.data?.reviews || [];
                        const avg = reviews.length > 0 
                            ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                            : null;
                        newStats[uid] = { avg, count: reviews.length };
                    } catch (e) {
                        newStats[uid] = { avg: null, count: 0 };
                    }
                    hasNew = true;
                })
            );
            
            if (hasNew) setSellerStats(newStats);
        };
        
        fetchSellerStats();
    }, [ads]);

    // Filter ads
    useEffect(() => {
        let result = [...ads];
        if (activeCategory !== "All") {
            result = result.filter(ad => ad.category === activeCategory);
        }
        if (selectedLocation) {
            const loc = selectedLocation.toLowerCase();
            result = result.filter(ad => {
                const adLoc = (ad.location || "").toLowerCase();
                return adLoc.includes(loc);
            });
        }
        if (debouncedSearch) {
            const term = debouncedSearch.toLowerCase();
            result = result.filter(ad => 
                ad.title?.toLowerCase().includes(term) ||
                ad.description?.toLowerCase().includes(term) ||
                ad.location?.toLowerCase().includes(term)
            );
        }
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
    }, [debouncedSearch, activeCategory, ads, sortBy, selectedLocation]);

    // Fetch seller details (for modal)
    useEffect(() => {
        const fetchSeller = async () => {
            const uid = profileModalUid || selectedAd?.posted_by_uid;
            if (!uid) return;
            try {
                if (profileModalUid) setLoadingReviews(true);
                const userRes = await axios.get(`${API_BASE_URL}/users/${uid}`, {
                    timeout: 10000
                }).catch(() => ({ data: null }));
                const reviewsRes = await axios.get(`${API_BASE_URL}/reviews/seller/${uid}`, {
                    timeout: 10000
                });
                const reviews = reviewsRes.data?.reviews || [];
                const seller = userRes.data || reviewsRes.data?.seller || null;
                const avg = reviews.length > 0 
                    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
                    : "0.0";
                if (profileModalUid) {
                    setSellerReviews(reviews);
                    setSellerInfo(seller);
                } else {
                    setSellerTrust({ avg, total: reviews.length });
                    const phone = selectedAd?.phoneNumber || 
                                  selectedAd?.sellerPhone || 
                                  seller?.phoneNumber || 
                                  seller?.phone || 
                                  seller?.mobile || 
                                  null;
                    setSellerPhone(phone);
                }
                setLoadingReviews(false);
            } catch (err) { 
                console.error("Seller fetch error:", err);
                setLoadingReviews(false);
            }
        };
        fetchSeller();
    }, [selectedAd, profileModalUid]);

    // Open ad from URL param
    useEffect(() => {
        const openAdId = searchParams.get('openAd');
        
        if (openAdId && ads.length > 0) {
            const adToOpen = ads.find(a => a._id === openAdId);
            if (adToOpen) {
                setSelectedAd(adToOpen);
                setCurrentImageIndex(0);
            }
        }
    }, [ads, searchParams]);

    const startChat = useCallback(async () => {
        if (!user) {
            toast.error("Please login first!");
            return;
        }
        if (!selectedAd) return;
        try {
            const token = await user.getIdToken();
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
                navigate(`/chat/${res.data.chatId}`);
            }
        } catch (error) { 
            toast.error("Failed to start chat");
        }
    }, [user, selectedAd, navigate]);

    const handleReportClick = useCallback(() => {
        if (!user) {
            toast.error("Please login first!");
            return;
        }
        setShowReportModal(true);
    }, [user]);

    const submitReport = useCallback(async () => {
        if (!reportReason) {
            toast.error("Please select a reason for reporting");
            return;
        }
        if (!reportDescription.trim()) {
            toast.error("Please provide a description");
            return;
        }

        setReportSubmitting(true);
        try {
            const token = await user.getIdToken();
            const reportData = {
                adId: selectedAd._id,
                reportedUserId: selectedAd.posted_by_uid,
                reason: reportReason,
                description: reportDescription
            };

            await axios.post(`${API_BASE_URL}/reports`, reportData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Report submitted successfully");
            setShowReportModal(false);
            setReportReason('');
            setReportDescription('');
        } catch (err) {
            console.error("Report error:", err);
            toast.error(err.response?.data?.message || "Failed to submit report");
        } finally {
            setReportSubmitting(false);
        }
    }, [reportReason, reportDescription, selectedAd, user]);

    const handleAdClick = useCallback((ad) => {
        setSelectedAd(ad);
        setCurrentImageIndex(0);
        setSellerPhone(null);
    }, []);

    const closeModal = useCallback(() => {
        setSelectedAd(null);
        setProfileModalUid(null);
        setShowReportModal(false);
    }, []);

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        if (!touchStartX.current) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                setCurrentImageIndex(p => (p + 1) % (selectedAd?.images?.length || 1));
            } else {
                setCurrentImageIndex(p => (p - 1 + (selectedAd?.images?.length || 1)) % (selectedAd?.images?.length || 1));
            }
        }
        touchStartX.current = null;
    };

    const renderDetails = (details) => {
        if (!details) return null;
        let parsedDetails = details;
        if (typeof details === 'string') {
            try {
                parsedDetails = JSON.parse(details);
            } catch (e) {
                return (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Details</p>
                        <p className="font-semibold text-slate-800 text-sm">{details}</p>
                    </div>
                );
            }
        }
        if (Array.isArray(parsedDetails)) {
            return parsedDetails.map((item, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Detail {idx + 1}</p>
                    <p className="font-semibold text-slate-800 truncate">{item}</p>
                </div>
            ));
        }
        const entries = Object.entries(parsedDetails);
        if (entries.length === 0) return null;
        return entries.map(([key, val]) => (
            <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="font-semibold text-slate-800 truncate">{val}</p>
            </div>
        ));
    };

    // 🔥 NEW: Pagination calculations
    const itemsPerPage = isMobile ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;
    const totalPages = Math.ceil(filteredAds.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAds = filteredAds.slice(startIndex, endIndex);

    return (
        <div className="w-full min-h-screen bg-slate-50">
            <div className={`bg-gradient-to-r ${PROFESSIONAL_GRADIENT} text-white`}>
                <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black mb-2">
                                {activeCategory === 'All' ? 'Discover Amazing Deals' : CATEGORIES.find(c => c.code === activeCategory)?.name}
                            </h1>
                            <p className="text-white/80 text-sm md:text-base">
                                {filteredAds.length} {filteredAds.length === 1 ? 'item' : 'items'} found
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl w-full">
                            <div className="relative flex-1">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="iPhone, Car, Laptop..." 
                                    className="w-full pl-12 pr-10 py-4 rounded-2xl bg-white/95 backdrop-blur text-black placeholder:text-slate-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30"
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <FaTimes size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="sm:w-64">
                                <div className="bg-white rounded-xl shadow-sm">
                                    <LocationDropdown 
                                        selected={selectedLocation} 
                                        onChange={setSelectedLocation} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {(selectedLocation || debouncedSearch) && (
                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                            {debouncedSearch && (
                                <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                                    <FaSearch size={10} />
                                    "{debouncedSearch}"
                                </span>
                            )}
                            {selectedLocation && (
                                <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                                    <FaMapMarkerAlt size={10} />
                                    {selectedLocation}
                                </span>
                            )}
                            <button 
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedLocation('');
                                    setActiveCategory('All');
                                    setSearchParams({}); 
                                }}
                                className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-white/30 transition-colors"
                            >
                                <FaTimes size={10} /> Clear All
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
                        {CATEGORIES.map((cat) => (
                            <button 
                                key={cat.code} 
                                onClick={() => {
                                    setActiveCategory(cat.code);
                                    const params = new URLSearchParams(location.search);
                                    if (cat.code !== 'All') {
                                        params.set('category', cat.code);
                                    } else {
                                        params.delete('category');
                                    }
                                    setSearchParams(params);
                                }}
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all
                                    ${activeCategory === cat.code 
                                        ? `${ACTIVE_CATEGORY_BG} text-white shadow-lg` 
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

            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="appearance-none bg-slate-100 text-slate-700 font-semibold text-sm px-4 py-2.5 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                            >
                                <option value="newest">Newest First</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="price-high">Price: High to Low</option>
                            </select>
                            <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs" />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                            {debouncedSearch ? `Searching: "${debouncedSearch}"` : 'All results'}
                        </span>
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
                        <p className="text-slate-500">
                            {debouncedSearch || selectedLocation || activeCategory !== 'All'
                                ? `No results${debouncedSearch ? ` for "${debouncedSearch}"` : ''}${activeCategory !== 'All' ? ` in ${CATEGORIES.find(c => c.code === activeCategory)?.name}` : ''}${selectedLocation ? ` in ${selectedLocation}` : ''}. Try different filters.` 
                                : "Try adjusting your search or category"}
                        </p>
                        {(debouncedSearch || selectedLocation || activeCategory !== 'All') && (
                            <button 
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedLocation('');
                                    setActiveCategory('All');
                                    setSearchParams({});
                                }}
                                className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
                            {paginatedAds.map((ad) => (
                                <AdCard 
                                    key={ad._id} 
                                    ad={ad} 
                                    sellerStats={sellerStats}
                                    onClick={() => handleAdClick(ad)}
                                    isListView={viewMode === 'list'}
                                />
                            ))}
                        </div>

                        {/* 🔥 NEW: Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-8 mb-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                        currentPage === 1 
                                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                                            : 'bg-white text-slate-700 shadow-md hover:bg-emerald-50 hover:text-emerald-600 active:scale-95'
                                    }`}
                                >
                                    <FaChevronLeft />
                                </button>

                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, idx) => {
                                        const pageNum = idx + 1;
                                        const show = pageNum === 1 || pageNum === totalPages || 
                                                   Math.abs(pageNum - currentPage) <= 1;
                                        const showEllipsis = (pageNum === 2 && currentPage > 3) || 
                                                           (pageNum === totalPages - 1 && currentPage < totalPages - 2);
                                        
                                        if (showEllipsis) {
                                            return <span key={pageNum} className="text-slate-400 px-2">...</span>;
                                        }
                                        if (!show) return null;
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                                                    currentPage === pageNum
                                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                                        : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                        currentPage === totalPages 
                                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                                            : 'bg-white text-slate-700 shadow-md hover:bg-emerald-50 hover:text-emerald-600 active:scale-95'
                                    }`}
                                >
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}

                        {/* Page info */}
                        {filteredAds.length > 0 && (
                            <p className="text-center text-xs text-slate-400 font-medium mb-8">
                                Showing {startIndex + 1}-{Math.min(endIndex, filteredAds.length)} of {filteredAds.length} items
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Ad Detail Modal */}
            {selectedAd && (
                <div 
                    className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex justify-center items-center z-[100] p-0 md:p-6"
                    onClick={(e) => e.target === e.currentTarget && closeModal()}
                >
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
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
                                <div 
                                    className="relative h-64 sm:h-80 md:h-[500px] lg:h-[600px] bg-slate-100 lg:sticky lg:top-0"
                                    onTouchStart={handleTouchStart}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    <img 
                                        src={selectedAd.images?.[currentImageIndex] || "https://via.placeholder.com/600"} 
                                        className="w-full h-full object-contain bg-slate-50" 
                                        alt={selectedAd.title}
                                    />
                                    {selectedAd.images?.length > 1 && (
                                        <>
                                            <button 
                                                onClick={() => setCurrentImageIndex(p => (p - 1 + selectedAd.images.length) % selectedAd.images.length)} 
                                                className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur rounded-full items-center justify-center text-slate-700 shadow-lg hover:bg-emerald-500 hover:text-white transition-colors"
                                            >
                                                <FaArrowLeft />
                                            </button>
                                            <button 
                                                onClick={() => setCurrentImageIndex(p => (p + 1) % selectedAd.images.length)} 
                                                className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur rounded-full items-center justify-center text-slate-700 shadow-lg hover:bg-emerald-500 hover:text-white transition-colors"
                                            >
                                                <FaArrowRight />
                                            </button>
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
                                                {currentImageIndex + 1} / {selectedAd.images.length}
                                            </div>
                                            <button 
                                                onClick={() => setCurrentImageIndex(p => (p - 1 + selectedAd.images.length) % selectedAd.images.length)} 
                                                className="sm:hidden absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-slate-700 shadow-lg active:bg-emerald-500 active:text-white transition-colors"
                                            >
                                                <FaArrowLeft size={16} />
                                            </button>
                                            <button 
                                                onClick={() => setCurrentImageIndex(p => (p + 1) % selectedAd.images.length)} 
                                                className="sm:hidden absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-slate-700 shadow-lg active:bg-emerald-500 active:text-white transition-colors"
                                            >
                                                <FaArrowRight size={16} />
                                            </button>
                                            <div className="hidden sm:flex absolute bottom-4 left-1/2 -translate-x-1/2 gap-2">
                                                {selectedAd.images.map((img, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setCurrentImageIndex(idx)}
                                                        className={`rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-white opacity-70'} w-12 h-12`}
                                                    >
                                                        <img src={img} className="w-full h-full object-cover" alt="" />
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="p-4 sm:p-6 lg:p-8 bg-white">
                                    <div className="mb-4 sm:mb-6">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                                {selectedAd.condition || 'Used'}
                                            </span>
                                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                                                {selectedAd.category}
                                            </span>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mb-2 sm:mb-3 leading-tight">
                                            {selectedAd.title}
                                        </h2>
                                        <p className="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-600">
                                            Rs {selectedAd.price?.toLocaleString()}
                                        </p>
                                    </div>

                                    <div 
                                        onClick={() => setProfileModalUid(selectedAd.posted_by_uid)}
                                        className="bg-slate-50 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 cursor-pointer hover:bg-emerald-50 transition-colors border border-slate-200"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                                                    {sellerInfo?.name?.charAt(0) || selectedAd.sellerName?.charAt(0) || "S"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-sm sm:text-base truncate">
                                                        {sellerInfo?.name || selectedAd.sellerName || "Verified Seller"}
                                                    </p>
                                                    <div className="flex items-center gap-1 text-xs sm:text-sm flex-wrap">
                                                        <FaStar className="text-yellow-400" />
                                                        <span className="font-bold text-slate-700">{sellerTrust.avg}</span>
                                                        <span className="text-slate-400">({sellerTrust.total} reviews)</span>
                                                        <span className="mx-1 text-slate-300 hidden sm:inline">|</span>
                                                        <FaCheckCircle className="text-emerald-500" />
                                                        <span className="text-xs text-emerald-600 font-medium">Verified</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <FaArrowRight className="text-slate-400 flex-shrink-0" />
                                        </div>
                                    </div>

                                    {selectedAd.details && (
                                        <div className="mb-4 sm:mb-6">
                                            <h4 className="font-bold text-slate-800 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                                                <FaTag className="text-emerald-500" /> Details
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                                {renderDetails(selectedAd.details)}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-6 sm:mb-8">
                                        <h4 className="font-bold text-slate-800 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                                            <FaTag className="text-emerald-500" /> Description
                                        </h4>
                                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 sm:p-4 rounded-xl text-sm sm:text-base">
                                            {selectedAd.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 text-slate-500 mb-6 sm:mb-8 p-3 sm:p-4 bg-slate-50 rounded-xl">
                                        <FaMapMarkerAlt className="text-emerald-500 text-xl flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-400 uppercase tracking-wider">Location</p>
                                            <p className="font-semibold text-slate-800 text-sm sm:text-base truncate">{selectedAd.location}</p>
                                        </div>
                                    </div>

                                    <div className="sticky bottom-0 bg-white pt-3 sm:pt-4 border-t border-slate-100 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6"
                                        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
                                    >
                                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                            <button onClick={startChat} 
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 sm:py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm sm:text-base">
                                                <FaCommentDots /> Chat
                                            </button>
                                            <button onClick={() => handleCallSeller(sellerPhone)}
                                                disabled={!sellerPhone}
                                                className={`py-3 sm:py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${sellerPhone ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                                                <FaPhoneAlt /> {sellerPhone ? sellerPhone : 'No Phone'}
                                            </button>
                                        </div>
                                        {sellerPhone && (
                                            <a href={`https://wa.me/${sellerPhone.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in your ${selectedAd.title} on Rezon`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 sm:py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all mt-2 text-sm sm:text-base"
                                            >
                                                <FaWhatsapp size={18} /> WhatsApp Seller
                                            </a>
                                        )}
                                        <button onClick={handleReportClick} 
                                            className="w-full text-rose-500 text-sm font-medium flex items-center justify-center gap-2 py-2.5 sm:py-3 hover:bg-rose-50 rounded-xl transition-colors mt-2">
                                            <FaFlag /> Report this listing
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && selectedAd && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setShowReportModal(false)}>
                    <div className="bg-white w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-2 mb-4 text-rose-600">
                            <FaFlag />
                            <h3 className="font-bold text-lg">Report Ad</h3>
                        </div>
                        <p className="text-slate-500 text-sm mb-4">
                            Reporting: <span className="font-semibold text-slate-700">{selectedAd.title}</span>
                        </p>

                        <div className="mb-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                Reason *
                            </label>
                            <select
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 bg-white"
                            >
                                <option value="">Select a reason...</option>
                                {REPORT_REASONS.map((reason) => (
                                    <option key={reason} value={reason}>{reason}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                Description *
                            </label>
                            <textarea
                                value={reportDescription}
                                onChange={(e) => setReportDescription(e.target.value)}
                                placeholder="Please describe the issue in detail..."
                                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
                                rows={4}
                                maxLength={1000}
                            />
                            <p className="text-xs text-slate-400 text-right mt-1">
                                {reportDescription.length}/1000
                            </p>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button 
                                onClick={() => setShowReportModal(false)}
                                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitReport}
                                disabled={reportSubmitting || !reportReason || !reportDescription.trim()}
                                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {reportSubmitting ? <FaSpinner className="animate-spin" /> : <FaFlag />}
                                {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Modal */}
            {profileModalUid && (
                <div className="fixed inset-0 bg-slate-900/90 z-[120] flex items-center justify-center p-4 backdrop-blur-md"
                    onClick={(e) => e.target === e.currentTarget && setProfileModalUid(null)}>
                    <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
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