import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
    FaFilter, FaRedo, FaArrowLeft, FaArrowRight, FaTimes, 
    FaMapMarkerAlt, FaTag, FaPhoneAlt, FaSpinner, FaEye, FaChevronRight,
    FaStar, FaCheckCircle, FaUserCircle, FaCommentDots, FaWhatsapp,
    FaHeart, FaShareAlt, FaShieldAlt, FaFlag
} from "react-icons/fa";
import toast from "react-hot-toast";
import Navbar from "./Navbar";


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

// 🔥 FIXED: Proper details renderer (same as AllAds)
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

const CategoryAds = ({ user }) => {
    const { slug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [allAds, setAllAds] = useState([]);
    const [filteredAds, setFilteredAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilters, setActiveFilters] = useState({});
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // 🔥 AllAds-style modal states
    const [selectedAd, setSelectedAd] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [sellerTrust, setSellerTrust] = useState({ avg: 0, total: 0 });
    const [sellerPhone, setSellerPhone] = useState(null);
    const [sellerInfo, setSellerInfo] = useState(null);
    const [profileModalUid, setProfileModalUid] = useState(null);
    const [sellerReviews, setSellerReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);

    const touchStartX = useRef(null);

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

    // 🔥 FIXED: Fetch Seller Details (same as AllAds)
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

    const handleFilterChange = (e) => {
        setActiveFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // 🔥 CHAT START (same as AllAds)
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

    // 🔥 CALL SELLER
    const handleCallSeller = (phoneNumber) => {
        if (!phoneNumber) {
            toast.error("Seller phone number not available");
            return;
        }
        const cleanNumber = phoneNumber.replace(/[\s-]/g, '');
        window.location.href = `tel:${cleanNumber}`;
        toast.success(`Dialing ${phoneNumber}...`, { icon: '📞' });
    };

    // 🔥 REPORT
    const handleReportClick = useCallback(() => {
        if (!user) {
            toast.error("Please login first!");
            return;
        }
        setShowReportModal(true);
    }, [user]);

    const submitReport = useCallback(async () => {
        if (!reportReason.trim()) {
            toast.error("Please enter a reason for reporting");
            return;
        }

        setReportSubmitting(true);
        try {
            const token = await user.getIdToken();
            await axios.post(`${API_BASE_URL}/reports`, {
                adId: selectedAd._id,
                sellerId: selectedAd.posted_by_uid,
                reason: reportReason,
                type: 'ad_report'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Report submitted successfully");
            setShowReportModal(false);
            setReportReason('');
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit report");
        } finally {
            setReportSubmitting(false);
        }
    }, [reportReason, selectedAd, user]);

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

    // Touch handlers
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
                                            <select name={f.name} onChange={handleFilterChange} value={activeFilters[f.name] || ""} className="w-full p-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm text-slate-800">
                                                <option value="">All</option>
                                                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <input type={f.type} name={f.name} onChange={handleFilterChange} value={activeFilters[f.name] || ""} placeholder={f.placeholder} className="w-full p-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm text-slate-800 placeholder:text-slate-400" />
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
                                    <div key={ad._id} onClick={() => handleAdClick(ad)} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 hover:shadow-2xl hover:shadow-emerald-100 transition-all cursor-pointer group">
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

            {/* 🔥 NEW: AllAds-Style Detail Modal */}
            {selectedAd && (
                <div 
                    className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex justify-center items-center z-[100] p-0 md:p-6 animate-in fade-in duration-200"
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
                                <div 
                                    className="relative h-64 sm:h-80 md:h-[500px] lg:h-[600px] bg-slate-100 lg:sticky lg:top-0"
                                    onTouchStart={handleTouchStart}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    <img 
                                        src={selectedAd.images?.[currentImageIndex] || DEFAULT_IMAGE} 
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
                                        </>
                                    )}

                                    {selectedAd.images?.length > 1 && (
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
                                            {currentImageIndex + 1} / {selectedAd.images.length}
                                        </div>
                                    )}

                                    {selectedAd.images?.length > 1 && (
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
                                    )}
                                </div>

                                {/* Details Panel */}
                                <div className="p-4 sm:p-6 lg:p-8 bg-white">
                                    {/* Price & Title */}
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

                                    {/* Seller Card */}
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
                                            <FaChevronRight className="text-slate-400 flex-shrink-0" />
                                        </div>
                                    </div>

                                    {/* 🔥 FIXED: Details using renderDetails function */}
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

                                    {/* Description */}
                                    <div className="mb-6 sm:mb-8">
                                        <h4 className="font-bold text-slate-800 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                                            <FaTag className="text-emerald-500" /> Description
                                        </h4>
                                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 sm:p-4 rounded-xl text-sm sm:text-base">
                                            {selectedAd.description}
                                        </p>
                                    </div>

                                    {/* Location */}
                                    <div className="flex items-center gap-2 text-slate-500 mb-6 sm:mb-8 p-3 sm:p-4 bg-slate-50 rounded-xl">
                                        <FaMapMarkerAlt className="text-emerald-500 text-xl flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-400 uppercase tracking-wider">Location</p>
                                            <p className="font-semibold text-slate-800 text-sm sm:text-base truncate">{selectedAd.location}</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={(e) => e.target === e.currentTarget && setShowReportModal(false)}>
                    <div className="bg-white w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 mb-4 text-rose-600">
                            <FaFlag />
                            <h3 className="font-bold text-lg">Report Ad</h3>
                        </div>
                        <p className="text-slate-500 text-sm mb-4">
                            Reporting: <span className="font-semibold text-slate-700">{selectedAd.title}</span>
                        </p>
                        <textarea
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="Why are you reporting this ad? (e.g. Fake listing, Wrong category, etc.)"
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
                            rows={4}
                        />
                        <div className="flex gap-3 mt-4">
                            <button 
                                onClick={() => setShowReportModal(false)}
                                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitReport}
                                disabled={reportSubmitting}
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

export default CategoryAds;